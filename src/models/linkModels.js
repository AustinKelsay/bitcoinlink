import prisma from "./prisma";

export const getAllLinks = async () => {
    return await prisma.RewardLink.findMany();
}

export const getLinkById = async (id) => {
    const idAsNumber = parseInt(id);
    return await prisma.RewardLink.findUnique({
        where: { id: idAsNumber },
    });
}

export const getNextLink = async () => {
    return await prisma.RewardLink.findFirst({
        where: { used: false },
    });
}

export const createLink = async (data) => {
    return await prisma.RewardLink.create({
        data,
    });
}

export const deleteLink = async (id) => {
    return await prisma.RewardLink.delete({
        where: { id },
    });
}

export const deleteAllLinksForNwc = async (nwcId) => {
    return await prisma.RewardLink.deleteMany({
        where: { nwcId },
    });
}

export const createAllLinksForNwc = async (nwcId, links) => {
    return await prisma.RewardLink.createMany({
        data: links.map((link) => ({ ...link, nwcId })),
    });
}