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

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { invoice } = req.body;
        const { slug, linkIndex } = req.query;
        const token = req.headers.authorization;
        try {
            // grab the nwc by the slug
            const nwc = await getNwcById(slug);

            if (!nwc) {
                return res.status(404).json({ error: 'NWC not found' });
            }

            // calculate the amount for a single link from the nwc
            const amountPerLink = nwc.maxAmount / nwc.numLinks;
            console.log('amountPerLink', amountPerLink);

            // validate the invoice amount 
            const bolt11Amount = getBolt11Amount(invoice);
            console.log('bolt11Amount', bolt11Amount);

            if (bolt11Amount !== amountPerLink) {
                return res.status(400).json({ error: 'Invalid invoice amount' });
            }

            // decrypt the url from the nwc
            const decryptedUrl = decryptNWCUrl(nwc.url, token);

            if (!decryptedUrl) {
                return res.status(500).json({ error: 'Error decrypting URL' });
            }

            // pay the invoice with webln using the decrypted nwc url
            const nwcProvider = new webln.NostrWebLNProvider({
                nostrWalletConnectUrl: decryptedUrl
            });

            await nwcProvider.enable();

            const response = await nwcProvider.sendPayment(invoice);

            if (!response) {
                return res.status(500).json({ error: 'Error paying invoice' });
            } else if (response.preimage && response.preimage.length > 0) {
                // get the link
                const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);
                // delete the link
                const deletedLink = await deleteLink(link.id);

                if (deletedLink && Object.keys(deletedLink).length > 0) {
                    // delete the nwc
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
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'GET') {
        const { slug, linkIndex } = req.query;

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

        res.status(200).json({ amount: amountPerLink, isClaimed });
    }
    else {
        // Handle any other HTTP method
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}