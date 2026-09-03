'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, Send, Copy, Check, LogOut, MessageSquare, Play, Pause, Sparkles, AlertCircle, Crown, Lock, Unlock, Eye, EyeOff, HousePlus, LockKeyhole, Plus } from 'lucide-react';
import { AuthModal } from './auth-modal';

interface NobarUser {
  id: string;
  name: string;
  image?: string;
  isHost: boolean;
}

interface NobarMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

interface NobarRoomData {
  code: string;
  slug: string;
  title: string;
  isPrivate?: boolean;
  pin?: string;
  users: NobarUser[];
  messages: NobarMessage[];
  playbackState?: {
    isPlaying: boolean;
    currentTime: number;
    activeServerUrl?: string;
    updatedBy: string;
    lastSyncAt: number;
  };
}

interface NobarRoomProps {
  slug: string;
  animeTitle: string;
  episodeTitle: string;
  availableServers?: { name: string; url: string }[];
  embedUrl?: string;
}

const canResolveNative = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('wibufile.com') ||
    url.includes('wibufil') ||
    url.endsWith('.mp4') ||
    url.endsWith('.m3u8') ||
    url.includes('.m3u8?')
  );
};

export function NobarRoom({ slug, animeTitle, episodeTitle, availableServers = [], embedUrl }: NobarRoomProps) {
  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);

  // Check if current episode has at least 1 server supporting Nobar Host Sync
  const hasSyncableServer =
    availableServers.length > 0
      ? availableServers.some((s) => canResolveNative(s.url)) || canResolveNative(embedUrl)
      : canResolveNative(embedUrl);

  const [room, setRoom] = useState<NobarRoomData | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // PIN Lock state
  const [createPin, setCreatePin] = useState('');
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showCreatePinInput, setShowCreatePinInput] = useState(false);
  const [joinPinInput, setJoinPinInput] = useState('');
  const [showJoinPin, setShowJoinPin] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Track last sync timestamp to detect new sync events from server
  const lastSyncAtRef = useRef<number>(0);
  // Ref to always-fresh room + currentUser (for event listener closures)
  const roomRef = useRef<NobarRoomData | null>(null);
  const currentUserRef = useRef<any>(null);
  const isLeavingRef = useRef<boolean>(false);

  const searchParams = useSearchParams();
  const urlNobarCode = searchParams?.get('nobar');

  // Sync current user state from session or localStorage
  useEffect(() => {
    let u: any = null;
    if (session?.user) {
      u = {
        id: (session.user as any).id || session.user.email,
        name: session.user.name || 'User',
        image: session.user.image,
      };
    } else if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('animehub_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          u = { id: parsed.id || parsed.email, name: parsed.name || 'User', image: parsed.image };
        } catch { }
      }
    }
    setCurrentUser(u);
  }, [session]);

  // Helper to remove ?nobar=CODE from URL without reloading page
  const removeNobarUrlParam = () => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('nobar')) {
      currentUrl.searchParams.delete('nobar');
      window.history.pushState({}, '', currentUrl.toString());
    }
    window.dispatchEvent(new CustomEvent('nobar-room-status-changed', { detail: { active: false, code: null, isHost: false } }));
    window.dispatchEvent(new CustomEvent('nobar-room-data-updated', { detail: { room: null, messages: [], users: [], code: null } }));
  };

  const [mounted, setMounted] = useState(false);
  const [isVipUser, setIsVipUser] = useState(false);

  useEffect(() => {
    setMounted(true);
    const localPremium = localStorage.getItem('animehub_is_premium') === 'true';
    const localUser = localStorage.getItem('animehub_user');
    let userObjPremium = false;
    try {
      if (localUser) {
        userObjPremium = JSON.parse(localUser).isPremium === true;
      }
    } catch { }
    const sessionPremium = (session?.user as any)?.isPremium === true;
    setIsVipUser(localPremium || userObjPremium || sessionPremium);
  }, [session]);

  // Auto join room if redirected from Join Nobar Modal with ?nobar=CODE
  useEffect(() => {
    if (!urlNobarCode || room || !currentUser) return;
    if (!isVipUser) {
      window.dispatchEvent(new CustomEvent('open-premium-modal'));
      removeNobarUrlParam();
      return;
    }
    const autoJoin = async () => {
      try {
        const res = await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            code: urlNobarCode.toUpperCase(),
            user: currentUser,
          }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          isLeavingRef.current = false;
          setRoom(data.room);
          const isHost = data.room.users.find((u: any) => u.id === currentUser.id)?.isHost || false;
          window.dispatchEvent(new CustomEvent('nobar-room-status-changed', { detail: { active: true, code: data.room.code, isHost } }));
          // Immediately sync server to what Host is using
          const serverUrl = data.room.playbackState?.activeServerUrl;
          if (serverUrl) {
            window.dispatchEvent(new CustomEvent('nobar-server-change', { detail: { serverUrl } }));
          }
        } else if (data.error) {
          setErrorMsg(data.error);
          removeNobarUrlParam();
        }
      } catch {
        setErrorMsg('Gagal bergabung ke room.');
        removeNobarUrlParam();
      }
    };
    autoJoin();
  }, [urlNobarCode, currentUser, isVipUser]);

  // Keep refs fresh so event listeners always see latest values
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ── Real-time SSE Stream (Instant 0.1s latency) + Fallback Polling ──
  useEffect(() => {
    if (!room?.code || !currentUser) return;

    // 1. Establish real-time EventSource connection
    const es = new EventSource(`/api/nobar/sse?code=${encodeURIComponent(room.code)}`);

    es.onmessage = (event) => {
      if (isLeavingRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.room) {
          const isStillInRoom = data.room.users.some(
            (u: any) => u.id === currentUser.id || u.email === currentUser.email
          );
          if (isStillInRoom) {
            setRoom(data.room);
          } else {
            setRoom(null);
            removeNobarUrlParam();
          }
        }
      } catch { }
    };

    // 2. Backup polling every 4s (in case SSE drops)
    const interval = setInterval(async () => {
      if (isLeavingRef.current) return;
      try {
        const res = await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'poll', code: room.code, user: currentUser }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          const isStillInRoom = data.room.users.some(
            (u: any) => u.id === currentUser.id || u.email === currentUser.email
          );
          if (isStillInRoom && !isLeavingRef.current) {
            setRoom(data.room);
          } else {
            setRoom(null);
            removeNobarUrlParam();
          }
        }
      } catch { }
    }, 4000);

    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [room?.code, currentUser?.id]);

  // Dispatch room data (messages & users) to VideoPlayer so Fullscreen Live Chat & Unread Badge work
  useEffect(() => {
    if (room) {
      window.dispatchEvent(
        new CustomEvent('nobar-room-data-updated', {
          detail: {
            room,
            messages: room.messages,
            users: room.users,
            code: room.code,
          },
        })
      );
    }
  }, [room]);

  // ── VIEWER: Auto-redirect when Host changes Episode/Anime ──
  useEffect(() => {
    if (!room?.slug || !room?.code) return;
    if (slug && room.slug !== slug) {
      // Host navigated to a new episode/anime! Redirect viewer to match Host's room page
      window.location.href = `/watch/${room.slug}?nobar=${room.code}`;
    }
  }, [room?.slug, room?.code, slug]);

  // ── VIEWER: Dispatch sync command to native video player when host changes playback ──
  useEffect(() => {
    if (!room?.playbackState || !currentUser) return;
    const ps = room.playbackState;
    const isHost = room.users.find((u) => u.id === currentUser.id)?.isHost;
    if (isHost) return; // Host controls, never receives commands

    if (ps.lastSyncAt !== lastSyncAtRef.current) {
      lastSyncAtRef.current = ps.lastSyncAt;
      // Sync playback state (play/pause/seek)
      window.dispatchEvent(
        new CustomEvent('nobar-sync-command', {
          detail: { isPlaying: ps.isPlaying, currentTime: ps.currentTime },
        })
      );
      // Sync server selection if Host changed it
      if (ps.activeServerUrl) {
        window.dispatchEvent(
          new CustomEvent('nobar-server-change', {
            detail: { serverUrl: ps.activeServerUrl },
          })
        );
      }
    }
  }, [room?.playbackState, currentUser]);

  // Listen for chat messages dispatched from VideoPlayer Fullscreen Drawer
  useEffect(() => {
    const handleSendFromVideo = async (e: Event) => {
      const { text } = (e as CustomEvent).detail as { text: string };
      const r = roomRef.current;
      const u = currentUserRef.current;
      if (!text || !r || !u) return;

      try {
        const res = await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chat',
            code: r.code,
            text,
            user: u,
          }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          setRoom(data.room);
        }
      } catch { }
    };

    window.addEventListener('nobar-send-chat-command', handleSendFromVideo);
    return () => window.removeEventListener('nobar-send-chat-command', handleSendFromVideo);
  }, []);

  // ── HOST: Listen to native video events and auto-sync to server ──
  useEffect(() => {
    if (!room || !currentUser) return;
    const isHost = room.users.find((u) => u.id === currentUser.id)?.isHost;
    if (!isHost) return;

    const handleHostReport = async (e: Event) => {
      const r = roomRef.current;
      const u = currentUserRef.current;
      if (!r || !u) return;
      const { isPlaying, currentTime } = (e as CustomEvent).detail as {
        isPlaying: boolean;
        currentTime: number;
      };
      try {
        await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync',
            code: r.code,
            isPlaying,
            currentTime,
            currentSlug: slug,
            currentTitle: `${animeTitle} - ${episodeTitle}`,
            user: u,
          }),
        });
      } catch { }
    };

    // Host: sync server URL change to room
    const handleHostServerChange = async (e: Event) => {
      const r = roomRef.current;
      const u = currentUserRef.current;
      if (!r || !u) return;
      const { serverUrl } = (e as CustomEvent).detail as { serverUrl: string };
      try {
        const video = document.querySelector('video') as HTMLVideoElement | null;
        await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync',
            code: r.code,
            isPlaying: video ? !video.paused : false,
            currentTime: video ? video.currentTime : 0,
            activeServerUrl: serverUrl,
            currentSlug: slug,
            currentTitle: `${animeTitle} - ${episodeTitle}`,
            user: u,
          }),
        });
      } catch { }
    };

    window.addEventListener('nobar-host-report', handleHostReport);
    window.addEventListener('nobar-host-server-change', handleHostServerChange);
    return () => {
      window.removeEventListener('nobar-host-report', handleHostReport);
      window.removeEventListener('nobar-host-server-change', handleHostServerChange);
    };
  }, [room?.users, currentUser?.id]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [room?.messages]);

  const requireAuth = (callback: () => void) => {
    if (!currentUser) {
      setAuthOpen(true);
      return;
    }
    if (!isVipUser) {
      window.dispatchEvent(new CustomEvent('open-premium-modal'));
      return;
    }
    callback();
  };

  // Broadcast user role whenever room users change
  useEffect(() => {
    if (!room || !currentUser) return;
    const isHost = room.users.find((u) => u.id === currentUser.id)?.isHost || false;
    window.dispatchEvent(new CustomEvent('nobar-user-role', { detail: { isHost } }));
  }, [room?.users, currentUser?.id]);

  const handleCreateRoom = () => {
    requireAuth(async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            slug,
            title: `${animeTitle} - ${episodeTitle}`,
            user: currentUser,
            pin: createPin.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          isLeavingRef.current = false;
          setRoom(data.room);
          setCreatePin('');
          setShowCreatePinInput(false);
          // Append ?nobar=CODE to URL and dispatch event so VideoPlayer updates immediately
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('nobar', data.room.code);
          window.history.pushState({}, '', currentUrl.toString());
          window.dispatchEvent(new CustomEvent('nobar-room-status-changed', { detail: { active: true, code: data.room.code, isHost: true } }));
        } else {
          setErrorMsg(data.error || 'Gagal membuat room Nobar.');
        }
      } catch {
        setErrorMsg('Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    requireAuth(async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            code: inputCode.trim(),
            user: currentUser,
          }),
        });
        const data = await res.json();
        if (data.success) {
          isLeavingRef.current = false;
          setRoom(data.room);
          setInputCode('');
          setRequiresPin(false);
          setPendingJoinCode('');
          setJoinPinInput('');
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('nobar', data.room.code);
          window.history.pushState({}, '', currentUrl.toString());
          const isHost = data.room.users.find((u: any) => u.id === currentUser.id)?.isHost || false;
          window.dispatchEvent(new CustomEvent('nobar-room-status-changed', { detail: { active: true, code: data.room.code, isHost } }));
        } else if (data.requiresPin) {
          setRequiresPin(true);
          setPendingJoinCode(inputCode.trim());
          setErrorMsg(data.error);
        } else {
          setErrorMsg(data.error || 'Gagal bergabung ke room.');
        }
      } catch {
        setErrorMsg('Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleJoinWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPinInput.trim() || !pendingJoinCode) return;

    requireAuth(async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/nobar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            code: pendingJoinCode,
            pin: joinPinInput.trim(),
            user: currentUser,
          }),
        });
        const data = await res.json();
        if (data.success) {
          isLeavingRef.current = false;
          setRoom(data.room);
          setInputCode('');
          setRequiresPin(false);
          setPendingJoinCode('');
          setJoinPinInput('');
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('nobar', data.room.code);
          window.history.pushState({}, '', currentUrl.toString());
          const isHost = data.room.users.find((u: any) => u.id === currentUser.id)?.isHost || false;
          window.dispatchEvent(new CustomEvent('nobar-room-status-changed', { detail: { active: true, code: data.room.code, isHost } }));
        } else {
          setErrorMsg(data.error || 'PIN salah, coba lagi.');
        }
      } catch {
        setErrorMsg('Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !room || !currentUser) return;

    const msg = chatText.trim();
    setChatText('');
    try {
      const res = await fetch('/api/nobar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          code: room.code,
          text: msg,
          user: currentUser,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoom(data.room);
      }
    } catch { }
  };

  const handleLeaveRoom = async () => {
    if (!room || !currentUser) return;
    const roomCode = room.code;
    isLeavingRef.current = true;
    setRoom(null);
    setErrorMsg(null);
    removeNobarUrlParam();
    try {
      await fetch('/api/nobar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', code: roomCode, user: currentUser }),
      });
    } catch { }
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold text-white">Nonton Bareng</h3>
            <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
              Beta
            </span>
          </div>

          {room && (
            <button
              onClick={handleLeaveRoom}
              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                removeNobarUrlParam();
              }}
              className="text-red-400 hover:text-red-300 text-xs font-medium underline shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* STATE 0: Hydration safe placeholder until mounted */}
        {!mounted ? (
          <div className="py-2 flex items-center justify-between gap-3 text-xs animate-pulse">
            <div className="h-4 w-48 rounded bg-neutral-800" />
            <div className="h-8 w-24 rounded-xl bg-neutral-800" />
          </div>
        ) : !isVipUser ? (
          <div className="py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-white">Fitur Nobar khusus pengguna VIP</p>
              <p className="text-neutral-400 leading-relaxed">
                Nonton anime bersama teman secara real-time dengan berlangganan VIP Rp 3rb/bulan.
              </p>
            </div>
            <button
              onClick={() => {
                if (!currentUser) {
                  setAuthOpen(true);
                } else {
                  window.dispatchEvent(new CustomEvent('open-premium-modal'));
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold shrink-0 transition-colors"
            >
              Upgrade VIP
            </button>
          </div>
        ) : !hasSyncableServer && !room ? (
          /* STATE 1: Nobar not available for this episode */
          <div className="py-2 text-xs text-neutral-400 leading-relaxed">
            Nobar tidak tersedia untuk episode ini karena belum ada server video yang mendukung kontrol Host (Sync).
          </div>
        ) : !room ? (
          /* STATE 2: Balanced Control Bar for Creating or Joining Room */
          <div className="space-y-3 pt-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              {/* Left Column: Create Room */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <HousePlus className="w-3.5 h-3.5 text-amber-400" />
                    Buat Room Baru
                  </span>
                  <button
                    type="button"
                    onClick={() => { setShowCreatePinInput((p) => !p); setCreatePin(''); }}
                    className={`text-[11px] font-medium transition-colors flex items-center gap-1 ${showCreatePinInput ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'}`}
                  >
                    {showCreatePinInput ? <LockKeyhole className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>PIN Lock</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading || (showCreatePinInput && createPin.length > 0 && createPin.length < 4)}
                    className="flex-1 py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{loading ? 'Memproses...' : 'Buat Room Host'}</span>
                  </button>

                  {showCreatePinInput && (
                    <div className="relative w-28">
                      <input
                        type={showCreatePin ? 'text' : 'password'}
                        placeholder="PIN"
                        value={createPin}
                        maxLength={4}
                        onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-2.5 py-2 pr-7 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono text-center placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePin((p) => !p)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                      >
                        {showCreatePin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Divider */}
              <div className="hidden md:block w-px h-12 bg-neutral-800 shrink-0 mx-1" />

              {/* Right Column: Join Room */}
              <div className="flex-1 space-y-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Gabung Kode Room
                </span>

                {!requiresPin ? (
                  <form onSubmit={handleJoinRoom} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Kode Room (Contoh: NOBAR-X82A1)"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono uppercase placeholder:text-neutral-600 placeholder:normal-case focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loading || !inputCode.trim()}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                    >
                      Gabung
                    </button>
                  </form>
                ) : (
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type={showJoinPin ? 'text' : 'password'}
                        placeholder="4 Digit PIN"
                        value={joinPinInput}
                        maxLength={4}
                        autoFocus
                        onChange={(e) => setJoinPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 pr-7 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono text-center placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowJoinPin((p) => !p)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                      >
                        {showJoinPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      onClick={handleJoinWithPin}
                      disabled={loading || joinPinInput.length !== 4}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
                    >
                      Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRequiresPin(false); setPendingJoinCode(''); setJoinPinInput(''); setErrorMsg(null); }}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          /* STATE 2: Active Room UI */
          <div className="space-y-4">
            {/* Room Info Bar & Host Playback Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-black">
                  <span>KODE: {room.code}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 hover:text-white transition-colors"
                    title="Salin Kode"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {room.isPrivate && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-[10px] font-bold">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-500">Private</span>
                    {room.pin && <span className="text-neutral-500">• {room.pin}</span>}
                  </div>
                )}
                <span className="text-[11px] text-neutral-400 font-medium">
                  {copied ? 'Kode disalin ke clipboard!' : 'Bagikan kode ini ke teman'}
                </span>
              </div>

              {/* Participant List Avatars */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-400">Peserta ({room.users.length}/5):</span>
                <div className="flex items-center -space-x-2">
                  {room.users.map((u) => (
                    <div
                      key={u.id}
                      className="relative inline-block w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border-2 border-neutral-900 flex items-center justify-center text-xs font-black shrink-0"
                      title={`${u.name} ${u.isHost ? '(Host)' : ''}`}
                    >
                      {u.image ? (
                        <img src={u.image} alt={u.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        u.name[0].toUpperCase()
                      )}
                      {u.isHost && (
                        <span title="Host Room" className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-neutral-950 border border-amber-500/60 flex items-center justify-center shadow-md">
                          <Crown className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Playback Synchronizer Control Strip */}
            {(() => {
              const isHost = room.users.find((u) => u.id === currentUser?.id)?.isHost;
              return (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                        <Crown className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Kontrol Watch Party</span>
                          {isHost ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-neutral-950 text-[9px] font-black uppercase">Anda Host</span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 text-[9px] font-bold">Penonton</span>
                          )}
                        </p>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <span>Status:</span>
                          {room.playbackState ? (
                            room.playbackState.isPlaying ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                                <Play className="w-3 h-3 fill-current" /> Diputar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                                <Pause className="w-3 h-3 fill-current" /> Dijeda
                              </span>
                            )
                          ) : (
                            <span>{isHost ? 'Anda adalah Host. Gunakan tombol untuk mengontrol video.' : 'Menunggu Host memutar video.'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isHost ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            if (!currentUser) return;
                            await fetch('/api/nobar', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'sync',
                                code: room.code,
                                isPlaying: true,
                                currentTime: 0,
                                user: currentUser,
                              }),
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Putar (Host)</span>
                        </button>

                        <button
                          onClick={async () => {
                            if (!currentUser) return;
                            await fetch('/api/nobar', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'sync',
                                code: room.code,
                                isPlaying: false,
                                currentTime: 0,
                                user: currentUser,
                              }),
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current text-neutral-400" />
                          <span>Jeda</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!room.playbackState) return;
                            window.dispatchEvent(
                              new CustomEvent('nobar-sync-command', {
                                detail: {
                                  isPlaying: room.playbackState.isPlaying,
                                  currentTime: room.playbackState.currentTime,
                                },
                              })
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Sinkronkan Pemutar Saya</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Transfer Host Control Dropdown (Visible only to Host when participants > 1) */}
                  {isHost && room.users.length > 1 && (
                    <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Serahkan Hak Host:</span>
                      <div className="flex items-center gap-1.5">
                        {room.users.filter(u => u.id !== currentUser?.id).map(target => (
                          <button
                            key={target.id}
                            onClick={async () => {
                              await fetch('/api/nobar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'transferHost',
                                  code: room.code,
                                  targetUserId: target.id,
                                  user: currentUser,
                                }),
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-amber-400 hover:text-neutral-950 border border-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Crown className="w-3 h-3 text-amber-400 fill-current shrink-0" />
                            <span>Serahkan ke {target.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Live Chat Box */}
            <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden flex flex-col h-64">
              <div className="px-4 py-2.5 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center gap-2 text-xs font-bold text-neutral-300">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Chat Room</span>
              </div>

              <div ref={chatContainerRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 custom-scrollbar text-xs">
                {room.messages.map((m) => {
                  const isSys = m.userId === 'system';
                  const isMe = m.userId === currentUser?.id;

                  if (isSys) {
                    return (
                      <div key={m.id} className="text-center my-1 text-[10px] text-neutral-500 italic">
                        {m.text}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-neutral-500 font-bold mb-0.5">{m.userName}</span>
                      <div
                        className={`px-3 py-1.5 rounded-2xl max-w-[80%] break-words ${isMe
                          ? 'bg-amber-400 text-neutral-950 font-medium rounded-tr-none'
                          : 'bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-tl-none'
                          }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-2 border-t border-neutral-800/80 bg-neutral-900/40 flex gap-2">
                <input
                  type="text"
                  placeholder="Tulis pesan obrolan..."
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatText.trim()}
                  className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-all disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
