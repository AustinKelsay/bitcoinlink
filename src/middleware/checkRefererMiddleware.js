export function checkReferer(req, res, next) {
    const referer = req.headers.referer;

    // Base URL of your frontend
    const allowedBaseReferer = 'https://www.bitcoinlink.app';

    if (!referer || !referer.startsWith(allowedBaseReferer)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    next();
}
