const { PrismaClient } = require('@prisma/client');

// Declare a variable to hold our Prisma client instance.
let prisma;

// Check if there is already an instance of PrismaClient attached to the global object.
// If not, create a new instance of PrismaClient and attach it to the global object.
// This ensures that the same instance of PrismaClient is reused across multiple invocations.
if (!global.prisma) {
    global.prisma = new PrismaClient();
}

// Assign the global PrismaClient instance to the prisma variable.
prisma = global.prisma;

// Export the prisma client instance, making it available for import in other parts of the application.
module.exports = prisma;
