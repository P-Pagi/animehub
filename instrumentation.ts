/**
 * Next.js Instrumentation Hook
 * Runs once on server startup (both dev and production).
 * Used to trigger cache warm-up before the first user request.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warmCache } = await import('@/lib/cache/warmer');
    warmCache(); // Fire and forget — non-blocking startup warm-up
  }
}
