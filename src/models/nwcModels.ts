import type { NWC } from '@prisma/client';
import type { CreateNWCInput } from '@/types/nwc';
import prisma from './prisma';

export const getAllNwcs = async (): Promise<NWC[]> => {
  return await prisma.nWC.findMany();
};

export const getNwcById = async (id: string): Promise<NWC | null> => {
  return await prisma.nWC.findUnique({
    where: { id },
  });
};

export const createNwc = async (data: CreateNWCInput): Promise<NWC> => {
  return await prisma.nWC.create({
    data,
  });
};

export const deleteNwc = async (id: string): Promise<NWC> => {
  return await prisma.nWC.delete({
    where: { id },
  });
};
