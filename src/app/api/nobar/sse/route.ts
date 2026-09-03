import { NextRequest } from 'next/server';
import { subscribers } from '@/lib/nobar-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase();

  if (!code) {
    return new Response('Room code missing', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch {}
      };

      if (!subscribers.has(code)) {
        subscribers.set(code, new Set());
      }
      const roomSubs = subscribers.get(code)!;
      roomSubs.add(send);

      send(`: connected\n\n`);

      req.signal.addEventListener('abort', () => {
        roomSubs.delete(send);
        if (roomSubs.size === 0) {
          subscribers.delete(code);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
