import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseAnimeList,
  parseAnimeDetail,
  parseEpisodeDetail,
  extractSlugFromUrl,
} from '../src/lib/scraper/animasu/parser';

describe('Animasu HTML Parser Unit Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const homepageHtml = fs.readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8');
  const searchHtml = fs.readFileSync(path.join(fixturesDir, 'search.html'), 'utf8');
  const detailHtml = fs.readFileSync(path.join(fixturesDir, 'detail.html'), 'utf8');
  const watchHtml = fs.readFileSync(path.join(fixturesDir, 'watch.html'), 'utf8');

  it('should extract slug correctly from URL', () => {
    expect(extractSlugFromUrl('https://animasu.love/anime/naruto-sub-indo/')).toBe('naruto-sub-indo');
    expect(extractSlugFromUrl('https://animasu.love/nonton-naruto-episode-1/')).toBe(
      'nonton-naruto-episode-1',
    );
  });

  it('should parse homepage anime list correctly', () => {
    const result = parseAnimeList(homepageHtml);
    expect(result.anime).toBeDefined();
    expect(result.anime.length).toBeGreaterThan(0);

    const first = result.anime[0];
    expect(first.title).toBeDefined();
    expect(first.slug).toBeDefined();
    expect(first.sourceUrl).toContain('animasu.love');
  });

  it('should parse search HTML correctly', () => {
    const result = parseAnimeList(searchHtml);
    expect(result.anime).toBeDefined();
    expect(Array.isArray(result.anime)).toBe(true);
  });

  it('should parse anime detail metadata and episode list', () => {
    const detail = parseAnimeDetail(detailHtml, 'kore-kaite-shine');
    expect(detail.id).toBe('kore-kaite-shine');
    expect(detail.title).toBeDefined();
    expect(detail.episodes).toBeDefined();
    expect(detail.episodes.length).toBeGreaterThan(0);

    const firstEp = detail.episodes[0];
    expect(firstEp.number).toBeDefined();
    expect(firstEp.slug).toBeDefined();
    expect(firstEp.url).toContain('/watch/');
  });

  it('should parse watch episode details and embed URL', () => {
    const epDetail = parseEpisodeDetail(watchHtml, 'nonton-kore-kaite-shine-episode-8');
    expect(epDetail.episodeNumber).toBe(8);
    expect(epDetail.animeSlug).toBe('kore-kaite-shine');
    expect(epDetail.sourceUrl).toContain('animasu.love');
  });
});
