import { createLink } from '../../../models/linkModels';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const link = await createLink(req.body);
            res.status(201).json(link);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}