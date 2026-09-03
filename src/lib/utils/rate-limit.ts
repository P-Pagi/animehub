import { AppError } from './errors';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitStore>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 300000);

export function checkRateLimit(
  _ip: string = '127.0.0.1',
  _limit: number = 1000,
  _windowMs: number = 60000,
): void {
  // Disables local server rate limiting so user in-app navigation & Nobar sync are never blocked locally.
  return;
}
