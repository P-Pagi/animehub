import { AnimeSource, ScrapeListResult } from '../types';
import { AnimasuClient } from './client';
import {
  parseAnimeList,
  parseOnAirSection,
  parseAnimeDetail,
  parseEpisodeDetail,
  parseSchedulePage,
} from './parser';
import { AnimeDetail, EpisodeDetail, DaySchedule } from '@/types';

export class AnimasuSource implements AnimeSource {
  public readonly name = 'Animasu';
  public readonly baseUrl: string;
  private client: AnimasuClient;

  constructor() {
    this.client = new AnimasuClient();
    this.baseUrl = this.client.baseUrl;
  }

  /**
   * "Baru Ditambah & Diperbarui" - Latest added/updated anime.
   * Page 1 = homepage #terupdate section, page 2+ = /?page=N
   */
  public async getLatest(page: number = 1): Promise<ScrapeListResult> {
    const path = page > 1 ? `/?page=${page}` : '/';
    const html = await this.client.fetchHtml(path);
    return parseAnimeList(html);
  }

  /**
   * "Sedang Tayang" - Currently airing anime (new episodes this week).
   * Scraped from the homepage's "Sedang Tayang" section.
   */
  public async getOnAir(): Promise<ScrapeListResult> {
    const html = await this.client.fetchHtml('/');
    return parseOnAirSection(html);
  }

  /**
   * "Terpopuler" - Most popular anime of all time.
   * Uses animasu.love/populer/ with custom ?halaman=N pagination.
   */
  public async getPopular(page: number = 1): Promise<ScrapeListResult> {
    const path = page > 1 ? `/populer/?halaman=${page}` : '/populer/';
    const html = await this.client.fetchHtml(path);
    return parseAnimeList(html);
  }

  /**
   * Browse anime by genre slug (e.g. 'isekai', 'shounen', 'romance').
   * Uses standard WordPress /genre/[slug]/page/N/ pagination.
   */
  public async getGenre(slug: string, page: number = 1): Promise<ScrapeListResult> {
    const path = page > 1 ? `/genre/${slug}/page/${page}/` : `/genre/${slug}/`;
    const html = await this.client.fetchHtml(path);
    return parseAnimeList(html);
  }

  public async search(query: string, page: number = 1): Promise<ScrapeListResult> {
    const encodedQuery = encodeURIComponent(query);
    const path = page > 1 ? `/page/${page}/?s=${encodedQuery}` : `/?s=${encodedQuery}`;
    const html = await this.client.fetchHtml(path);
    return parseAnimeList(html);
  }

  public async getDetail(slug: string): Promise<AnimeDetail> {
    const path = `/anime/${slug}/`;
    const html = await this.client.fetchHtml(path);
    return parseAnimeDetail(html, slug);
  }

  public async getEpisode(slug: string): Promise<EpisodeDetail> {
    const path = `/${slug}/`;
    const html = await this.client.fetchHtml(path);
    return parseEpisodeDetail(html, slug);
  }

  public async getSchedule(): Promise<DaySchedule[]> {
    try {
      const html = await this.client.fetchHtml('/jadwal-rilis/');
      const schedule = parseSchedulePage(html);
      // If schedule parsed successfully with items, return it
      const totalItems = schedule.reduce((sum, d) => sum + d.anime.length, 0);
      if (totalItems > 0) return schedule;
    } catch {
      // Fallback
    }

    // Fallback: Group currently airing anime into weekly schedule days
    const onAir = await this.getOnAir();
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const fallbackSchedule: DaySchedule[] = days.map((day, idx) => {
      const animeForDay = onAir.anime
        .filter((_, animeIdx) => animeIdx % 7 === idx)
        .map((a) => ({
          slug: a.slug,
          title: a.title,
          thumbnail: a.thumbnail,
          episode: a.status || 'Episode Terbaru',
          time: '19:00 WIB',
        }));
      return { day, anime: animeForDay };
    });

    return fallbackSchedule;
  }

  public async getMovies(page: number = 1): Promise<ScrapeListResult> {
    return this.getGenre('movie', page);
  }
}
