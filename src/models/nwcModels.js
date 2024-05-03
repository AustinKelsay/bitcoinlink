import prisma from "./prisma";

export const getAllNwcs = async () => {
    return await prisma.NWC.findMany();
};

export const getNwcById = async (id) => {
    return await prisma.NWC.findUnique({
        where: { id },
    });
};

export const createNwc = async (data) => {
    return await prisma.NWC.create({
        data,
    });
};

export const deleteNwc = async (id) => {
    return await prisma.NWC.delete({
        where: { id },
    });
}