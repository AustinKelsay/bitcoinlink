import type { NextApiRequest, NextApiResponse } from 'next';
import type { Link } from '@prisma/client';
import type { ApiErrorResponse, CreateLinkRequest } from '@/types/api';
import { createLink } from '@/models/linkModels';

type ResponseData = Link | ApiErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  if (req.method === 'POST') {
    try {
      const body = req.body as CreateLinkRequest;
      const link = await createLink(body);
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
