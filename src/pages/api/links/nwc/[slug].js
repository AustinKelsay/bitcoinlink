import { createAllLinksForNwc, deleteAllLinksForNwc } from "../../../../models/linkModels";

export default async function handler(req, res) {
    const { slug } = req.query;

    if (req.method === 'POST') {
        try {
            const links = await createAllLinksForNwc(slug, req.body);
            res.status(201).json(links);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const links = await deleteAllLinksForNwc(slug);
            res.status(200).json(links);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        // Handle any other HTTP method
        res.setHeader('Allow', ['POST', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}