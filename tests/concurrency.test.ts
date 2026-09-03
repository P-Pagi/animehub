import { describe, it, expect, beforeEach } from 'vitest';
import { cache } from '../src/lib/cache/cache';

describe('High-Concurrency & Load Stampede Benchmark', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await cache.del('animasu:popular:1');
    await cache.del('animasu:latest:1');
    await cache.del('test:concurrency:popular');
    await cache.del('test:cached:key');
  });

  it('should handle 1,000 SIMULTANEOUS concurrent requests with EXACTLY 1 upstream scrape call', async () => {
    let mockScrapeCount = 0;

    const mockFetchData = async () => {
      mockScrapeCount++;
      // Simulate 150ms network delay from animasu.love
      await new Promise((res) => setTimeout(res, 150));
      return {
        anime: [
          {
            id: 'one-piece',
            slug: 'one-piece',
            title: 'One Piece',
            sourceUrl: 'https://animasu.love/anime/one-piece/',
          },
        ],
        hasNextPage: true,
      };
    };

    const CONCURRENT_USERS = 1000;
    const startTime = Date.now();

    // Fire 1,000 promises in PARALLEL at the exact same millisecond
    const userPromises = Array.from({ length: CONCURRENT_USERS }).map(() =>
      cache.fetchWithSWR('test:concurrency:popular', 300, mockFetchData)
    );

    const results = await Promise.all(userPromises);
    const durationMs = Date.now() - startTime;

    // VERIFICATIONS:
    // 1. All 1,000 users must get the valid data
    expect(results.length).toBe(CONCURRENT_USERS);
    expect(results[0].anime[0].title).toBe('One Piece');

    // 2. CRITICAL: The upstream source website MUST only receive EXACTLY 1 request!
    expect(mockScrapeCount).toBe(1);

    // 3. Execution time should be close to single-request time (~150ms), NOT 1,000 * 150ms (150 seconds)!
    console.log(`\n🚀 [BENCHMARK RESULT] 1,000 Simultaneous Users Served in ${durationMs}ms`);
    console.log(`📊 Upstream Scrapes Triggered: ${mockScrapeCount} (Deduplication Efficiency: 99.9%)\n`);

    expect(durationMs).toBeLessThan(1000);
  });

  it('should serve 5,000 cached requests in < 300ms with 0ms source latency', async () => {
    // Warm up cache
    await cache.set('test:cached:key', { title: 'Anime Data' }, 300);

    const CONCURRENT_USERS = 5000;
    const startTime = Date.now();

    const userPromises = Array.from({ length: CONCURRENT_USERS }).map(() =>
      cache.get<{ title: string }>('test:cached:key')
    );

    const results = await Promise.all(userPromises);
    const durationMs = Date.now() - startTime;

    expect(results.length).toBe(CONCURRENT_USERS);
    expect(results[0]?.title).toBe('Anime Data');

    console.log(`\n⚡ [CACHE BENCHMARK] 5,000 Concurrent Cached Requests Served in ${durationMs}ms (${(durationMs / CONCURRENT_USERS).toFixed(3)}ms / request)\n`);

    expect(durationMs).toBeLessThan(300);
  });
});
