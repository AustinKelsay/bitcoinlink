import type { Link } from '@prisma/client';
import type { CreateLinkInput, LinkWithNWC } from '@/types/link';
import prisma from './prisma';

export const getAllLinks = async (): Promise<LinkWithNWC[]> => {
  return await prisma.link.findMany({
    include: { nwc: true },
  });
};

export const getLinkByNwcIdAndIndex = async (
  nwcId: string,
  linkIndex: string
): Promise<Link | null> => {
  return await prisma.link.findFirst({
    where: {
      nwcId,
      linkIndex,
    },
  });
};

export const getNewLink = async (nwcId: string): Promise<Link | null> => {
  return await prisma.link.findFirst({
    where: {
      nwcId,
      isClaimed: false,
      wasServedAPI: false,
    },
  });
};

export const markLinkServed = async (id: string): Promise<Link> => {
  return await prisma.link.update({
    where: { id },
    data: {
      wasServedAPI: true,
    },
  });
};

export const createLink = async (data: CreateLinkInput): Promise<Link> => {
  return await prisma.link.create({
    data,
  });
};

export const claimLink = async (
  nwcId: string,
  linkIndex: string
): Promise<{ count: number }> => {
  return await prisma.link.updateMany({
    where: {
      nwcId,
      linkIndex,
      isClaimed: false, // Ensure we only update unclaimed links
    },
    data: {
      isClaimed: true,
    },
  });
};

export const deleteLink = async (id: string): Promise<Link> => {
  return await prisma.link.delete({
    where: { id },
  });
};
