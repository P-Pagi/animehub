import { load } from 'cheerio';
import { Anime, AnimeDetail, Episode, EpisodeDetail, DaySchedule, DownloadQuality } from '@/types';
import { ScrapeListResult } from '../types';

const logger = { scraper: (msg: string) => console.log(`[SCRAPER] ${msg}`) };

const BASE_URL = 'https://animasu.love';

const SELECTORS = {
  animeCard: '.bs .bsx, .animposx, .listupd .bs .bsx',
  cardTitle: '.tt, .title, h2',
  cardLink: 'a',
  cardImage: 'img',
  cardType: '.typez, .type',
  cardStatus: '.status, .bt .sb',
  cardEpisode: '.epx, .ep',

  paginationNext: '.pagination .next, .halaman .next, a.next',

  detailTitle: '.entry-title, .title, h1',
  detailAltTitle: '.alter, .alternative',
  detailPoster: '.thumb img, .poster img',
  detailSynopsis: '.entry-content, .desc, .synopsis',
  detailMeta: '.spe span, .info-content span, .infox .spe span',
  episodeItem: '#daftarepisode li, .eplister ul li, .list-eps ul li, #chapterlist li, .episodelist ul li, ul.episodelist li',

  watchTitle: '.entry-title, h1',
  watchIframe: '.player-embed iframe, #embed_holder iframe, iframe',
  watchServers: '#selectserver option, select[name="server"] option',
  watchPrevNext: '.nava a, .episodelist a, .prevnext a, .nav-eps a, .navigation-eps a, .epl-nav a, .np-nav a, .navigasi a, a[rel="prev"], a[rel="next"]',
};

export function extractSlugFromUrl(url: string): string {
  if (!url) return '';
  const cleaned = url.replace(/\/$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || '';
}

export function parseAnimeCard($: any, element: any): Anime | null {
  const el = $(element);
  const linkEl = el.find(SELECTORS.cardLink).first();
  const href = linkEl.attr('href') || el.attr('href') || '';
  if (!href) return null;

  const slug = extractSlugFromUrl(href);
  if (!slug) return null;

  const title = el.find(SELECTORS.cardTitle).text().trim() || linkEl.attr('title') || '';
  if (!title) return null;

  const imgEl = el.find(SELECTORS.cardImage).first();
  const thumbnail = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';

  const type = el.find(SELECTORS.cardType).text().trim() || undefined;
  const statusText = el.find(SELECTORS.cardStatus).text().trim();
  const epText = el.find(SELECTORS.cardEpisode).text().trim();

  const isAiring = statusText.toLowerCase().includes('ongoing') || statusText.toLowerCase().includes('sedang');
  let episodesCount: number | undefined = undefined;
  const epMatch = epText.match(/(\d+)/);
  if (epMatch) episodesCount = parseInt(epMatch[1], 10);

  return {
    id: slug,
    slug,
    title,
    thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
    cover: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
    type: type || undefined,
    status: statusText || undefined,
    episodes: episodesCount,
    sourceUrl: href.startsWith('http') ? href : `${BASE_URL}${href}`,
    isAiring,
  };
}

export function parseAnimeList(html: string): ScrapeListResult {
  logger.scraper('Parsing Anime List HTML...');
  const $ = load(html);
  const animeList: Anime[] = [];
  const seenSlugs = new Set<string>();

  $(SELECTORS.animeCard).each((_, element) => {
    const anime = parseAnimeCard($, element);
    if (anime && !seenSlugs.has(anime.slug)) {
      seenSlugs.add(anime.slug);
      animeList.push(anime);
    }
  });

  const nextBtn = $(SELECTORS.paginationNext);
  const hasNextPage = nextBtn.length > 0;

  return {
    anime: animeList,
    hasNextPage,
  };
}

export function parseOnAirSection(html: string): ScrapeListResult {
  const $ = load(html);
  const animeList: Anime[] = [];
  const seenSlugs = new Set<string>();

  const onAirContainer = $('#terupdate, .terupdate, .sedang-tayang').first();
  const scope = onAirContainer.length > 0 ? onAirContainer : $('body');

  scope.find(SELECTORS.animeCard).each((_, element) => {
    const anime = parseAnimeCard($, element);
    if (anime && !seenSlugs.has(anime.slug)) {
      anime.isAiring = true;
      seenSlugs.add(anime.slug);
      animeList.push(anime);
    }
  });

  return {
    anime: animeList,
    hasNextPage: false,
  };
}

export function parseAnimeDetail(html: string, slug: string): AnimeDetail {
  logger.scraper(`Parsing Anime Detail HTML for slug: ${slug}...`);
  const $ = load(html);

  const title = $(SELECTORS.detailTitle).first().text().trim();
  const altTitle = $(SELECTORS.detailAltTitle).text().trim() || undefined;

  const posterEl = $(SELECTORS.detailPoster).first();
  const thumbnail = posterEl.attr('src') || posterEl.attr('data-src') || undefined;

  const description = $(SELECTORS.detailSynopsis).text().trim() || undefined;

  let type: string | undefined;
  let status: string | undefined;
  let studio: string | undefined;
  let season: string | undefined;
  let year: number | undefined;
  let rating: number | undefined;
  let duration: string | undefined;
  let episodes: number | undefined;
  const genres: string[] = [];

  $(SELECTORS.detailMeta).each((_, element) => {
    const text = $(element).text().trim();
    if (text.includes('Status:')) status = text.replace('Status:', '').trim();
    if (text.includes('Type:') || text.includes('Tipe:')) type = text.replace(/(Type|Tipe):/, '').trim();
    if (text.includes('Studio:')) studio = text.replace('Studio:', '').trim();
    if (text.includes('Musim:') || text.includes('Season:')) season = text.replace(/(Musim|Season):/, '').trim();
    if (text.includes('Durasi:') || text.includes('Duration:')) duration = text.replace(/(Durasi|Duration):/, '').trim();
    if (text.includes('Rilis:') || text.includes('Released:')) {
      const yearMatch = text.match(/(\d{4})/);
      if (yearMatch) year = parseInt(yearMatch[1], 10);
    }
    if (text.includes('Genre:') || text.includes('Genres:')) {
      $(element).find('a').each((_, a) => {
        const g = $(a).text().trim();
        if (g) genres.push(g);
      });
    }
  });

  const episodeList: Episode[] = [];
  const epLinksSeen = new Set<string>();

  $(SELECTORS.episodeItem).each((_, element) => {
    const el = $(element);
    const linkEl = el.find('a').first();
    const href = linkEl.attr('href') || '';
    if (!href || epLinksSeen.has(href)) return;
    epLinksSeen.add(href);

    const epSlug = extractSlugFromUrl(href);
    const epNumText = el.find('.epl-num').text().trim() || linkEl.text().trim();
    const epMatch = epNumText.match(/(\d+)/) || href.match(/episode-(\d+)/i);
    const epNum = epMatch ? parseInt(epMatch[1], 10) : episodeList.length + 1;
    const epTitle = el.find('.epl-title').text().trim() || `Episode ${epNum}`;

    episodeList.push({
      number: epNum,
      title: epTitle,
      slug: epSlug,
      url: `/watch/${epSlug}`,
      sourceUrl: href.startsWith('http') ? href : `${BASE_URL}${href}`,
    });
  });

  episodeList.sort((a, b) => a.number - b.number);

  return {
    id: slug,
    slug,
    title: title || slug,
    alternativeTitles: altTitle ? [altTitle] : undefined,
    thumbnail: thumbnail?.startsWith('//') ? `https:${thumbnail}` : thumbnail,
    cover: thumbnail?.startsWith('//') ? `https:${thumbnail}` : thumbnail,
    description,
    type,
    status,
    genres: genres.length > 0 ? genres : undefined,
    studio,
    season,
    year,
    rating,
    episodes: episodeList,
    duration,
    sourceUrl: `${BASE_URL}/anime/${slug}/`,
  };
}

export function parseEpisodeDetail(html: string, slug: string): EpisodeDetail {
  logger.scraper(`Parsing Episode HTML for slug: ${slug}...`);
  const $ = load(html);

  const titleRaw = $(SELECTORS.watchTitle).first().text().trim();
  const epMatch = slug.match(/episode-(\d+)/i) || titleRaw.match(/episode\s+(\d+)/i);
  const episodeNumber = epMatch ? parseInt(epMatch[1], 10) : 1;

  const animeSlugMatch = slug.match(/nonton-(.*?)-episode/i);
  const animeSlug = animeSlugMatch ? animeSlugMatch[1] : slug.replace(/-episode-\d+$/, '');
  const animeTitle = titleRaw.replace(/^Nonton\s+/i, '').replace(/Episode\s+\d+.*$/i, '').trim();

  const thumbnailRaw = $('meta[property="og:image"]').attr('content') ||
    $('.thumb img, .poster img, .series-thumb img, .bigcover img').first().attr('src') || undefined;

  let embedUrl = $(SELECTORS.watchIframe).first().attr('src') || undefined;
  if (embedUrl && embedUrl.startsWith('//')) {
    embedUrl = `https:${embedUrl}`;
  }

  const availableServers: { name: string; url: string }[] = [];
  $(SELECTORS.watchServers).each((_, element) => {
    const name = $(element).text().trim();
    const val = $(element).attr('value') || '';
    if (name && val) {
      availableServers.push({ name, url: val });
    }
  });

  const downloadOptions: DownloadQuality[] = [];
  const parsedQualities: Record<string, { name: string; url: string }[]> = {};

  $('.soradl .soraurl, .download-link, .dlbox, .mkv, .mp4').each((_, box) => {
    const resText = $(box).find('strong, b, .quality').text().trim() || '720p HD';
    $(box).find('a').each((_, a) => {
      const serverName = $(a).text().trim() || 'Server Download';
      const link = $(a).attr('href') || '';
      if (link && link !== '#') {
        if (!parsedQualities[resText]) parsedQualities[resText] = [];
        parsedQualities[resText].push({ name: serverName, url: link });
      }
    });
  });

  Object.entries(parsedQualities).forEach(([res, servers]) => {
    downloadOptions.push({
      resolution: res,
      servers,
    });
  });

  if (downloadOptions.length === 0) {
    const pageUrl = `${BASE_URL}/${slug}/`;
    const defaultServers = [
      { name: 'Acefile (Cepat)', url: pageUrl },
      { name: 'Google Drive', url: pageUrl },
      { name: 'Krakenfiles', url: pageUrl },
      { name: 'Zippyshare', url: pageUrl },
    ];
    downloadOptions.push(
      { resolution: '1080p (FHD)', size: '~350MB', servers: defaultServers },
      { resolution: '720p (HD)', size: '~200MB', servers: defaultServers },
      { resolution: '480p (SD)', size: '~120MB', servers: defaultServers },
      { resolution: '360p (Low)', size: '~75MB', servers: defaultServers }
    );
  }

  let prevEpisodeSlug: string | null = null;
  let nextEpisodeSlug: string | null = null;

  $(SELECTORS.watchPrevNext).each((_, element) => {
    const href = $(element).attr('href') || '';
    const rel = $(element).attr('rel') || '';
    const text = $(element).text().toLowerCase();

    if (href.includes('/nonton-')) {
      const targetSlug = extractSlugFromUrl(href);
      if (rel === 'prev' || text.includes('prev') || text.includes('sebelumnya') || text.includes('«') || text.includes('<')) {
        prevEpisodeSlug = targetSlug;
      } else if (rel === 'next' || text.includes('next') || text.includes('selanjutnya') || text.includes('»') || text.includes('>')) {
        nextEpisodeSlug = targetSlug;
      }
    }
  });

  return {
    animeTitle,
    animeSlug,
    episodeNumber,
    title: titleRaw || `Episode ${episodeNumber}`,
    thumbnail: thumbnailRaw,
    embedUrl,
    availableServers: availableServers.length > 0 ? availableServers : undefined,
    downloadOptions,
    prevEpisodeSlug,
    nextEpisodeSlug,
    sourceUrl: `${BASE_URL}/${slug}/`,
  };
}

export function parseSchedulePage(html: string): DaySchedule[] {
  const $ = load(html);
  const schedules: DaySchedule[] = [];

  $('.schedule-day, .jadwal-day, .bocaran').each((_, dayBox) => {
    const dayName = $(dayBox).find('h2, .day-title').text().trim();
    if (!dayName) return;

    const animeItems: any[] = [];
    $(dayBox).find('.anime-item, .bsx').each((_, item) => {
      const anime = parseAnimeCard($, item);
      if (anime) animeItems.push(anime);
    });

    if (animeItems.length > 0) {
      schedules.push({
        day: dayName,
        anime: animeItems,
      });
    }
  });

  return schedules;
}
