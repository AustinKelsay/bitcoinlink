import type { NextApiRequest, NextApiResponse } from 'next';
import type { NWC } from '@prisma/client';
import type { ApiErrorResponse, CreateNWCRequest } from '@/types/api';
import { createNwc } from '@/models/nwcModels';

type ResponseData = NWC | ApiErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  if (req.method === 'POST') {
    try {
      const body = req.body as CreateNWCRequest;
      const nwc = await createNwc({
        url: body.url,
        expiresAt: new Date(body.expiresAt),
        maxAmount: body.maxAmount,
        numLinks: body.numLinks,
      });
      res.status(201).json(nwc);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
