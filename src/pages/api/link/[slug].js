import { markLinkServed, createLink } from "@/models/linkModels";
import { getNwcById, createNwc } from "@/models/nwcModels";
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const encryptNWCUrl = (url) => {
    const secret = crypto.randomBytes(32).toString('hex');
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encryptedUrl = cipher.update(url, 'utf8', 'hex');
    encryptedUrl += cipher.final('hex');
    return { encryptedUrl, secret };
  };

  const decryptNWCUrl = (encryptedUrl, secret) => {
    const decipher = crypto.createDecipher("aes-256-cbc", secret);
    let decryptedUrl = decipher.update(encryptedUrl, "hex", "utf8");
    decryptedUrl += decipher.final("utf8");
    return decryptedUrl;
};

export default async function handler(req, res) {
    const { slug } = req.query;
    const token = req.headers.authorization;

    if (slug === "clwf9yz6n00001jgso4nmruxe") {
        return res.status(404).json({ error: 'NWC not found' });
    }

    if (req.method === 'GET') {
        try {
            if (!token) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // grab the nwc by the slug
            const nwc = await getNwcById(slug);

            if (!nwc) {
                return res.status(404).json({ error: 'NWC not found' });
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
                return res.status(500).json({ error: 'Error pulling link' });
            }

            // now create a new one time use link for the new nwc
            const newLink = await createLink({
                nwcId: newNwc.id,
                linkIndex: uuidv4(),
                isClaimed: false,
                wasServedAPI: false
            });

            if (!newLink || !newLink.id) {
                return res.status(500).json({ error: 'Error pulling link' });
            }

            // Mark the link as served
            await markLinkServed(newLink.id);
            const newFormattedLink = `https://www.bitcoinlink.app/claim/${newNwc.id}?secret=${secret}&linkIndex=${newLink.linkIndex}`;
            res.status(200).json({newLink: newFormattedLink});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        // Handle any other HTTP method
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}