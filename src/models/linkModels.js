import prisma from "./prisma";

export const getAllLinks = async () => {
    return await prisma.Link.findMany({
        include: { nwc: true } // Optionally include NWC details
    });
};

export const getLinkByNwcIdAndIndex = async (nwcId, linkIndex) => {
    return await prisma.Link.findFirst({
        where: {
            nwcId,
            linkIndex
        }
    });
};

export const createLink = async (data) => {
    return await prisma.Link.create({
        data,
    });
};

export const claimLink = async (nwcId, linkIndex) => {
    return await prisma.Link.updateMany({
        where: {
            nwcId,
            linkIndex,
            isClaimed: false // Ensure we only update unclaimed links
        },
        data: {
            isClaimed: true
        }
    });
};

export const deleteLink = async (id) => {
    return await prisma.Link.delete({
        where: { id },
    });
};
