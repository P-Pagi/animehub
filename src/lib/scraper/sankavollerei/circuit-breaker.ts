import { logger } from '@/lib/utils/logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker for Samehadaku API.
 *
 * CLOSED  → Normal operation, requests pass through.
 * OPEN    → Tripped by 429/403. All requests blocked for 90s, returns null immediately.
 * HALF_OPEN → After 90s, allows ONE probe request to check if API recovered.
 *
 * This prevents retry storms that multiply a single 429 into 12+ requests.
 */
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private openedAt = 0;
  private readonly cooldownMs: number;

  constructor(cooldownMs = 90000) { // 90 second cooldown
    this.cooldownMs = cooldownMs;
  }

  public isOpen(): boolean {
    if (this.state === 'CLOSED') return false;

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
        logger.scraper('[CircuitBreaker] → HALF_OPEN: Allowing probe request after cooldown.');
        return false; // Allow one probe through
      }
      const remaining = Math.ceil((this.cooldownMs - elapsed) / 1000);
      logger.scraper(`[CircuitBreaker] OPEN — blocking request. Cooldown: ${remaining}s remaining.`);
      return true; // Block
    }

    // HALF_OPEN: allow probe through (will be tripped again if it fails)
    return false;
  }

  public trip() {
    if (this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      logger.scraper('[CircuitBreaker] → OPEN: Samehadaku API rate limited. All requests blocked for 90s.');
    }
  }

  public success() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.scraper('[CircuitBreaker] → CLOSED: API recovered, normal operation resumed.');
    }
  }

  public getState(): CircuitState {
    return this.state;
  }
}

// Persist on global to survive Next.js hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __animehub_circuit_breaker: CircuitBreaker | undefined;
}

if (!global.__animehub_circuit_breaker) {
  global.__animehub_circuit_breaker = new CircuitBreaker(90000);
}

export const circuitBreaker = global.__animehub_circuit_breaker;
