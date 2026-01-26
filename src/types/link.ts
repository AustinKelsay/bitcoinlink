import type { Link as PrismaLink, NWC } from '@prisma/client';

// Re-export Prisma type for convenience
export type { Link as PrismaLink } from '@prisma/client';

// Input type for creating a Link (without id which is auto-generated)
export interface CreateLinkInput {
  nwcId: string;
  linkIndex: string;
  isClaimed?: boolean;
  wasServedAPI?: boolean;
}

// Link with related NWC data
export interface LinkWithNWC extends PrismaLink {
  nwc: NWC;
}
