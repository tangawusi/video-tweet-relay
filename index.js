import config from './config.js';
import logger from './logger.js';
import './database.js'; // Initialize DB connection
import { startScheduler } from './scheduler.js';
import { closeDatabase } from './database.js';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  try {
    // Close database connections cleanly
    closeDatabase();
    
    const exitCode = signal === 'UNCAUGHT_EXCEPTION' ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Main startup function
async function start() {
  try {
    logger.info('Discord Twitter Video Poster started successfully and is ready.');
    startScheduler();
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Execute startup
start();