import { getNewLink, markLinkServed } from "@/models/linkModels";

export default async function handler(req, res) {
    const { slug } = req.query;
    let token = req.headers.authorization;

    if (!token && req.headers['x-vercel-sc-headers']) {
        const scHeaders = JSON.parse(req.headers['x-vercel-sc-headers']);
        token = scHeaders.Authorization;
    }

    if (req.method === 'GET') {
        try {
            if (!token) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const linkMetaData = await getNewLink(slug);

            if (!linkMetaData || linkMetaData.isClaimed || linkMetaData.nwcId !== slug || !linkMetaData?.linkIndex) {
                return res.status(404).json({ error: 'Link not found' });
            }

            const newLink = `https://bitcoinlink.app/claim/${linkMetaData.nwcId}?secret=${token}&linkIndex=${linkMetaData.linkIndex}`;

            // Mark the link as served
            await markLinkServed(linkMetaData.id);

            res.status(200).json(newLink);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        // Handle any other HTTP method
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}