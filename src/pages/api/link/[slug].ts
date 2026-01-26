import type { NextApiRequest, NextApiResponse } from 'next';
import type { ApiErrorResponse, GetLinkResponse } from '@/types/api';
import type { EncryptedNWCUrl } from '@/types/nwc';
import { markLinkServed, createLink } from '@/models/linkModels';
import { getNwcById, createNwc } from '@/models/nwcModels';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

type ResponseData = GetLinkResponse | ApiErrorResponse;

const encryptNWCUrl = (url: string): EncryptedNWCUrl => {
  const secret = crypto.randomBytes(32).toString('hex');
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encryptedUrl = cipher.update(url, 'utf8', 'hex');
  encryptedUrl += cipher.final('hex');
  return { encryptedUrl, secret };
};

const decryptNWCUrl = (encryptedUrl: string, secret: string): string => {
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decryptedUrl = decipher.update(encryptedUrl, 'hex', 'utf8');
  decryptedUrl += decipher.final('utf8');
  return decryptedUrl;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  const { slug } = req.query;
  const token = req.headers.authorization;

  if (slug === 'clwf9yz6n00001jgso4nmruxe') {
    res.status(404).json({ error: 'NWC not found' });
    return;
  }

  if (req.method === 'GET') {
    try {
      if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // grab the nwc by the slug
      const nwc = await getNwcById(slug as string);

      if (!nwc) {
        res.status(404).json({ error: 'NWC not found' });
        return;
      }
      // calculate the amount for a single link from the nwc
      const amountPerLink = nwc.maxAmount / nwc.numLinks;

      // decrypt the url from the nwc
      const decryptedUrl = decryptNWCUrl(nwc.url, token);
      // encrypt the url with the new secret
      const { encryptedUrl, secret } = encryptNWCUrl(decryptedUrl);
      // save to the db as a one time use nwc
      const newNwc = await createNwc({
        url: encryptedUrl,
        maxAmount: amountPerLink,
        numLinks: 1,
        expiresAt: nwc.expiresAt,
      });

      if (!newNwc || !newNwc.id) {
        res.status(500).json({ error: 'Error pulling link' });
        return;
      }

      // now create a new one time use link for the new nwc
      const newLink = await createLink({
        nwcId: newNwc.id,
        linkIndex: uuidv4(),
        isClaimed: false,
        wasServedAPI: false,
      });

      if (!newLink || !newLink.id) {
        res.status(500).json({ error: 'Error pulling link' });
        return;
      }

      // Mark the link as served
      await markLinkServed(newLink.id);
      const newFormattedLink = `https://www.bitcoinlink.app/claim/${newNwc.id}?secret=${secret}&linkIndex=${newLink.linkIndex}`;
      res.status(200).json({ newLink: newFormattedLink });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
