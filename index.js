import config from './config.js';
import logger from './logger.js';
import './database.js'; // Initialize DB
import { startScheduler } from './scheduler.js';
import { closeDatabase } from './database.js';

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  closeDatabase();
  const exitCode = signal === 'UNCAUGHT_EXCEPTION' ? 1 : 0;
  process.exit(exitCode);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start() {
  try {
    logger.info('Webhook poster started successfully and is ready.');
    startScheduler();
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

start();