import { webln } from "@getalby/sdk";
import { getNwcById, deleteNwc } from "@/models/nwcModels";
import { getBolt11Amount } from "@/utils/bolt11";
import { getLinkByNwcIdAndIndex, deleteLink } from "@/models/linkModels";
import crypto from "crypto";
import "websocket-polyfill";
import fetch from "cross-fetch";

globalThis.fetch = fetch;

const decryptNWCUrl = (encryptedUrl, secret) => {
    const decipher = crypto.createDecipher("aes-256-cbc", secret);
    let decryptedUrl = decipher.update(encryptedUrl, "hex", "utf8");
    decryptedUrl += decipher.final("utf8");
    return decryptedUrl;
};

const handleNwcReplacementPostRequest = async (req, res) => {
    const { invoice } = req.body;
    const { slug, linkIndex } = req.query;
    const token = req.headers.authorization;
    console.log('slug', slug);
    console.log('linkIndex', linkIndex);
    console.log('invoice', invoice);

    try {
        const nwc = await getNwcById(slug);

        if (!nwc) {
            return res.status(404).json({ error: 'NWC not found' });
        }

        const amountPerLink = nwc.maxAmount / nwc.numLinks;
        const bolt11Amount = getBolt11Amount(invoice);

        if (bolt11Amount !== amountPerLink) {
            return res.status(400).json({ error: 'Invalid invoice amount' });
        }

        const decryptedUrl = decryptNWCUrl(nwc.url, token);

        if (!decryptedUrl) {
            return res.status(500).json({ error: 'Error decrypting URL' });
        }

        const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);

        if (!link || !link.id) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const isClaimed = link.isClaimed;

            if (isClaimed) {
                return res.status(400).json({ error: 'Link already claimed' });
            }

            const nwcProvider = new webln.NostrWebLNProvider({
                nostrWalletConnectUrl: decryptedUrl
            });
    
            await nwcProvider.enable();
    
            const response = await nwcProvider.sendPayment(invoice);

            nwcProvider.close(); // close the websocket connection

            if (response.preimage && response.preimage.length > 0) {
                const deletedLink = await deleteLink(link.id);

                if (deletedLink && Object.keys(deletedLink).length > 0) {
                    return res.status(200).json({ message: 'Payment successful', response });
                } else {
                    return res.status(500).json({ error: 'Error deleting link' });
                }
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
}

const handlePostRequest = async (req, res) => {
    const { invoice } = req.body;
    const { slug, linkIndex } = req.query;
    const token = req.headers.authorization;

    try {
        const nwc = await getNwcById(slug);

        console.log('nwc on endpoint', nwc);

        if (!nwc) {
            return res.status(404).json({ error: 'NWC not found' });
        }

        const amountPerLink = nwc.maxAmount / nwc.numLinks;
        const bolt11Amount = getBolt11Amount(invoice);

        if (bolt11Amount !== amountPerLink) {
            return res.status(400).json({ error: 'Invalid invoice amount' });
        }

        const decryptedUrl = decryptNWCUrl(nwc.url, token);

        if (!decryptedUrl) {
            return res.status(500).json({ error: 'Error decrypting URL' });
        }

        const nwcProvider = new webln.NostrWebLNProvider({
            nostrWalletConnectUrl: decryptedUrl
        });

        await nwcProvider.enable();

        const response = await nwcProvider.sendPayment(invoice);

        console.log('payment response on api', response);

        nwcProvider.close(); // close the websocket connection
        if (!response) {
            return res.status(500).json({ error: 'Error paying invoice' });
        } else if (response.preimage && response.preimage.length > 0) {
            const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);
            const deletedLink = await deleteLink(link.id);

            if (deletedLink && Object.keys(deletedLink).length > 0) {
                const deleted = await deleteNwc(slug);

                if (deleted && Object.keys(deleted).length > 0) {
                    return res.status(200).json({ message: 'Payment successful', response });
                } else {
                    return res.status(500).json({ error: 'Error deleting NWC' });
                }
            } else {
                return res.status(500).json({ error: 'Error deleting link' });
            }
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const handleGetRequest = async (req, res) => {
    const { slug, linkIndex } = req.query;

    try {
        const nwc = await getNwcById(slug);

        if (!nwc || !nwc.id || !nwc.url || !nwc.maxAmount || !nwc.numLinks) {
            return res.status(404).json({ error: 'NWC not found' });
        }

        const amountPerLink = nwc.maxAmount / nwc.numLinks;
        const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);

        if (!link || !link.id) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const isClaimed = link.isClaimed;

        return res.status(200).json({ amount: amountPerLink, isClaimed });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export default async function handler(req, res) {
        switch (req.method) {
            case 'POST':
                if (req.query.slug === "clwf9yz6n00001jgso4nmruxe") {
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
