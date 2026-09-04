import { Anime, AnimeDetail, EpisodeDetail, DaySchedule } from '@/types';
import { RequestPriority } from './sankavollerei/rate-limiter';

export interface ScrapeListResult {
  anime: Anime[];
  hasNextPage: boolean;
}

export interface AnimeSource {
  name: string;
  baseUrl: string;

  getLatest(page?: number, priority?: RequestPriority): Promise<ScrapeListResult>;
  getPopular(page?: number, priority?: RequestPriority): Promise<ScrapeListResult>;
  getOnAir(priority?: RequestPriority): Promise<ScrapeListResult>;
  getGenre(slug: string, page?: number, priority?: RequestPriority): Promise<ScrapeListResult>;
  search(query: string, page?: number, priority?: RequestPriority): Promise<ScrapeListResult>;
  getDetail(slug: string, priority?: RequestPriority): Promise<AnimeDetail>;
  getEpisode(slug: string, priority?: RequestPriority): Promise<EpisodeDetail>;
  getSchedule(priority?: RequestPriority): Promise<DaySchedule[]>;
  getMovies(page?: number, priority?: RequestPriority): Promise<ScrapeListResult>;
}
