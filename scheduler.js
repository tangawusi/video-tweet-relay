import cron from 'node-cron';
import config from './config.js';
import logger from './logger.js';
import { runScrape } from './scrape.js';

export function startScheduler() {
  cron.schedule(config.SCRAPE_INTERVAL, async () => {
    logger.info('Triggering scheduled scrape...');
    await runScrape();
  });
  
  logger.info(`Scheduler started with interval: ${config.SCRAPE_INTERVAL}`);
}