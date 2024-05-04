import { getLinkByNwcIdAndIndex, deleteLink, claimLink } from "../../../models/linkModels";

export default async function handler(req, res) {
    const { nwcId, linkIndex } = req.query;

    if (req.method === 'GET') {
        try {
            const link = await getLinkByNwcIdAndIndex(nwcId, parseInt(linkIndex));
            if (link) {
                res.status(200).json(link);
            } else {
                res.status(404).json({ error: 'Link not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const link = await deleteLink(nwcId);  // Assumes nwcId uniquely identifies a link
            res.status(204).end();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'PUT') {
        try {
            const link = await claimLink(nwcId, parseInt(linkIndex));
            res.status(204).end();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        // Handle any other HTTP method
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
