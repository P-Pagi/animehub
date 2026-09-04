import { sourceRegistry } from '../scraper/source-adapter';
import { cache } from '../cache/cache';
import { AnimeDetail, EpisodeDetail, DaySchedule } from '@/types';
import { ScrapeListResult } from '../scraper/types';
import { RequestPriority, sankaRateLimiter } from '../scraper/sankavollerei/rate-limiter';
import { logger } from '../utils/logger';

// Longer TTL = fewer API hits. Samehadaku data rarely changes every 5 min.
const TTL_HOMEPAGE = parseInt(process.env.CACHE_TTL_HOMEPAGE || '3600', 10);  // 1 hour
const TTL_SEARCH   = parseInt(process.env.CACHE_TTL_SEARCH   || '600',  10);  // 10 min
const TTL_DETAIL   = parseInt(process.env.CACHE_TTL_DETAIL   || '3600', 10);  // 1 hour
const TTL_EPISODE  = parseInt(process.env.CACHE_TTL_EPISODE  || '1800', 10);  // 30 min
const TTL_GENRE    = parseInt(process.env.CACHE_TTL_GENRE    || '3600', 10);  // 1 hour
const TTL_SCHEDULE = parseInt(process.env.CACHE_TTL_SCHEDULE || '86400', 10); // 24 hours
const TTL_MOVIES   = parseInt(process.env.CACHE_TTL_MOVIES   || '43200', 10); // 12 hours

export class AnimeService {
  private get source() {
    return sourceRegistry.getSource();
  }

  public async getLatest(page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:latest:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_HOMEPAGE, () => this.source.getLatest(page, priority));
  }

  public async getOnAir(priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:onair`;
    return cache.fetchWithSWR(cacheKey, TTL_HOMEPAGE, () => this.source.getOnAir(priority));
  }

  public async getPopular(page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:popular:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_HOMEPAGE, () => this.source.getPopular(page, priority));
  }

  public async getGenre(slug: string, page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:genre:${slug}:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_GENRE, () => this.source.getGenre(slug, page, priority));
  }

  public async search(query: string, page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `anime:${this.source.name}:search:${normalizedQuery}:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_SEARCH, () => this.source.search(normalizedQuery, page, priority));
  }

  public async getDetail(slug: string, priority: RequestPriority = RequestPriority.HIGH): Promise<AnimeDetail> {
    const cacheKey = `anime:${this.source.name}:detail:${slug}`;
    return cache.fetchWithSWR(cacheKey, TTL_DETAIL, () => this.source.getDetail(slug, priority));
  }

  public async getWatchEpisode(slug: string, priority: RequestPriority = RequestPriority.HIGH): Promise<EpisodeDetail> {
    const cacheKey = `anime:${this.source.name}:watch:${slug}`;
    return cache.fetchWithSWR(cacheKey, TTL_EPISODE, () => this.source.getEpisode(slug, priority));
  }

  public async getSchedule(priority: RequestPriority = RequestPriority.HIGH): Promise<DaySchedule[]> {
    const cacheKey = `anime:${this.source.name}:schedule`;
    return cache.fetchWithSWR(cacheKey, TTL_SCHEDULE, () => this.source.getSchedule(priority));
  }

  public async getMovies(page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:movies:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_MOVIES, () => this.source.getMovies(page, priority));
  }

  /**
   * Smart Non-Blocking Background Prefetching for upcoming episodes
   */
  public prefetchEpisode(slug?: string | null): void {
    if (!slug) return;
    const cacheKey = `anime:${this.source.name}:watch:${slug}`;
    cache.get(cacheKey).then((cached) => {
      if (cached) {
        logger.scraper(`[Prefetch] Already cached in DB/Redis: ${slug}`);
        return;
      }
      if (sankaRateLimiter.getActiveRequestCount() <= 12) {
        logger.scraper(`[Prefetch] Queueing next episode prefetch: ${slug}`);
        this.getWatchEpisode(slug, RequestPriority.LOW).catch((err) => {
          logger.scraper(`[Prefetch] Skipped or failed for ${slug}: ${err?.message}`);
        });
      } else {
        logger.scraper(`[Prefetch] Skipped for ${slug} due to active load (${sankaRateLimiter.getActiveRequestCount()}/22)`);
      }
    }).catch(() => {});
  }
}

export const animeService = new AnimeService();
