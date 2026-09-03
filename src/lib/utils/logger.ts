type LogCategory = 'SCRAPER' | 'CACHE' | 'SOURCE' | 'API' | 'SERVICE';

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private log(category: LogCategory, message: string, details?: unknown) {
    if (!this.isDevelopment && process.env.LOG_LEVEL !== 'debug') return;

    const timestamp = new Date().toISOString().substring(11, 19);
    const prefix = `[${timestamp}] [${category}]`;

    if (details !== undefined) {
      const sanitizedDetails = this.sanitize(details);
      console.log(`${prefix} ${message}`, sanitizedDetails);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  public scraper(message: string, details?: unknown) {
    this.log('SCRAPER', message, details);
  }

  public cache(message: string, details?: unknown) {
    this.log('CACHE', message, details);
  }

  public source(message: string, details?: unknown) {
    this.log('SOURCE', message, details);
  }

  public api(message: string, details?: unknown) {
    this.log('API', message, details);
  }

  public error(category: LogCategory, message: string, error?: unknown) {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.error(`[${timestamp}] [${category}] ERROR: ${message}`, error ? this.sanitize(error) : '');
  }

  private sanitize(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;

    const copy = Array.isArray(obj) ? [...obj] : { ...(obj as Record<string, unknown>) };

    const sensitiveKeys = ['cookie', 'authorization', 'token', 'auth', 'password', 'secret'];
    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        (copy as Record<string, unknown>)[key] = '[REDACTED]';
      }
    }

    return copy;
  }
}

export const logger = new Logger();
