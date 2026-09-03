/**
 * Cache Warmer — Pre-fills home page data at server startup.
 * Runs once when the server starts (persisted via global flag).
 * Prevents the first user from ever hitting a cold cache burst.
 */
import { logger } from '@/lib/utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __animehub_warmed: boolean | undefined;
}

export async function warmCache() {
  if (global.__animehub_warmed) return; // Already warmed, skip
  global.__animehub_warmed = true;

  // Delay 2s after startup to let everything initialize
  await new Promise((r) => setTimeout(r, 2000));

  logger.cache('[CacheWarmer] Starting background cache warm-up...');

  try {
    // Dynamic import to avoid circular deps
    const { animeService } = await import('@/lib/services/anime-service');

    // Sequential warm-up — one endpoint at a time with 400ms gap
    const endpoints = [
      () => animeService.getLatest(1),
      () => animeService.getPopular(1),
      () => animeService.getOnAir(),
      () => animeService.getMovies(1),
      () => animeService.getSchedule(),
    ];

    for (const fn of endpoints) {
      try {
        await fn();
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        // Individual endpoint failures are non-fatal during warm-up
      }
    }

    logger.cache('[CacheWarmer] Cache warm-up complete. All home data pre-loaded.');
  } catch (err) {
    logger.cache('[CacheWarmer] Warm-up failed (non-fatal):', err);
    global.__animehub_warmed = false; // Allow retry next startup
  }
}
