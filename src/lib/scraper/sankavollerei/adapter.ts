import axios from 'axios';
import { AnimeSource, ScrapeListResult } from '../types';
import { AnimeDetail, EpisodeDetail, DaySchedule, Anime, Episode, DownloadQuality } from '@/types';
import { AppError } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import https from 'https';
import { sankaRateLimiter, RequestPriority } from './rate-limiter';
import { circuitBreaker } from './circuit-breaker';
import { cache } from '@/lib/cache/cache';

const httpsAgent = new https.Agent({
  keepAlive: false,
});

const API_BASE = 'https://www.sankavollerei.web.id/anime/samehadaku';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

async function fetchSankaApi<T>(
  endpoint: string,
  retries = 2,
  priority: RequestPriority = RequestPriority.HIGH
): Promise<T> {
  // Circuit breaker check — if tripped by a recent 429, bail immediately (no request sent)
  if (circuitBreaker.isOpen()) {
    throw new AppError('RATE_LIMITED', 'API sedang diistirahatkan (circuit open). Data dari cache.', 429);
  }

  await sankaRateLimiter.acquireToken(priority);

  const url = `${API_BASE}${endpoint}`;
  const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  logger.scraper(
    `[SankaSamehadakuAPI] Requesting (${priority === RequestPriority.HIGH ? 'HIGH' : priority === RequestPriority.NORMAL ? 'NORMAL' : 'LOW'}): ${url}`
  );

  try {
    const response = await axios.get(url, {
      timeout: 8000,
      httpsAgent,
      headers: {
        'User-Agent': randomUserAgent,
        Accept: 'application/json, text/plain, */*',
        Connection: 'close',
      },
    });

    if (
      response.data?.message &&
      typeof response.data.message === 'string'
    ) {
      const msg = response.data.message.toLowerCase();
      if (msg.includes('error fetching')) {
        throw new AppError('NOT_FOUND', `Item not found on Samehadaku API (${endpoint})`, 404);
      }
      if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('limit reached')) {
        logger.scraper(`[CircuitBreaker] TRIP TRIGGERED via 200 OK payload: ${response.data.message}`);
        circuitBreaker.trip();
        throw new AppError('RATE_LIMITED', 'API sedang diistirahatkan (circuit open). Data dari cache.', 429);
      }
    }

    if (!response.data || response.data.status !== 'success') {
      throw new AppError('SOURCE_UNAVAILABLE', `Samehadaku API error for ${endpoint}`, 502);
    }

    // Request succeeded — close circuit breaker if it was half-open
    circuitBreaker.success();
    return response.data;

  } catch (err: any) {
    if (err instanceof AppError && err.code === 'NOT_FOUND') throw err;
    if (err instanceof AppError && err.code === 'RATE_LIMITED') throw err;

    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        throw new AppError('NOT_FOUND', `Item not found on Samehadaku API (${endpoint})`, 404);
      }
      if (err.response?.status === 500) {
        const msg = err.response.data?.message || '';
        if (typeof msg === 'string' && msg.includes('Error fetching')) {
          throw new AppError('NOT_FOUND', `Item not found on Samehadaku API (${endpoint})`, 404);
        }
      }

      // 429 or 403 or Rate Limit response message: TRIP the circuit breaker immediately, NO retry
      const status = err.response?.status;
      const respData = err.response?.data;
      const isRateLimitedMsg =
        respData?.message &&
        typeof respData.message === 'string' &&
        (respData.message.toLowerCase().includes('rate limit') || respData.message.toLowerCase().includes('too many requests'));

      if (status === 429 || status === 403 || isRateLimitedMsg) {
        logger.scraper(`[CircuitBreaker] TRIP TRIGGERED -> Status: ${status || '200 (msg rate limit)'}, Payload: ${JSON.stringify(respData || err.message)}`);
        circuitBreaker.trip();
        throw new AppError('RATE_LIMITED', 'API sedang diistirahatkan (circuit open). Data dari cache.', 429);
      }

      // Retryable errors with Exponential Backoff
      if (retries > 0 && (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED' || (status && status >= 500))) {
        const backoffMs = (3 - retries) * 400 + Math.floor(Math.random() * 200);
        logger.scraper(`[SankaSamehadakuAPI] Retrying ${endpoint} after ${backoffMs}ms... (${retries} retries left)`);
        await new Promise((r) => setTimeout(r, backoffMs));
        return fetchSankaApi<T>(endpoint, retries - 1, priority);
      }
    }

    logger.error('SCRAPER', `Samehadaku API error on ${url}`, err);
    throw new AppError('SOURCE_UNAVAILABLE', 'Unable to reach Samehadaku API server', 503);
  } finally {
    sankaRateLimiter.releaseToken();
  }
}

function parseEpisodeNum(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function dedupeAnime(items: Anime[]): Anime[] {
  const seen = new Set<string>();
  return items.filter((a) => {
    if (!a.slug || seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });
}

function mapAnimeCard(item: any): Anime {
  const slug = item.animeId || item.slug || (item.href ? item.href.split('/').pop() : '');
  const title = item.title || 'Anime';
  const thumbnail = item.poster || item.thumbnail || '';
  const type = item.type || 'TV';
  const isAiring = item.status ? item.status.toLowerCase().includes('ongoing') : true;

  let rating: number | undefined;
  if (typeof item.score === 'object' && item.score?.value) {
    const parsed = parseFloat(item.score.value);
    if (!isNaN(parsed)) rating = parsed;
  } else if (typeof item.score === 'string' || typeof item.score === 'number') {
    const parsed = parseFloat(String(item.score));
    if (!isNaN(parsed)) rating = parsed;
  }

  return {
    id: slug,
    slug,
    title,
    thumbnail,
    type,
    status: isAiring ? 'Ongoing' : 'Completed',
    rating,
    sourceUrl: item.samehadakuUrl || `https://v2.samehadaku.how/anime/${slug}`,
    isAiring,
  };
}

function extractAnimeSlugFromEp(epSlug: string): string {
  let clean = epSlug.replace(/^nonton-/, '');
  clean = clean.replace(/-(?:episode|ep)-\d+.*$/i, '');
  clean = clean.replace(/-(?:subtitle|sub)-(?:indo|indonesia).*$/i, '');
  return clean;
}

export class SankaVollereiSource implements AnimeSource {
  public readonly name = 'SankaVollerei';
  public readonly baseUrl: string = API_BASE;

  public async getLatest(page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const data = await fetchSankaApi<any>(`/recent?page=${page}`, 2, priority);
    const items = data.data?.animeList || data.data?.recent?.animeList || [];
    const anime = dedupeAnime(items.map(mapAnimeCard));
    return {
      anime,
      hasNextPage: data.pagination?.hasNext ?? items.length >= 12,
    };
  }

  public async getPopular(page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const data = await fetchSankaApi<any>(`/popular?page=${page}`, 2, priority);
    const items = data.data?.animeList || [];
    const anime = dedupeAnime(items.map(mapAnimeCard));
    return {
      anime,
      hasNextPage: data.pagination?.hasNext ?? items.length >= 12,
    };
  }

  public async getOnAir(priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const data = await fetchSankaApi<any>(`/ongoing?page=1`, 2, priority);
    const items = data.data?.animeList || [];
    const anime = dedupeAnime(items.map(mapAnimeCard));
    return {
      anime,
      hasNextPage: false,
    };
  }

  public async getMovies(page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    const data = await fetchSankaApi<any>(`/movies?page=${page}`, 2, priority);
    const items = data.data?.animeList || [];
    const anime = dedupeAnime(items.map(mapAnimeCard));
    return {
      anime,
      hasNextPage: data.pagination?.hasNext ?? items.length >= 12,
    };
  }

  public async getGenre(slug: string, page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    try {
      const lowerSlug = slug.toLowerCase().trim();

      if (lowerSlug === 'movie' || lowerSlug === 'movies') {
        return this.getMovies(page, priority);
      }
      if (lowerSlug === 'donghua') {
        return this.search('donghua', page, priority);
      }

      const GENRE_SLUG_MAP: Record<string, string> = {
        'aksi': 'action',
        'petualangan': 'adventure',
        'komedi': 'comedy',
        'fantasi': 'fantasy',
        'romansa': 'romance',
        'supranatural': 'supernatural',
        'olahraga': 'sports',
        'misteri': 'mystery',
        'sejarah': 'historical',
        'sekolahan': 'school',
        'bela-diri': 'martial-arts',
        'militer': 'military',
        'psikologis': 'psychological',
        'musik': 'music',
        'vampir': 'vampire',
        'reinkarnasi': 'reincarnation',
        'perjalanan-waktu': 'time-travel',
      };

      const targetSlug = GENRE_SLUG_MAP[lowerSlug] || lowerSlug;
      const data = await fetchSankaApi<any>(`/genres/${targetSlug}?page=${page}`, 2, priority);
      const items = data.data?.animeList || [];
      const anime = dedupeAnime(items.map(mapAnimeCard));
      return {
        anime,
        hasNextPage: data.pagination?.hasNext ?? items.length >= 12,
      };
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 404) {
        return { anime: [], hasNextPage: false };
      }
      throw err;
    }
  }

  public async search(query: string, page: number = 1, priority: RequestPriority = RequestPriority.HIGH): Promise<ScrapeListResult> {
    if (!query.trim()) return { anime: [], hasNextPage: false };
    try {
      const encoded = encodeURIComponent(query.trim());
      const data = await fetchSankaApi<any>(`/search?q=${encoded}&page=${page}`, 2, priority);
      const items = data.data?.animeList || [];
      const anime = dedupeAnime(items.map(mapAnimeCard));
      return {
        anime,
        hasNextPage: data.pagination?.hasNext ?? items.length >= 12,
      };
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 404) {
        return { anime: [], hasNextPage: false };
      }
      throw err;
    }
  }

  public async getDetail(slug: string, priority: RequestPriority = RequestPriority.HIGH): Promise<AnimeDetail> {
    const data: any = await fetchSankaApi<any>(`/anime/${slug}`, 2, priority);

    const d = data?.data || data;
    if (!d) throw new AppError('NOT_FOUND', 'Detail anime tidak ditemukan', 404);

    const title = d.title || slug.replace(/-/g, ' ');
    const rawGenres = (d.genreList || d.genres || []).map((g: any) =>
      typeof g === 'string' ? g : g.title || g.name
    );

    const episodes: Episode[] = (d.episodeList || []).map((ep: any) => {
      const epSlug = ep.episodeId || ep.slug || (ep.href ? ep.href.split('/').pop() : '');
      const epNum = parseEpisodeNum(String(ep.title || epSlug));
      return {
        number: epNum,
        title: typeof ep.title === 'number' ? `Episode ${ep.title}` : (ep.title || `Episode ${epNum}`),
        slug: epSlug,
        url: `/watch/${epSlug}`,
        sourceUrl: ep.samehadakuUrl || `https://v2.samehadaku.how/${epSlug}/`,
      };
    });

    let rating: number | undefined;
    if (typeof d.score === 'object' && d.score?.value) {
      const parsed = parseFloat(d.score.value);
      if (!isNaN(parsed)) rating = parsed;
    } else if (typeof d.score === 'string' || typeof d.score === 'number') {
      const parsed = parseFloat(String(d.score));
      if (!isNaN(parsed)) rating = parsed;
    }

    const isAiring = d.status ? d.status.toLowerCase().includes('ongoing') : true;
    const synopsisText =
      typeof d.synopsis === 'object' && d.synopsis?.paragraphs
        ? d.synopsis.paragraphs.join('\n\n')
        : (typeof d.synopsis === 'string' ? d.synopsis : 'Tidak ada sinopsis.');

    return {
      id: slug,
      slug,
      title,
      thumbnail: d.poster || '',
      cover: d.poster || '',
      description: synopsisText,
      type: d.type || 'TV',
      status: d.status || 'Ongoing',
      genres: rawGenres,
      studio: Array.isArray(d.studios) ? d.studios.join(', ') : (d.studios || 'Unknown'),
      season: d.season || '',
      duration: d.duration || '',
      rating,
      sourceUrl: d.samehadakuUrl || `https://v2.samehadaku.how/anime/${slug}`,
      isAiring,
      episodes,
      episodeCount: episodes.length,
    };
  }

  public async getEpisode(slug: string, priority: RequestPriority = RequestPriority.HIGH): Promise<EpisodeDetail> {
    const data = await fetchSankaApi<any>(`/episode/${slug}`, 2, priority);
    const d = data?.data || data;

    if (!d) throw new AppError('NOT_FOUND', 'Episode tidak ditemukan', 404);

    // Collect all server entries that need resolution (have serverId / href, no direct url)
    interface RawServerEntry {
      title: string;
      quality: string;
      serverId: string;
      href: string;
    }
    const rawServers: RawServerEntry[] = [];

    if (d.server?.qualities && Array.isArray(d.server.qualities)) {
      d.server.qualities.forEach((q: any) => {
        const qTitle = (q.title || 'HD').trim();
        if (qTitle === 'unknown') return; // skip unresolvable quality label
        if (q.serverList && Array.isArray(q.serverList)) {
          q.serverList.forEach((s: any) => {
            if (s.serverId) {
              rawServers.push({
                title: (s.title || 'Server').trim(),
                quality: qTitle,
                serverId: s.serverId,
                href: s.href || '',
              });
            }
          });
        }
      });
    }

    // Sort ALL available servers: Prioritize Wibufile first, followed by HD/720p/other servers
    rawServers.sort((a, b) => {
      const aIsWibu = a.title.toLowerCase().includes('wibu') || a.href.toLowerCase().includes('wibu');
      const bIsWibu = b.title.toLowerCase().includes('wibu') || b.href.toLowerCase().includes('wibu');
      if (aIsWibu && !bIsWibu) return -1;
      if (!aIsWibu && bIsWibu) return 1;

      // Resolution order: lower resolutions first (480p -> 720p -> 1080p) to save user bandwidth
      const getResScore = (q: string) => {
        if (q.includes('480') || q.includes('sd')) return 1;
        if (q.includes('720') || q.includes('hd')) return 2;
        if (q.includes('1080') || q.includes('fhd')) return 3;
        return 4;
      };
      return getResScore(a.quality.toLowerCase()) - getResScore(b.quality.toLowerCase());
    });

    // Resolve server IDs to embed URLs in parallel (capped to top 3 available servers to prevent request spikes)
    // Each serverId is cached for 30 Days in Redis/Postgres
    const toResolve = rawServers.slice(0, 3);
    const resolvedResults = await Promise.allSettled(
      toResolve.map(async (entry) => {
        // Check cache first — server embed URLs rarely change
        const cacheKey = `sanka:server:${entry.serverId}`;
        const cached = await cache.get<string>(cacheKey);
        if (cached) {
          return { entry, url: cached };
        }
        // Cache miss: resolve via API
        const res = await fetchSankaApi<any>(`/server/${entry.serverId}`, 2, priority);
        const url: string = res?.data?.url || res?.url || '';
        if (url) {
          await cache.set(cacheKey, url, 30 * 86400); // Cache embed URLs for 30 Days
        }
        return { entry, url };
      })
    );

    const availableServers: { name: string; url: string }[] = [];

    // Add resolved quality servers first (e.g. Wibufile which offers direct streaming)
    resolvedResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.url) {
        const { entry, url } = result.value;
        if (!availableServers.some((srv) => srv.url === url)) {
          availableServers.push({
            name: `${entry.title} (${entry.quality})`,
            url,
          });
        }
      }
    });

    // Ensure Wibufile servers are sorted to the top of availableServers list
    availableServers.sort((a, b) => {
      const aIsWibu = a.name.toLowerCase().includes('wibu') || a.url.toLowerCase().includes('wibu');
      const bIsWibu = b.name.toLowerCase().includes('wibu') || b.url.toLowerCase().includes('wibu');
      if (aIsWibu && !bIsWibu) return -1;
      if (!aIsWibu && bIsWibu) return 1;
      return 0;
    });

    const downloadOptions: DownloadQuality[] = [];
    const rawDl = d.downloadUrl || d.download_url;

    if (rawDl) {
      const formatsArr = Array.isArray(rawDl) ? rawDl : rawDl.formats || [rawDl];

      formatsArr.forEach((fmtGroup: any) => {
        const groupTitle = fmtGroup.title ? `[${fmtGroup.title.trim()}] ` : '';
        const qualitiesArr = fmtGroup.qualities || fmtGroup.formats || (Array.isArray(fmtGroup) ? fmtGroup : [fmtGroup]);

        if (Array.isArray(qualitiesArr)) {
          qualitiesArr.forEach((q: any) => {
            const resName = `${groupTitle}${q.title || q.quality || 'HD'}`.trim();
            const rawUrls = q.urls || q.downloadList || q.servers || [];

            if (Array.isArray(rawUrls)) {
              const servers = rawUrls
                .map((dl: any) => ({
                  name: (dl.title || dl.name || 'Download').trim(),
                  url: dl.url || dl.href || '',
                }))
                .filter((s: { url: string }) => !!s.url);

              if (servers.length > 0) {
                downloadOptions.push({ resolution: resName, servers });
              }
            }
          });
        }
      });
    }

    const embedUrl = availableServers.length > 0 ? availableServers[0].url : '';
    const animeSlug = d.animeId || extractAnimeSlugFromEp(slug);

    return {
      animeTitle: d.title || 'Nonton Anime',
      animeSlug,
      episodeNumber: parseEpisodeNum(d.title || slug),
      title: d.title || 'Episode',
      embedUrl,
      availableServers,
      downloadOptions,
      prevEpisodeSlug: d.prevEpisode?.episodeId || null,
      nextEpisodeSlug: d.nextEpisode?.episodeId || null,
      sourceUrl: d.samehadakuUrl || `https://v2.samehadaku.how/${slug}/`,
    };
  }

  public async getSchedule(priority: RequestPriority = RequestPriority.HIGH): Promise<DaySchedule[]> {
    const data = await fetchSankaApi<any>(`/schedule`, 2, priority);
    const daysArr = data.data?.days || [];

    const dayNameMap: Record<string, string> = {
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Minggu',
    };

    return daysArr.map((d: any) => {
      const dayEng = (d.day || '').toLowerCase();
      const dayName = dayNameMap[dayEng] || d.day || 'Jadwal';
      const animeList = (d.animeList || []).map((a: any) => ({
        slug: a.animeId || a.slug || (a.href ? a.href.split('/').pop() : ''),
        title: a.title,
        thumbnail: a.poster || '',
        episode: a.episodes || 'Episode Baru',
        time: a.releasedOn || a.time || a.estimation || '',
        type: a.type || 'TV',
      }));

      return {
        day: dayName,
        anime: animeList,
      };
    });
  }
}
