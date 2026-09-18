const { PrismaClient } = require('@prisma/client');

// Single shared Prisma instance (recommended pattern to avoid exhausting
// database connections in development with hot-reloading).
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
