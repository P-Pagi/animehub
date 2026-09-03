import { logger } from '@/lib/utils/logger';

/**
 * Sliding Window Rate Limiter with Concurrent Request Semaphore.
 *
 * Strategy:
 *  - Hard cap: max 28 requests per 60s (provider limit is 30; 2 req safety buffer).
 *  - Concurrent cap: max 5 simultaneous in-flight requests to avoid burst storms.
 *  - NO per-request minimum spacing — requests within both caps run in parallel,
 *    so homepage (3-5 parallel fetches) resolves in one network RTT, not 3-5 seconds.
 */
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private maxConcurrent: number;
  private requestTimestamps: number[] = [];
  private activeCount = 0;
  private waitQueue: Array<() => void> = [];

  constructor(maxRequests = 28, windowMs = 60000, maxConcurrent = 5) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxConcurrent = maxConcurrent;
  }

  public async acquireToken(): Promise<void> {
    await new Promise<void>((resolve) => {
      const tryAcquire = () => {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < this.windowMs);

        if (
          this.requestTimestamps.length < this.maxRequests &&
          this.activeCount < this.maxConcurrent
        ) {
          this.requestTimestamps.push(now);
          this.activeCount++;
          logger.scraper(
            `[SankaRateLimiter] Token acquired (window: ${this.requestTimestamps.length}/${this.maxRequests}, concurrent: ${this.activeCount}/${this.maxConcurrent})`
          );
          resolve();
        } else {
          // Back-pressure: calculate exact wait time to next available slot
          const windowWait =
            this.requestTimestamps.length >= this.maxRequests
              ? Math.max(50, this.windowMs - (now - this.requestTimestamps[0]) + 50)
              : 0;
          const concurrentWait = this.activeCount >= this.maxConcurrent ? 200 : 0;
          const waitTime = Math.max(windowWait, concurrentWait, 50);
          logger.scraper(
            `[SankaRateLimiter] Cap reached — retrying in ${waitTime}ms (window: ${this.requestTimestamps.length}/${this.maxRequests}, concurrent: ${this.activeCount}/${this.maxConcurrent})`
          );
          setTimeout(tryAcquire, waitTime);
        }
      };
      tryAcquire();
    });
  }

  /** Must be called after the upstream request completes (success or error). */
  public releaseToken(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  public getActiveRequestCount(): number {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < this.windowMs);
    return this.requestTimestamps.length;
  }

  public getMaxRequests(): number {
    return this.maxRequests;
  }
}

// Persist on global so request timestamps survive Next.js hot reloads.
declare global {
  // eslint-disable-next-line no-var
  var __animehub_rate_limiter: RateLimiter | undefined;
}

if (!global.__animehub_rate_limiter) {
  global.__animehub_rate_limiter = new RateLimiter(28, 60000, 5);
}

export const sankaRateLimiter = global.__animehub_rate_limiter;
