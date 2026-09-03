import Redis from 'ioredis';
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  staleAt: number;
  expiresAt: number;
}

class CacheService {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && redisUrl.trim() !== '') {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(times * 200, 1000);
          },
        });

        this.redis.on('connect', () => logger.cache('Redis connected successfully'));
        this.redis.on('error', (err) => {
          logger.cache('Redis error, falling back to In-Memory cache', err.message);
        });
      } catch (err) {
        logger.cache('Failed to initialize Redis, using In-Memory fallback', err);
        this.redis = null;
      }
    } else {
      logger.cache('No REDIS_URL configured. Using In-Memory cache.');
    }
  }

  /**
   * Get item from cache. Returns T or null.
   */
  public async get<T>(key: string): Promise<T | null> {
    const entry = await this.getWithSWR<T>(key);
    return entry ? entry.data : null;
  }

  /**
   * Internal method to check SWR state.
   */
  public async getWithSWR<T>(key: string): Promise<{ data: T; isStale: boolean } | null> {
    const now = Date.now();

    // 1. Try Redis if available
    if (this.redis && this.redis.status === 'ready') {
      try {
        const value = await this.redis.get(key);
        if (value) {
          logger.cache(`HIT (Redis) -> ${key}`);
          return { data: JSON.parse(value) as T, isStale: false };
        }
      } catch (err) {
        logger.cache(`Redis GET failed for ${key}, checking in-memory fallback`, err);
      }
    }

    // 2. Fallback to In-Memory with SWR support
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (now < entry.expiresAt) {
        const isStale = now >= entry.staleAt;
        logger.cache(`HIT (Memory${isStale ? ' STALE' : ''}) -> ${key}`);
        return { data: entry.data as T, isStale };
      }
      // Expired completely
      this.memoryCache.delete(key);
    }

    logger.cache(`MISS -> ${key}`);
    return null;
  }

  /**
   * Set item in cache with staleAt window for SWR.
   */
  public async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    // Stale after 80% of TTL, expires after 24 hours to guarantee zero-downtime fallback
    const staleDurationMs = Math.floor(ttlSeconds * 0.8) * 1000;
    const expiresDurationMs = 86400 * 1000; // 24 Hours emergency backup

    this.memoryCache.set(key, {
      data,
      staleAt: now + staleDurationMs,
      expiresAt: now + expiresDurationMs,
    });

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
      } catch (err) {
        logger.cache(`Redis SETEX failed for ${key}`, err);
      }
    }
  }

  public async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(key);
      } catch (err) {
        logger.cache(`Redis DEL failed for ${key}`, err);
      }
    }
  }

  /**
   * Request Deduplication to prevent cache stampede.
   * If 10,000 concurrent requests request key X, only ONE upstream fetch is executed.
   */
  public async dedupe<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      logger.cache(`DEDUPED -> Reusing in-flight request for ${key}`);
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = fetchFn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Helper to get or fetch with deduplication and SWR background revalidation.
   */
  public async fetchWithSWR<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = await this.getWithSWR<T>(key);

    if (cached) {
      // If stale, trigger background revalidation (do not block user)
      if (cached.isStale) {
        this.dedupe(key, async () => {
          try {
            logger.cache(`BACKGROUND REVALIDATION -> ${key}`);
            const freshData = await fetchFn();
            await this.set(key, freshData, ttlSeconds);
          } catch (err) {
            logger.cache(`Background revalidation failed for ${key}`, err);
          }
        });
      }
      return cached.data;
    }

    // Cache miss: deduplicate simultaneous incoming requests with stale fallback recovery
    return this.dedupe(key, async () => {
      try {
        const data = await fetchFn();
        await this.set(key, data, ttlSeconds);
        return data;
      } catch (err) {
        // Fallback: check if we have any previous entry in memory (even expired)
        const expiredEntry = this.memoryCache.get(key);
        if (expiredEntry?.data) {
          logger.cache(`FALLBACK EXPIRED CACHE HIT -> ${key}`);
          return expiredEntry.data as T;
        }
        throw err;
      }
    });
  }

  /**
   * Get stats about current cache state (useful for health check & concurrency monitoring)
   */
  public getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      inFlightRequests: this.inFlight.size,
      redisConnected: this.redis?.status === 'ready',
    };
  }
}

// Use global to persist cache across Next.js hot reloads in dev mode.
// Without this, every HMR wipe destroys the in-memory Map and triggers a
// full cache miss burst (4-5 API calls) on the next request.
declare global {
  // eslint-disable-next-line no-var
  var __animehub_cache: CacheService | undefined;
}

if (!global.__animehub_cache) {
  global.__animehub_cache = new CacheService();
}

export const cache = global.__animehub_cache;
