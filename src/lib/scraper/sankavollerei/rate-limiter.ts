import { logger } from '@/lib/utils/logger';

export enum RequestPriority {
  HIGH = 1,   // User interactive request (e.g. watch page, detail page)
  NORMAL = 2, // Background SWR revalidation
  LOW = 3,    // Smart prefetch & background scheduler sync
}

interface QueueItem {
  priority: RequestPriority;
  resolve: () => void;
  addedAt: number;
}

/**
 * Priority-based Sliding Window Rate Limiter & Concurrency Worker.
 *
 * Constraints:
 *  - Hard cap: Max 22 requests per 60,000 ms (Safe margin under 30 req/min limit)
 *  - Concurrent cap: Max 4 simultaneous active requests
 *  - Priority Worker Queue: Prioritizes interactive user requests over background sync/prefetching.
 */
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private maxConcurrent: number;
  private requestTimestamps: number[] = [];
  private activeCount = 0;

  private queue: QueueItem[] = [];

  constructor(maxRequests = 22, windowMs = 60000, maxConcurrent = 4) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxConcurrent = maxConcurrent;
  }

  public async acquireToken(priority: RequestPriority = RequestPriority.HIGH): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push({
        priority,
        resolve,
        addedAt: Date.now(),
      });
      // Sort queue by priority ASC (1=HIGH, 2=NORMAL, 3=LOW), then by FIFO addedAt
      this.queue.sort((a, b) => a.priority - b.priority || a.addedAt - b.addedAt);

      this.processQueue();
    });
  }

  private processQueue(): void {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < this.windowMs);

    while (
      this.queue.length > 0 &&
      this.requestTimestamps.length < this.maxRequests &&
      this.activeCount < this.maxConcurrent
    ) {
      const nextItem = this.queue.shift();
      if (!nextItem) break;

      this.requestTimestamps.push(now);
      this.activeCount++;

      logger.scraper(
        `[SankaRateLimiter] Token granted (P${nextItem.priority}) | Window: ${this.requestTimestamps.length}/${this.maxRequests} | Concurrent: ${this.activeCount}/${this.maxConcurrent} | Queue left: ${this.queue.length}`
      );

      nextItem.resolve();
    }

    if (this.queue.length > 0) {
      const windowWait =
        this.requestTimestamps.length >= this.maxRequests
          ? Math.max(50, this.windowMs - (now - this.requestTimestamps[0]) + 50)
          : 0;
      const concurrentWait = this.activeCount >= this.maxConcurrent ? 200 : 0;
      const waitTime = Math.max(windowWait, concurrentWait, 100);

      setTimeout(() => this.processQueue(), waitTime);
    }
  }

  public releaseToken(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.processQueue();
  }

  public getActiveRequestCount(): number {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < this.windowMs);
    return this.requestTimestamps.length;
  }

  public getMaxRequests(): number {
    return this.maxRequests;
  }

  public getStats() {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < this.windowMs);
    return {
      windowRequests: this.requestTimestamps.length,
      maxRequests: this.maxRequests,
      activeConcurrent: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.queue.length,
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __animehub_rate_limiter: RateLimiter | undefined;
}

if (!global.__animehub_rate_limiter) {
  global.__animehub_rate_limiter = new RateLimiter(22, 60000, 4);
}

export const sankaRateLimiter = global.__animehub_rate_limiter;
