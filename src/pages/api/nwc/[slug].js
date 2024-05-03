import { getNwcById, deleteNwc } from "@/models/nwcModels";

export default async function handler(req, res) {
    const { slug } = req.query;

    if (req.method === 'GET') {
        try {
            const nwc = await getNwcById(slug);
            res.status(200).json(nwc);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'DELETE') {
        try {
            const nwc = await deleteNwc(slug);
            res.status(200).json(nwc);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        // Handle any other HTTP method
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}