import { NextRequest, NextResponse } from 'next/server';
import { broadcastToRoom } from '@/lib/nobar-events';
import { prisma } from '@/lib/db/prisma';

interface NobarUser {
  id: string;
  name: string;
  image?: string;
  isHost: boolean;
  joinedAt: number;
}

interface NobarMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

interface NobarRoom {
  code: string;
  slug: string;
  title: string;
  pin?: string;
  isPrivate?: boolean;
  users: NobarUser[];
  messages: NobarMessage[];
  playbackState?: {
    isPlaying: boolean;
    currentTime: number;
    activeServerUrl?: string;
    updatedBy: string;
    lastSyncAt: number;
  };
  createdAt: number;
  lastActive: number;
}

function formatRoomResponse(room: NobarRoom, userId?: string) {
  const isHost = room.users.some((u) => u.id === userId && u.isHost);
  return {
    ...room,
    pin: isHost ? room.pin : undefined,
    isPrivate: !!room.pin,
  };
}

// Global persistent room store across Next.js HMR / hot-reloads
const globalForNobar = globalThis as unknown as { nobarRooms: Map<string, NobarRoom> };
const nobarRooms = globalForNobar.nobarRooms || new Map<string, NobarRoom>();
if (process.env.NODE_ENV !== 'production') globalForNobar.nobarRooms = nobarRooms;

// Clean up stale rooms (older than 4 hours) every 10 mins
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of nobarRooms.entries()) {
    if (now - room.lastActive > 4 * 3600 * 1000) {
      nobarRooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

// In-memory rate limiter: IP/UserID -> request timestamps array
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string, maxRequests = 120, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) || []).filter((ts) => now - ts < windowMs);
  if (timestamps.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, code, slug, title, user } = body;

    if (!user || !user.id || !user.name) {
      return NextResponse.json({ error: 'Wajib login untuk menggunakan fitur Nobar' }, { status: 401 });
    }

    // STRICT VIP CHECK: Nonton Bareng (Nobar) is 100% restricted to VIP Users only!
    let isVip = false;
    try {
      const userKey = user.id || user.email;
      if (userKey) {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ id: userKey }, { email: userKey }, { email: user.email || '' }],
          },
          select: { isPremium: true, premiumUntil: true },
        });
        if (dbUser && dbUser.isPremium) {
          if (!dbUser.premiumUntil || new Date(dbUser.premiumUntil).getTime() > Date.now()) {
            isVip = true;
          }
        }
      }
    } catch {}

    if (!isVip) {
      return NextResponse.json(
        { error: 'Fitur Watch Party (Nobar) KHUSUS PENGGUNA VIP! Silakan upgrade ke VIP Rp 3rb untuk mengakses Nobar.' },
        { status: 403 }
      );
    }

    // 1. CREATE ROOM
    if (action === 'create') {
      const roomCode = 'NOBAR-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const rawPin = (body.pin || '').toString().trim();
      const pin = rawPin ? rawPin.slice(0, 4) : undefined;

      const newRoom: NobarRoom = {
        code: roomCode,
        slug,
        title,
        pin,
        isPrivate: !!pin,
        users: [{ id: user.id, name: user.name, image: user.image, isHost: true, joinedAt: Date.now() }],
        messages: [{
          id: Math.random().toString(36).substring(2, 9),
          userId: 'system',
          userName: 'System',
          text: `${user.name} telah membuat Room Nobar${pin ? ' (Private 🔒)' : ''}`,
          timestamp: Date.now(),
        }],
        createdAt: Date.now(),
        lastActive: Date.now(),
      };

      nobarRooms.set(roomCode, newRoom);
      return NextResponse.json({ success: true, room: formatRoomResponse(newRoom, user.id) });
    }

    // 2. JOIN ROOM
    if (action === 'join') {
      const cleanCode = (code || '').toUpperCase().trim();
      const room = nobarRooms.get(cleanCode);

      if (!room) {
        return NextResponse.json({ error: 'Kode Room Nobar tidak ditemukan / sudah kadaluwarsa' }, { status: 404 });
      }

      const existingUser = room.users.find((u) => u.id === user.id);

      // PIN Check: If room is private and user is not already in room
      if (room.pin && !existingUser) {
        const inputPin = (body.pin || '').toString().trim();
        if (!inputPin) {
          return NextResponse.json(
            { error: 'Room ini dikunci! Masukkan PIN 4 digit untuk bergabung.', requiresPin: true },
            { status: 403 }
          );
        }
        if (inputPin !== room.pin) {
          return NextResponse.json(
            { error: 'PIN Room salah! Silakan coba lagi.', requiresPin: true },
            { status: 403 }
          );
        }
      }

      // Check max limit 5 users
      if (!existingUser && room.users.length >= 5) {
        return NextResponse.json({ error: 'Room Nobar sudah penuh (Maksimal 5 Peserta)' }, { status: 400 });
      }

      if (!existingUser) {
        room.users.push({
          id: user.id,
          name: user.name,
          image: user.image,
          isHost: false,
          joinedAt: Date.now(),
        });
        room.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          userId: 'system',
          userName: 'System',
          text: `${user.name} bergabung ke room`,
          timestamp: Date.now(),
        });
      }

      room.lastActive = Date.now();
      return NextResponse.json({ success: true, room: formatRoomResponse(room, user.id) });
    }

    // 3. SEND CHAT
    if (action === 'chat') {
      const cleanCode = (code || '').toUpperCase().trim();
      const room = nobarRooms.get(cleanCode);
      if (!room) {
        return NextResponse.json({ error: 'Room tidak ditemukan' }, { status: 404 });
      }

      const text = (body.text || '').trim();
      if (text) {
        room.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          userId: user.id,
          userName: user.name,
          text,
          timestamp: Date.now(),
        });
        // Keep max 50 messages
        if (room.messages.length > 50) room.messages.shift();
      }

      room.lastActive = Date.now();
      return NextResponse.json({ success: true, room: formatRoomResponse(room, user.id) });
    }

    // 4. POLL / GET ROOM STATE
    if (action === 'poll') {
      const cleanCode = (code || '').toUpperCase().trim();
      const room = nobarRooms.get(cleanCode);
      if (!room) {
        return NextResponse.json({ error: 'Room tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, room: formatRoomResponse(room, user.id) });
    }

    // 4b. SYNC PLAYBACK STATE (Host Only)
    if (action === 'sync') {
      const cleanCode = (code || '').toUpperCase().trim();
      const room = nobarRooms.get(cleanCode);
      if (!room) {
        return NextResponse.json({ error: 'Room tidak ditemukan' }, { status: 404 });
      }

      // Ensure user is the current host
      const caller = room.users.find((u) => u.id === user.id);
      if (!caller || !caller.isHost) {
        return NextResponse.json({ error: 'Hanya Host yang dapat mengontrol video' }, { status: 403 });
      }

      const { isPlaying, currentTime, activeServerUrl, currentSlug, currentTitle } = body;
      if (currentSlug && currentSlug !== room.slug) {
        room.slug = currentSlug;
        if (currentTitle) room.title = currentTitle;
      }
      room.playbackState = {
        isPlaying: !!isPlaying,
        currentTime: typeof currentTime === 'number' ? currentTime : 0,
        activeServerUrl: typeof activeServerUrl === 'string' ? activeServerUrl : room.playbackState?.activeServerUrl,
        updatedBy: user.name,
        lastSyncAt: Date.now(),
      };

      const syncMsg = currentSlug && currentSlug !== room.slug
        ? `[Episode] Host (${user.name}) mengalihkan episode ke: ${currentTitle || currentSlug}`
        : activeServerUrl
        ? `[Server] Host (${user.name}) ganti server streaming`
        : `[Playback] Host (${user.name}) ${isPlaying ? 'memutar' : 'menjeda'} video`;
      room.messages.push({
        id: Math.random().toString(36).substring(2, 9),
        userId: 'system',
        userName: 'System',
        text: syncMsg,
        timestamp: Date.now(),
      });
      if (room.messages.length > 50) room.messages.shift();

      room.lastActive = Date.now();
      broadcastToRoom(cleanCode, { type: 'sync', room });
      return NextResponse.json({ success: true, room: formatRoomResponse(room, user.id) });
    }

    // 4c. TRANSFER HOST (Pass control to another participant)
    if (action === 'transferHost') {
      const cleanCode = (code || '').toUpperCase().trim();
      const room = nobarRooms.get(cleanCode);
      if (!room) {
        return NextResponse.json({ error: 'Room tidak ditemukan' }, { status: 404 });
      }

      const caller = room.users.find((u) => u.id === user.id);
      if (!caller || !caller.isHost) {
        return NextResponse.json({ error: 'Hanya Host yang dapat mengalihkan hak Host' }, { status: 403 });
      }

      const targetUserId = body.targetUserId;
      const targetUser = room.users.find((u) => u.id === targetUserId);
      if (!targetUser) {
        return NextResponse.json({ error: 'Peserta tujuan tidak ditemukan' }, { status: 404 });
      }

      room.users.forEach((u) => (u.isHost = u.id === targetUserId));
      room.messages.push({
        id: Math.random().toString(36).substring(2, 9),
        userId: 'system',
        userName: 'System',
        text: `[Host] Hak Host diserahkan kepada ${targetUser.name}`,
        timestamp: Date.now(),
      });

      room.lastActive = Date.now();
      return NextResponse.json({ success: true, room: formatRoomResponse(room, user.id) });
    }

    // 5. LEAVE ROOM
    if (action === 'leave') {
      const cleanCode = (code || '').toUpperCase().trim();
      const room = nobarRooms.get(cleanCode);
      if (room) {
        room.users = room.users.filter((u) => u.id !== user.id);
        room.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          userId: 'system',
          userName: 'System',
          text: `${user.name} meninggalkan room`,
          timestamp: Date.now(),
        });
        if (room.users.length === 0) {
          nobarRooms.delete(cleanCode);
        } else if (!room.users.some((u) => u.isHost)) {
          room.users[0].isHost = true;
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
