import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  ApiErrorResponse,
  ClaimGetResponse,
  ClaimPostResponse,
} from '@/types/api';
import { webln } from '@getalby/sdk';
import { getNwcById, deleteNwc } from '@/models/nwcModels';
import { getBolt11Amount } from '@/utils/bolt11';
import { getLinkByNwcIdAndIndex, deleteLink } from '@/models/linkModels';
import { decryptNWCUrl } from '@/utils/crypto';
import 'websocket-polyfill';
import fetch from 'cross-fetch';

globalThis.fetch = fetch;

type ResponseData = ClaimGetResponse | ClaimPostResponse | ApiErrorResponse;

const handleNwcReplacementPostRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> => {
  const { invoice } = req.body as { invoice: string };
  const { slug, linkIndex } = req.query as { slug: string; linkIndex: string };
  const token = req.headers.authorization;
  console.log('slug', slug);
  console.log('linkIndex', linkIndex);
  console.log('invoice', invoice);

  try {
    const nwc = await getNwcById(slug);

    if (!nwc) {
      res.status(404).json({ error: 'NWC not found' });
      return;
    }

    const amountPerLink = nwc.maxAmount / nwc.numLinks;
    const bolt11Amount = getBolt11Amount(invoice);

    if (bolt11Amount !== amountPerLink) {
      res.status(400).json({ error: 'Invalid invoice amount' });
      return;
    }

    const decryptedUrl = decryptNWCUrl(nwc.url, token as string);

    if (!decryptedUrl) {
      res.status(500).json({ error: 'Error decrypting URL' });
      return;
    }

    const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);

    if (!link || !link.id) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    const isClaimed = link.isClaimed;

    if (isClaimed) {
      res.status(400).json({ error: 'Link already claimed' });
      return;
    }

    const nwcProvider = new webln.NostrWebLNProvider({
      nostrWalletConnectUrl: decryptedUrl,
    });

    await nwcProvider.enable();

    const response = await nwcProvider.sendPayment(invoice);

    nwcProvider.close(); // close the websocket connection

    if (response.preimage && response.preimage.length > 0) {
      const deletedLink = await deleteLink(link.id);

      if (deletedLink && Object.keys(deletedLink).length > 0) {
        res
          .status(200)
          .json({ message: 'Payment successful', response: { preimage: response.preimage } });
        return;
      } else {
        res.status(500).json({ error: 'Error deleting link' });
        return;
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Insufficient budget remaining to make payment') {
      res.status(400).json({ error: errorMessage });
      return;
    }
    res.status(500).json({ error: errorMessage });
  }
};

const handlePostRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> => {
  const { invoice } = req.body as { invoice: string };
  const { slug, linkIndex } = req.query as { slug: string; linkIndex: string };
  const token = req.headers.authorization;

  try {
    const nwc = await getNwcById(slug);

    if (!nwc) {
      res.status(404).json({ error: 'NWC not found' });
      return;
    }

    const amountPerLink = nwc.maxAmount / nwc.numLinks;
    const bolt11Amount = getBolt11Amount(invoice);

    if (bolt11Amount !== amountPerLink) {
      res.status(400).json({ error: 'Invalid invoice amount' });
      return;
    }

    const decryptedUrl = decryptNWCUrl(nwc.url, token as string);

    if (!decryptedUrl) {
      res.status(500).json({ error: 'Error decrypting URL' });
      return;
    }

    const nwcProvider = new webln.NostrWebLNProvider({
      nostrWalletConnectUrl: decryptedUrl,
    });

    await nwcProvider.enable();

    const response = await nwcProvider.sendPayment(invoice);

    nwcProvider.close(); // close the websocket connection
    if (!response) {
      res.status(500).json({ error: 'Error paying invoice' });
      return;
    } else if (response.preimage && response.preimage.length > 0) {
      const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);
      if (!link) {
        res.status(404).json({ error: 'Link not found' });
        return;
      }
      const deletedLink = await deleteLink(link.id);

      if (deletedLink && Object.keys(deletedLink).length > 0) {
        const deleted = await deleteNwc(slug);

        if (deleted && Object.keys(deleted).length > 0) {
          res
            .status(200)
            .json({ message: 'Payment successful', response: { preimage: response.preimage } });
          return;
        } else {
          res.status(500).json({ error: 'Error deleting NWC' });
          return;
        }
      } else {
        res.status(500).json({ error: 'Error deleting link' });
        return;
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Insufficient budget remaining to make payment') {
      res.status(400).json({ error: errorMessage });
      return;
    }
    res.status(500).json({ error: errorMessage });
  }
};

const handleGetRequest = async (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> => {
  const { slug, linkIndex } = req.query as { slug: string; linkIndex: string };

  try {
    const nwc = await getNwcById(slug);

    if (!nwc || !nwc.id || !nwc.url || !nwc.maxAmount || !nwc.numLinks) {
      res.status(404).json({ error: 'NWC not found' });
      return;
    }

    const amountPerLink = nwc.maxAmount / nwc.numLinks;
    const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);

    if (!link || !link.id) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    const isClaimed = link.isClaimed;

    res.status(200).json({ amount: amountPerLink, isClaimed });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  switch (req.method) {
    case 'POST':
      if (process.env.NWC_REPLACEMENT_ID && req.query.slug === process.env.NWC_REPLACEMENT_ID) {
        await handleNwcReplacementPostRequest(req, res);
      } else {
        await handlePostRequest(req, res);
      }
      break;
    case 'GET':
      await handleGetRequest(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
