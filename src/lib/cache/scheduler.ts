/**
 * Background Scheduler & Sync Worker
 * Periodically updates hot cache & PostgreSQL persistent store in background
 * respecting the 22 req/min rate limit without any user request delay.
 */
import { logger } from '@/lib/utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __animehub_scheduler_started: boolean | undefined;
}

export function startBackgroundSync() {
  if (global.__animehub_scheduler_started) return;
  global.__animehub_scheduler_started = true;

  logger.cache('[BackgroundSync] Initializing background sync scheduler...');

  // 1. Initial warm up after 2s
  setTimeout(async () => {
    await runSyncTask('Initial Warmup', async (service) => {
      await service.getLatest(1);
      await new Promise((r) => setTimeout(r, 1500));
      await service.getPopular(1);
      await new Promise((r) => setTimeout(r, 1500));
      await service.getOnAir();
      await new Promise((r) => setTimeout(r, 1500));
      await service.getMovies(1);
      await new Promise((r) => setTimeout(r, 1500));
      await service.getSchedule();
    });
  }, 2000);

  // 2. Periodic sync for Latest & OnAir (every 10 minutes)
  setInterval(async () => {
    await runSyncTask('Latest & OnAir Sync', async (service) => {
      await service.getLatest(1);
      await new Promise((r) => setTimeout(r, 2000));
      await service.getOnAir();
    });
  }, 10 * 60 * 1000);

  // 3. Periodic sync for Popular & Movies (every 30 minutes)
  setInterval(async () => {
    await runSyncTask('Popular & Movies Sync', async (service) => {
      await service.getPopular(1);
      await new Promise((r) => setTimeout(r, 2000));
      await service.getMovies(1);
    });
  }, 30 * 60 * 1000);

  // 4. Periodic sync for Schedule (every 4 hours)
  setInterval(async () => {
    await runSyncTask('Schedule Sync', async (service) => {
      await service.getSchedule();
    });
  }, 4 * 60 * 60 * 1000);
}

async function runSyncTask(taskName: string, taskFn: (service: any) => Promise<void>) {
  try {
    logger.cache(`[BackgroundSync] Starting task: ${taskName}`);
    const { animeService } = await import('@/lib/services/anime-service');
    await taskFn(animeService);
    logger.cache(`[BackgroundSync] Completed task: ${taskName}`);
  } catch (err: any) {
    logger.cache(`[BackgroundSync] Task failed (${taskName}):`, err?.message);
  }
}
