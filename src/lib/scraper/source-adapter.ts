import { AnimeSource, ScrapeListResult } from './types';
import { SankaVollereiSource } from '@/lib/scraper/sankavollerei/adapter';
import { AnimasuSource } from '@/lib/scraper/animasu/adapter';
import { AnimeDetail, EpisodeDetail, DaySchedule } from '@/types';
import { logger } from '@/lib/utils/logger';

export class FallbackAnimeSource implements AnimeSource {
  public name: string;
  public baseUrl: string;

  constructor(
    private primary: AnimeSource,
    private secondary: AnimeSource
  ) {
    this.name = `${primary.name}->${secondary.name}`;
    this.baseUrl = primary.baseUrl;
  }

  private async executeWithFallback<T>(
    operationName: string,
    action: (source: AnimeSource) => Promise<T>
  ): Promise<T> {
    try {
      return await action(this.primary);
    } catch (err: any) {
      logger.scraper(
        `[FallbackAnimeSource] Primary source (${this.primary.name}) failed on ${operationName} (${err?.message || err}). Falling back to ${this.secondary.name}...`
      );
      return await action(this.secondary);
    }
  }

  public getLatest(page?: number): Promise<ScrapeListResult> {
    return this.executeWithFallback(`getLatest(${page})`, (s) => s.getLatest(page));
  }

  public getPopular(page?: number): Promise<ScrapeListResult> {
    return this.executeWithFallback(`getPopular(${page})`, (s) => s.getPopular(page));
  }

  public getOnAir(): Promise<ScrapeListResult> {
    return this.executeWithFallback('getOnAir()', (s) => s.getOnAir());
  }

  public getGenre(slug: string, page?: number): Promise<ScrapeListResult> {
    return this.executeWithFallback(`getGenre(${slug}, ${page})`, (s) => s.getGenre(slug, page));
  }

  public search(query: string, page?: number): Promise<ScrapeListResult> {
    return this.executeWithFallback(`search(${query}, ${page})`, (s) => s.search(query, page));
  }

  public getDetail(slug: string): Promise<AnimeDetail> {
    return this.executeWithFallback(`getDetail(${slug})`, (s) => s.getDetail(slug));
  }

  public getEpisode(slug: string): Promise<EpisodeDetail> {
    return this.executeWithFallback(`getEpisode(${slug})`, (s) => s.getEpisode(slug));
  }

  public getSchedule(): Promise<DaySchedule[]> {
    return this.executeWithFallback('getSchedule()', (s) => s.getSchedule());
  }

  public getMovies(page?: number): Promise<ScrapeListResult> {
    return this.executeWithFallback(`getMovies(${page})`, (s) => s.getMovies(page));
  }
}

class SourceAdapterRegistry {
  private sources = new Map<string, AnimeSource>();
  private defaultSourceKey: string;

  constructor() {
    this.defaultSourceKey = 'auto';

    const sanka = new SankaVollereiSource();
    const animasu = new AnimasuSource();
    const fallbackSource = new FallbackAnimeSource(sanka, animasu);

    this.sources.set('auto', fallbackSource);
    this.sources.set('sanka', sanka);
    this.sources.set('animasu', animasu);
    this.sources.set('animasu_api', fallbackSource);
  }

  public registerSource(key: string, source: AnimeSource) {
    this.sources.set(key, source);
  }

  public getSource(key?: string): AnimeSource {
    const targetKey = key || this.defaultSourceKey;
    const source = this.sources.get(targetKey);
    if (!source) {
      return this.sources.get('auto')!;
    }
    return source;
  }
}

export const sourceRegistry = new SourceAdapterRegistry();
