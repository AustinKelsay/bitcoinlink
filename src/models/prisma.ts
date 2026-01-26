import { PrismaClient } from '@prisma/client';

// Extend the global object to include the prisma property
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Check if there is already an instance of PrismaClient attached to the global object.
// If not, create a new instance of PrismaClient and attach it to the global object.
// This ensures that the same instance of PrismaClient is reused across multiple invocations.
if (!global.prisma) {
  global.prisma = new PrismaClient();
}

// Assign the global PrismaClient instance to the prisma variable.
const prisma: PrismaClient = global.prisma;

// Export the prisma client instance, making it available for import in other parts of the application.
export default prisma;
