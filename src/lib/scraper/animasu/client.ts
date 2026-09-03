import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '@/lib/utils/logger';
import { AppError } from '@/lib/utils/errors';
import { validateAllowedUrl } from '@/lib/utils/sanitizer';

// List of realistic User-Agent rotation pool to look like legitimate browser sessions
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

export class AnimasuClient {
  private client: AxiosInstance;
  public readonly baseUrl: string;
  private lastRequestTime = 0;
  private minDelayMs = 400; // Minimum delay between outgoing HTTP requests to target server

  constructor() {
    this.baseUrl = process.env.ANIME_SOURCE_URL || 'https://animasu.love';
    const timeout = parseInt(process.env.REQUEST_TIMEOUT || '20000', 10);

    // Support optional HTTP/HTTPS Proxy override from environment variable if IP is blocked
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    let proxyConfig = undefined;
    if (proxyUrl) {
      try {
        const parsed = new URL(proxyUrl);
        proxyConfig = {
          host: parsed.hostname,
          port: parseInt(parsed.port || '8080', 10),
          protocol: parsed.protocol.replace(':', ''),
        };
      } catch {
        // Ignore invalid proxy url format
      }
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      proxy: proxyConfig,
    });
  }

  /**
   * Polite Rate-Limiter: Ensures outgoing requests are throttled with human-like jitter delay
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    // Add 400ms - 800ms randomized jitter delay
    const jitter = Math.floor(Math.random() * 400);
    const requiredWait = this.minDelayMs + jitter;

    if (elapsed < requiredWait) {
      const sleepMs = requiredWait - elapsed;
      await new Promise((res) => setTimeout(res, sleepMs));
    }
    this.lastRequestTime = Date.now();
  }

  private getRandomUserAgent(): string {
    const idx = Math.floor(Math.random() * USER_AGENTS.length);
    return USER_AGENTS[idx];
  }

  public async fetchHtml(pathOrUrl: string, retries = 2): Promise<string> {
    const fullUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`;
    validateAllowedUrl(fullUrl);

    logger.scraper(`Fetching HTML from: ${fullUrl}`);

    let lastError: any = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Enforce rate throttle & jitter delay
        await this.throttle();

        if (attempt > 0) {
          logger.scraper(`Retry attempt ${attempt} for: ${fullUrl}`);
          const backoff = 1500 * attempt + Math.floor(Math.random() * 500);
          await new Promise((res) => setTimeout(res, backoff));
        }

        const headers = {
          'User-Agent': this.getRandomUserAgent(),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          Referer: `${this.baseUrl}/`,
        };

        const response = await this.client.get(pathOrUrl, {
          headers,
          responseType: 'text',
        });

        if (!response.data || typeof response.data !== 'string') {
          throw new AppError('PARSING_ERROR', 'Received empty or non-string response from source', 500);
        }

        logger.scraper(`Successfully fetched HTML (${response.data.length} bytes)`);
        return response.data;
      } catch (err) {
        lastError = err;
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 404) {
            // Don't retry 404
            throw new AppError('NOT_FOUND', 'Requested anime or episode was not found on source site.', 404);
          }
        }
      }
    }

    // Handle final attempt failure
    if (axios.isAxiosError(lastError)) {
      const error = lastError as AxiosError;
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        logger.source('TIMEOUT', fullUrl);
        throw new AppError('TIMEOUT', 'Anime source request timed out.', 504);
      }

      if (error.response) {
        const status = error.response.status;
        logger.source(`${status}`, fullUrl);

        if (status === 403) {
          throw new AppError('SOURCE_UNAVAILABLE', 'Access to anime source was forbidden (403).', 503);
        }
        if (status === 429) {
          throw new AppError('RATE_LIMITED', 'Rate limited by target anime source (429).', 429);
        }
        if (status >= 500) {
          throw new AppError('SOURCE_UNAVAILABLE', `Anime source internal server error (${status}).`, 502);
        }
      }
    }

    logger.error('SCRAPER', `Failed to fetch HTML from ${fullUrl}`, lastError);
    throw new AppError('SOURCE_UNAVAILABLE', 'Unable to reach anime source site.', 503);
  }
}
