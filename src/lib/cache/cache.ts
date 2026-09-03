import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { prisma } from '../db/prisma';

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
          logger.cache('Redis error, falling back to In-Memory & Postgres cache', err.message);
        });
      } catch (err) {
        logger.cache('Failed to initialize Redis, using In-Memory & Postgres fallback', err);
        this.redis = null;
      }
    } else {
      logger.cache('No REDIS_URL configured. Using In-Memory & Postgres persistent cache.');
    }
  }

  /**
   * Get item from cache. Checks Redis -> Memory -> Postgres.
   */
  public async get<T>(key: string): Promise<T | null> {
    const entry = await this.getWithSWR<T>(key);
    return entry ? entry.data : null;
  }

  /**
   * Internal method to check SWR state across 3 layers:
   * Layer 1: Memory (Fastest)
   * Layer 2: Redis (Distributed)
   * Layer 3: Postgres (Persistent Store)
   */
  public async getWithSWR<T>(key: string): Promise<{ data: T; isStale: boolean } | null> {
    const now = Date.now();

    // Layer 1: In-Memory
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (now < memoryEntry.expiresAt) {
        const isStale = now >= memoryEntry.staleAt;
        logger.cache(`HIT (Memory${isStale ? ' STALE' : ''}) -> ${key}`);
        return { data: memoryEntry.data as T, isStale };
      }
      this.memoryCache.delete(key);
    }

    // Layer 2: Redis
    if (this.redis && this.redis.status === 'ready') {
      try {
        const value = await this.redis.get(key);
        if (value) {
          logger.cache(`HIT (Redis) -> ${key}`);
          const data = JSON.parse(value) as T;
          // Populate memory cache to save future Redis roundtrips
          this.memoryCache.set(key, {
            data,
            staleAt: now + 300000,
            expiresAt: now + 86400000,
          });
          return { data, isStale: false };
        }
      } catch (err: any) {
        logger.cache(`Redis GET failed for ${key}`, err?.message);
      }
    }

    // Layer 3: Postgres Persistent Cache
    try {
      const dbEntry = await (prisma as any).animeCache?.findUnique({
        where: { key },
      });

      if (dbEntry) {
        const isStale = now >= dbEntry.staleAt.getTime();
        const isExpired = now >= dbEntry.expiresAt.getTime();

        if (!isExpired || isStale) {
          logger.cache(`HIT (Postgres${isStale ? ' STALE' : ''}) -> ${key}`);
          const data = dbEntry.data as T;

          // Backfill Redis & Memory
          this.memoryCache.set(key, {
            data,
            staleAt: dbEntry.staleAt.getTime(),
            expiresAt: dbEntry.expiresAt.getTime(),
          });

          if (this.redis && this.redis.status === 'ready') {
            const remainingTtlSec = Math.max(10, Math.floor((dbEntry.staleAt.getTime() - now) / 1000));
            this.redis.setex(key, remainingTtlSec, JSON.stringify(data)).catch(() => {});
          }

          return { data, isStale };
        }
      }
    } catch (err: any) {
      logger.cache(`Postgres GET failed for ${key}`, err?.message);
    }

    logger.cache(`MISS -> ${key}`);
    return null;
  }

  /**
   * Set item in all 3 cache layers: Memory, Redis, and Postgres.
   */
  public async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    const staleDurationMs = Math.floor(ttlSeconds * 0.8) * 1000;
    const expiresDurationMs = 7 * 86400 * 1000; // 7 days persistent fallback window

    const staleAt = new Date(now + staleDurationMs);
    const expiresAt = new Date(now + expiresDurationMs);

    // 1. Memory
    this.memoryCache.set(key, {
      data,
      staleAt: staleAt.getTime(),
      expiresAt: expiresAt.getTime(),
    });

    // 2. Redis
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
      } catch (err: any) {
        logger.cache(`Redis SETEX failed for ${key}`, err?.message);
      }
    }

    // 3. Postgres
    try {
      if ((prisma as any).animeCache) {
        await (prisma as any).animeCache.upsert({
          where: { key },
          update: {
            data: data as any,
            staleAt,
            expiresAt,
          },
          create: {
            key,
            data: data as any,
            staleAt,
            expiresAt,
          },
        });
      }
    } catch (err: any) {
      logger.cache(`Postgres UPSERT failed for ${key}`, err?.message);
    }
  }

  public async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
    if (this.redis && this.redis.status === 'ready') {
      this.redis.del(key).catch(() => {});
    }
    if ((prisma as any).animeCache) {
      (prisma as any).animeCache.delete({ where: { key } }).catch(() => {});
    }
  }

  /**
   * Request Deduplication (Cache Stampede Protection / Single-flight).
   * Prevents simultaneous identical upstream fetches.
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
   * Helper to get or fetch with 3-tier caching, deduplication, and SWR background revalidation.
   */
  public async fetchWithSWR<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = await this.getWithSWR<T>(key);

    if (cached) {
      if (cached.isStale) {
        // Background revalidation without blocking client
        this.dedupe(key, async () => {
          try {
            logger.cache(`BACKGROUND REVALIDATION -> ${key}`);
            const freshData = await fetchFn();
            await this.set(key, freshData, ttlSeconds);
          } catch (err: any) {
            logger.cache(`Background revalidation failed for ${key}`, err?.message);
          }
        });
      }
      return cached.data;
    }

    // Cache miss across all layers: deduplicate simultaneous incoming requests
    return this.dedupe(key, async () => {
      try {
        const data = await fetchFn();
        await this.set(key, data, ttlSeconds);
        return data;
      } catch (err) {
        // Emergency Fallback: check if Postgres has ANY entry for this key (even expired)
        try {
          const fallbackDb = await (prisma as any).animeCache?.findUnique({ where: { key } });
          if (fallbackDb?.data) {
            logger.cache(`FALLBACK EXPIRED POSTGRES HIT -> ${key}`);
            return fallbackDb.data as T;
          }
        } catch { }

        // Fallback: check in-memory map
        const expiredEntry = this.memoryCache.get(key);
        if (expiredEntry?.data) {
          logger.cache(`FALLBACK EXPIRED MEMORY HIT -> ${key}`);
          return expiredEntry.data as T;
        }

        throw err;
      }
    });
  }

  public getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      inFlightRequests: this.inFlight.size,
      redisConnected: this.redis?.status === 'ready',
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __animehub_cache: CacheService | undefined;
}

if (!global.__animehub_cache) {
  global.__animehub_cache = new CacheService();
}

export const cache = global.__animehub_cache;
