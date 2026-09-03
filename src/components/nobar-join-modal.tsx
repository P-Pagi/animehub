'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Users, LogIn, Sparkles, X, ArrowRight, Lock, Eye, EyeOff, Radio, Play, RefreshCw, Crown } from 'lucide-react';
import { AuthModal } from './auth-modal';

interface ActiveRoom {
  code: string;
  slug: string;
  title: string;
  poster?: string;
  isPrivate: boolean;
  participantCount: number;
  maxParticipants: number;
  users?: { id: string; name: string; image?: string; isHost?: boolean }[];
  hostName: string;
  hostImage?: string;
  lastActive: number;
}

export function NobarJoinModal({ mobileIconOnly = false }: { mobileIconOnly?: boolean }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // PIN step state
  const [requiresPin, setRequiresPin] = useState(false);
  const [pendingCode, setPendingCode] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Fetch active public watch party rooms using TanStack Query
  const { data: activeRoomsData, isLoading: isRoomsLoading, refetch: refetchRooms } = useQuery({
    queryKey: ['active-nobar-rooms'],
    queryFn: async () => {
      const res = await fetch('/api/nobar');
      if (!res.ok) return [];
      const json = await res.json();
      return json.success && Array.isArray(json.rooms) ? (json.rooms as ActiveRoom[]) : [];
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 15000 : false, // Lightweight polling every 15s when modal is open
    staleTime: 10000, // Data remains fresh in client cache for 10 seconds
  });

  const activeRooms = activeRoomsData || [];
  const [roomSearch, setRoomSearch] = useState('');

  const filteredRooms = activeRooms.filter((room) => {
    if (!roomSearch.trim()) return true;
    const q = roomSearch.toLowerCase();
    return (
      room.title.toLowerCase().includes(q) ||
      room.code.toLowerCase().includes(q) ||
      room.hostName.toLowerCase().includes(q)
    );
  });

  const handleRandomJoin = () => {
    const availableRooms = activeRooms.filter((r) => !r.isPrivate && r.participantCount < r.maxParticipants);
    if (availableRooms.length === 0) {
      setErrorMsg('Tidak ada room publik yang tersedia untuk dimasuki.');
      return;
    }
    const randomChoice = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    joinTargetRoomCode(randomChoice.code);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getUser = () => {
    if (session?.user) {
      return { id: (session.user as any).id || session.user.email, name: session.user.name || 'User' };
    }
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('animehub_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          return { id: parsed.id || parsed.email, name: parsed.name || 'User' };
        } catch {}
      }
    }
    return null;
  };

  const isVip = () => {
    if (typeof window === 'undefined') return false;
    const localPremium = localStorage.getItem('animehub_is_premium') === 'true';
    const localUser = localStorage.getItem('animehub_user');
    let userObjPremium = false;
    try {
      if (localUser) {
        userObjPremium = JSON.parse(localUser).isPremium === true;
      }
    } catch {}
    const sessionPremium = (session?.user as any)?.isPremium === true;
    return localPremium || userObjPremium || sessionPremium;
  };

  const handleOpen = () => {
    const u = getUser();
    if (!u) {
      setAuthOpen(true);
      return;
    }
    if (!isVip()) {
      window.dispatchEvent(new CustomEvent('open-premium-modal'));
      return;
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setCode('');
    setRequiresPin(false);
    setPendingCode('');
    setPinInput('');
    setErrorMsg(null);
  };

  const joinTargetRoomCode = async (targetCode: string, inputPin?: string) => {
    const user = getUser();
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/nobar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: targetCode,
          user,
          pin: inputPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.room) {
        handleClose();
        router.push(`/watch/${data.room.slug}?nobar=${data.room.code}`);
      } else if (res.status === 403 && data.requiresPin) {
        setRequiresPin(true);
        setPendingCode(targetCode.toUpperCase().trim());
        setErrorMsg(data.error || 'Room ini dikunci dengan PIN!');
      } else {
        setErrorMsg(data.error || 'Gagal bergabung ke room.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    await joinTargetRoomCode(code.trim());
  };

  const handleJoinWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length !== 4) return;
    await joinTargetRoomCode(pendingCode, pinInput);
  };

  return (
    <>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Navbar Button Trigger */}
      <button
        onClick={handleOpen}
        className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center gap-1 sm:gap-1.5 active:scale-95 transition-all shrink-0 shadow-sm"
        title="Gabung Watch Party Nobar"
      >
        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        {!mobileIconOnly && <span className="text-[11px] sm:text-xs">Nobar</span>}
      </button>

      {/* Modal Dialog */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl p-5 sm:p-7 rounded-3xl bg-neutral-900 border border-amber-500/30 space-y-5 relative shadow-2xl my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1">
                {requiresPin ? <Lock className="w-5 h-5" /> : <Radio className="w-5 h-5 animate-pulse text-amber-400" />}
              </div>
              <h3 className="text-lg font-black text-white">
                {requiresPin ? 'Room Private 🔒' : 'Eksplor Watch Party (Nobar)'}
              </h3>
              <p className="text-xs text-neutral-400">
                {requiresPin
                  ? `Masukkan PIN 4 digit untuk room ${pendingCode}`
                  : 'Gabung room orang lain secara acak atau masukkan Kode Room dari Host.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs text-center font-semibold">
                {errorMsg}
              </div>
            )}

            {!requiresPin ? (
              <div className="space-y-5">
                {/* Section 1: Active Public Rooms Explorer */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <Radio className="w-3.5 h-3.5 text-red-500 animate-ping" />
                      <span>Room Nobar Sedang Berlangsung ({activeRooms.length})</span>
                    </div>
                    <button
                      onClick={() => refetchRooms()}
                      className="p-1 text-neutral-400 hover:text-white transition-colors"
                      title="Segarkan Daftar Room"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRoomsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {isRoomsLoading && activeRooms.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                      <RefreshCw className="w-5 h-5 text-amber-400 animate-spin mx-auto" />
                      <p className="text-xs text-neutral-400">Mencari room nobar aktif...</p>
                    </div>
                  ) : activeRooms.length > 0 ? (
                    <div className="space-y-2">
                      {/* Search & Quick Random Join Header for large lists */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Cari judul anime / host / kode..."
                            value={roomSearch}
                            onChange={(e) => setRoomSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
                          />
                          <Sparkles className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <button
                          type="button"
                          onClick={handleRandomJoin}
                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-[11px] flex items-center gap-1 shadow-md shrink-0 active:scale-95 transition-all"
                          title="Gabung Room Acak Sekarang"
                        >
                          <Sparkles className="w-3 h-3 fill-current" />
                          <span>Acak!</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredRooms.length > 0 ? (
                          filteredRooms.map((room) => (
                            <div
                              key={room.code}
                              className="group relative rounded-2xl bg-neutral-950/90 border border-neutral-800 hover:border-amber-500/50 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-amber-500/10"
                            >
                              {/* Poster + Header Banner */}
                              <div className="relative h-28 w-full bg-neutral-900 overflow-hidden">
                                {room.poster ? (
                                  <img
                                    src={room.poster}
                                    alt={room.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                                    <Radio className="w-8 h-8 opacity-40" />
                                  </div>
                                )}

                                {/* Overlay gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

                                {/* Room Badges Overlay */}
                                <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                                  <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-amber-500/30 text-amber-400 font-mono text-[10px] font-black tracking-wider">
                                    {room.code}
                                  </span>

                                  {room.isPrivate ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                      <Lock className="w-3 h-3" /> Private
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Publik
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card Body Info */}
                              <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between -mt-4 relative z-10">
                                <div className="space-y-1.5">
                                  <h4 className="text-xs font-black text-white line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                                    {room.title || 'Nonton Bareng Anime'}
                                  </h4>

                                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span className="truncate">Host: <strong className="text-neutral-200">{room.hostName}</strong></span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 font-bold shrink-0">
                                      👥 {room.participantCount}/{room.maxParticipants}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => joinTargetRoomCode(room.code)}
                                  disabled={loading || room.participantCount >= room.maxParticipants}
                                  className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-95 transition-all disabled:opacity-50 mt-2"
                                >
                                  <span>{room.isPrivate ? 'Masuk dengan PIN' : 'Join Room'}</span>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full p-6 text-center text-xs text-neutral-400 bg-neutral-950/60 rounded-2xl border border-neutral-800">
                            Tidak ditemukan room dengan kata kunci &quot;{roomSearch}&quot;.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 text-center rounded-2xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                      <p className="font-semibold text-neutral-300">Belum ada Room Publik yang aktif</p>
                      <p className="text-[11px]">Buka halaman tayang anime lalu klik <strong>&quot;Buat Room Nobar&quot;</strong> untuk memulai nobar pertama!</p>
                    </div>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-neutral-800"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Atau Masukkan Kode Host</span>
                  <div className="flex-grow border-t border-neutral-800"></div>
                </div>

                {/* Section 2: Manual Code Input */}
                <form onSubmit={handleJoin} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Masukkan Kode (Contoh: NOBAR-X82A1)"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-center font-bold text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 uppercase tracking-widest transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <span>{loading ? 'Menghubungkan...' : 'Gabung via Kode'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              /* PIN Entry Step */
              <form onSubmit={handleJoinWithPin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1.5">
                    PIN Room (4 Digit)
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      placeholder="• • • •"
                      value={pinInput}
                      maxLength={4}
                      autoFocus
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-neutral-950 border border-amber-500/40 text-amber-300 font-mono text-center font-black text-xl tracking-[0.5em] placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || pinInput.length !== 4}
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? 'Memverifikasi...' : 'Masuk dengan PIN'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setRequiresPin(false); setPinInput(''); setErrorMsg(null); }}
                  className="w-full text-center text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors underline"
                >
                  ← Ganti Kode Room
                </button>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
