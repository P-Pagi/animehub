import { sourceRegistry } from '../scraper/source-adapter';
import { cache } from '../cache/cache';
import { AnimeDetail, EpisodeDetail, DaySchedule } from '@/types';
import { ScrapeListResult } from '../scraper/types';

// Longer TTL = fewer API hits. Samehadaku data rarely changes every 5 min.
// Home data: 30min stale, 24hr backup | Schedule: 6hr stale | Episode/Detail: 20min stale
const TTL_HOMEPAGE = parseInt(process.env.CACHE_TTL_HOMEPAGE || '1800', 10);  // 30 min
const TTL_SEARCH   = parseInt(process.env.CACHE_TTL_SEARCH   || '300',  10);  // 5 min
const TTL_DETAIL   = parseInt(process.env.CACHE_TTL_DETAIL   || '1800', 10);  // 30 min
const TTL_EPISODE  = parseInt(process.env.CACHE_TTL_EPISODE  || '900',  10);  // 15 min
const TTL_GENRE    = parseInt(process.env.CACHE_TTL_GENRE    || '1800', 10);  // 30 min
const TTL_SCHEDULE = parseInt(process.env.CACHE_TTL_SCHEDULE || '21600', 10); // 6 hours

export class AnimeService {
  private get source() {
    return sourceRegistry.getSource();
  }

  public async getLatest(page: number = 1): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:latest:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_HOMEPAGE, () => this.source.getLatest(page));
  }

  public async getOnAir(): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:onair`;
    return cache.fetchWithSWR(cacheKey, TTL_HOMEPAGE, () => this.source.getOnAir());
  }

  public async getPopular(page: number = 1): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:popular:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_HOMEPAGE, () => this.source.getPopular(page));
  }

  public async getGenre(slug: string, page: number = 1): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:genre:${slug}:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_GENRE, () => this.source.getGenre(slug, page));
  }

  public async search(query: string, page: number = 1): Promise<ScrapeListResult> {
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `anime:${this.source.name}:search:${normalizedQuery}:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_SEARCH, () => this.source.search(normalizedQuery, page));
  }

  public async getDetail(slug: string): Promise<AnimeDetail> {
    const cacheKey = `anime:${this.source.name}:detail:${slug}`;
    return cache.fetchWithSWR(cacheKey, TTL_DETAIL, () => this.source.getDetail(slug));
  }

  public async getWatchEpisode(slug: string): Promise<EpisodeDetail> {
    const cacheKey = `anime:${this.source.name}:watch:${slug}`;
    return cache.fetchWithSWR(cacheKey, TTL_EPISODE, () => this.source.getEpisode(slug));
  }

  public async getSchedule(): Promise<DaySchedule[]> {
    const cacheKey = `anime:${this.source.name}:schedule`;
    return cache.fetchWithSWR(cacheKey, TTL_SCHEDULE, () => this.source.getSchedule());
  }

  public async getMovies(page: number = 1): Promise<ScrapeListResult> {
    const cacheKey = `anime:${this.source.name}:movies:${page}`;
    return cache.fetchWithSWR(cacheKey, TTL_HOMEPAGE, () => this.source.getMovies(page));
  }
}

export const animeService = new AnimeService();
