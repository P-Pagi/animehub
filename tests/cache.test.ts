import { describe, it, expect, vi } from 'vitest';
import { cache } from '../src/lib/cache/cache';

describe('Cache Service & Request Deduplication Unit Tests', () => {
  it('should set and get values from cache correctly', async () => {
    const key = 'test:key:1';
    const data = { title: 'Naruto', episodes: 220 };

    await cache.set(key, data, 60);
    const retrieved = await cache.get<typeof data>(key);

    expect(retrieved).toEqual(data);
  });

  it('should return null for non-existent key', async () => {
    const retrieved = await cache.get('non:existent:key');
    expect(retrieved).toBeNull();
  });

  it('should deduplicate simultaneous requests for the same key', async () => {
    const key = 'test:dedupe:key';
    const mockFn = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { result: 'success' };
    });

    const [res1, res2, res3] = await Promise.all([
      cache.dedupe(key, mockFn),
      cache.dedupe(key, mockFn),
      cache.dedupe(key, mockFn),
    ]);

    expect(res1).toEqual({ result: 'success' });
    expect(res2).toEqual({ result: 'success' });
    expect(res3).toEqual({ result: 'success' });

    // The fetch function should only have been called ONCE!
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
