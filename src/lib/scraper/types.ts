import { Anime, AnimeDetail, EpisodeDetail, DaySchedule } from '@/types';

export interface ScrapeListResult {
  anime: Anime[];
  hasNextPage: boolean;
}

export interface AnimeSource {
  name: string;
  baseUrl: string;

  getLatest(page?: number): Promise<ScrapeListResult>;
  getPopular(page?: number): Promise<ScrapeListResult>;
  getOnAir(): Promise<ScrapeListResult>;
  getGenre(slug: string, page?: number): Promise<ScrapeListResult>;
  search(query: string, page?: number): Promise<ScrapeListResult>;
  getDetail(slug: string): Promise<AnimeDetail>;
  getEpisode(slug: string): Promise<EpisodeDetail>;
  getSchedule(): Promise<DaySchedule[]>;
  getMovies(page?: number): Promise<ScrapeListResult>;
}
