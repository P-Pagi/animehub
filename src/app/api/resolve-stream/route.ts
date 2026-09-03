import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// In-memory cache: embed URL → resolved stream URL (8 min TTL)
const streamCache = new Map<string, { url: string; type: 'hls' | 'mp4'; expiresAt: number }>();

export async function GET(req: NextRequest) {
  const embedUrl = req.nextUrl.searchParams.get('url');

  if (!embedUrl) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const cached = streamCache.get(embedUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ videoUrl: cached.url, type: cached.type });
  }

  try {
    // ── Wibufile embed: extract direct m3u8 / mp4 ──
    if (embedUrl.includes('wibufile.com') || embedUrl.includes('wibufil')) {
      const result = await resolveWibufile(embedUrl);
      if (result) {
        streamCache.set(embedUrl, { ...result, expiresAt: Date.now() + 8 * 60 * 1000 });
        return NextResponse.json({ videoUrl: result.url, type: result.type });
      }
    }

    // ── Other direct stream URL (already mp4/m3u8) ──
    if (embedUrl.endsWith('.mp4') || embedUrl.endsWith('.m3u8') || embedUrl.includes('.m3u8?')) {
      return NextResponse.json({ videoUrl: embedUrl, type: embedUrl.includes('m3u8') ? 'hls' : 'mp4' });
    }

    return NextResponse.json({ error: 'Unsupported embed URL' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve stream' }, { status: 500 });
  }
}

async function resolveWibufile(embedUrl: string): Promise<{ url: string; type: 'hls' | 'mp4' } | null> {
  try {
    const res = await axios.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
        Referer: 'https://wibufile.com/',
      },
      timeout: 10000,
    });

    const html: string = res.data;

    // Pattern 1: HLS m3u8 sources in script or source tags
    const m3u8Match = html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/);
    if (m3u8Match) return { url: m3u8Match[1], type: 'hls' };

    // Pattern 2: Direct mp4
    const mp4Match = html.match(/["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/);
    if (mp4Match) return { url: mp4Match[1], type: 'mp4' };

    // Pattern 3: JSON source config {"src":"..."}
    const srcMatch = html.match(/"src"\s*:\s*"(https?:\/\/[^"]+)"/);
    if (srcMatch) {
      const url = srcMatch[1].replace(/\\/g, '');
      const type = url.includes('m3u8') ? 'hls' : 'mp4';
      return { url, type };
    }

    // Pattern 4: file: "..." (JWPlayer style)
    const fileMatch = html.match(/file\s*:\s*["'](https?:\/\/[^"']+)["']/);
    if (fileMatch) {
      const url = fileMatch[1];
      const type = url.includes('m3u8') ? 'hls' : 'mp4';
      return { url, type };
    }

    return null;
  } catch {
    return null;
  }
}
