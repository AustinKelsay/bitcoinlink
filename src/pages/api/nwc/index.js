import { createNwc, getAllNwcs } from "@/models/nwcModels";

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const nwc = await createNwc(req.body);
            res.status(201).json(nwc);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'GET') {
        try {
            const nwcs = await getAllNwcs();
            res.status(200).json(nwcs);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        // Handle any other HTTP method
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}