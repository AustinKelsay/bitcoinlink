import type { NextApiRequest, NextApiResponse } from 'next';

// Base API error response
export interface ApiErrorResponse {
  error: string;
}

// Base API success message response
export interface ApiMessageResponse {
  message: string;
}

// ==========================================
// NWC API Types (/api/nwc)
// ==========================================

export interface CreateNWCRequest {
  url: string;
  expiresAt: string; // ISO date string from client
  maxAmount: number;
  numLinks: number;
}

// ==========================================
// Link API Types (/api/links)
// ==========================================

export interface CreateLinkRequest {
  nwcId: string;
  linkIndex: string;
  isClaimed?: boolean;
  wasServedAPI?: boolean;
}

// ==========================================
// Link Slug API Types (/api/link/[slug])
// ==========================================

export interface GetLinkResponse {
  newLink: string; // Formatted claim link URL
}

// ==========================================
// Claim API Types (/api/claim/[slug])
// ==========================================

export interface ClaimGetResponse {
  amount: number;
  isClaimed: boolean;
}

export interface ClaimPostRequest {
  invoice: string;
}

export interface ClaimPostResponse extends ApiMessageResponse {
  response: {
    preimage: string;
  };
}

// ==========================================
// Query Parameters
// ==========================================

export interface SlugQuery {
  slug: string;
}

export interface ClaimSlugQuery extends SlugQuery {
  linkIndex?: string;
  secret?: string;
}

// ==========================================
// Extended Request Types
// ==========================================

export interface NextApiRequestWithSlug extends NextApiRequest {
  query: SlugQuery & { [key: string]: string | string[] | undefined };
}

export interface NextApiRequestWithClaimQuery extends NextApiRequest {
  query: ClaimSlugQuery & { [key: string]: string | string[] | undefined };
}

// Generic API handler type
export type ApiHandler<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<T | ApiErrorResponse>
) => Promise<void> | void;
