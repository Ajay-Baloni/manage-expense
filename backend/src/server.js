import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import prisma from './config/prisma.js';

const PORT = parseInt(process.env.PORT || '8000', 10);

const app = createApp();

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Expense Manager API listening on port ${PORT}`);
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\nReceived ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
