import type { NWC as PrismaNWC } from '@prisma/client';

// Re-export Prisma type for convenience
export type { NWC as PrismaNWC } from '@prisma/client';

// Input type for creating an NWC (without id which is auto-generated)
export interface CreateNWCInput {
  url: string;
  expiresAt: Date;
  maxAmount: number;
  numLinks: number;
}

// NWC with computed fields used in the application
export interface NWCWithAmount extends PrismaNWC {
  amountPerLink: number;
}

// Encrypted NWC URL result
export interface EncryptedNWCUrl {
  encryptedUrl: string;
  secret: string;
}
