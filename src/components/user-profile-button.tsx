'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { User, LogIn, LogOut, Crown, Clock, Calendar, ShieldCheck, Settings, X } from 'lucide-react';
import { AuthModal } from './auth-modal';

export function UserProfileButton() {
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: dbUserData } = useQuery({
    queryKey: ['user-me', session?.user?.email],
    queryFn: async () => {
      if (!session?.user?.email) return null;
      const res = await fetch('/api/user/me');
      if (!res.ok) return null;
      const json = await res.json();
      return json.success ? json.user : null;
    },
    enabled: !!session?.user?.email,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    setMounted(true);
    const savedIsTrial = localStorage.getItem('animehub_is_trial') === 'true';

    if (dbUserData && session?.user) {
      const { isPremium: dbPremium, premiumUntil: dbUntil, trialClaimed: dbTrial, ...dbUser } = dbUserData;
      setUser({ ...session.user, ...dbUser });
      setIsPremium(dbPremium);
      setIsTrial(savedIsTrial || Boolean(dbTrial && savedIsTrial !== false));
      setPremiumUntil(dbUntil || null);

      if (dbPremium && dbUntil) {
        localStorage.setItem('animehub_is_premium', 'true');
        localStorage.setItem('animehub_premium_until', dbUntil);
      } else if (!dbPremium) {
        localStorage.removeItem('animehub_is_premium');
        localStorage.removeItem('animehub_premium_until');
        localStorage.removeItem('animehub_is_trial');
      }
    } else {
      // Fallback local storage state
      const localPremium = localStorage.getItem('animehub_is_premium') === 'true';
      const localUntil = localStorage.getItem('animehub_premium_until');
      setIsPremium(localPremium);
      setIsTrial(savedIsTrial);
      if (session?.user) {
        setUser(session.user);
      } else {
        const savedUser = localStorage.getItem('animehub_user');
        if (savedUser) {
          try { setUser(JSON.parse(savedUser)); } catch { }
        }
      }
    }
  }, [dbUserData, session]);

  // Real-time countdown timer tick
  useEffect(() => {
    if (!isPremium || !premiumUntil) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const target = new Date(premiumUntil).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsPremium(false);
        localStorage.removeItem('animehub_is_premium');
        localStorage.removeItem('animehub_premium_until');
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [isPremium, premiumUntil]);

  const handleLogout = () => {
    localStorage.removeItem('animehub_user');
    localStorage.removeItem('animehub_is_premium');
    localStorage.removeItem('animehub_premium_until');
    setUser(null);
    setIsPremium(false);
    if (session) {
      signOut({ callbackUrl: window.location.origin });
    } else {
      window.location.reload();
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {user ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            onClick={() => isPremium && setShowDetailModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 transition-all ${isPremium ? 'cursor-pointer hover:border-amber-500/50 hover:bg-neutral-800/80' : ''
              }`}
          >
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black shrink-0">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline text-xs font-bold text-neutral-200 max-w-[75px] xl:max-w-[100px] truncate">
              {user.name || 'User'}
            </span>
            {isPremium && (
              <span
                className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-black text-amber-400 flex items-center gap-1 shrink-0"
                title="Klik untuk lihat detail sisa durasi VIP"
              >
                <Crown className="w-2.5 h-2.5 fill-current shrink-0 text-amber-400" />
                <span>{isTrial ? 'VIP Trial' : (timeLeft ? `${timeLeft.days}h ${timeLeft.hours}j` : 'VIP Premium')}</span>
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors shrink-0"
            title="Keluar Akun"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAuthOpen(true)}
          className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
        >
          <LogIn className="w-3.5 h-3.5 text-amber-400" />
          <span>Masuk</span>
        </button>
      )}

      {/* Detail Modal Status Premium & Hitung Mundur */}
      {showDetailModal && isPremium && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6 text-neutral-200 relative">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-400 text-[10px] font-bold tracking-wide uppercase border border-amber-400/20">
                  <span>{isTrial ? 'VIP Trial' : 'VIP Active'}</span>
                </div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  Status Berlangganan
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sisa Durasi Section */}
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium">Sisa Masa Aktif</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Live Countdown
                </span>
              </div>

              {timeLeft ? (
                <div className="flex items-baseline justify-between text-center pt-1 font-mono">
                  <div>
                    <span className="text-2xl font-black text-white">{timeLeft.days}</span>
                    <span className="text-[10px] text-neutral-500 block font-sans font-medium mt-0.5">Hari</span>
                  </div>
                  <span className="text-neutral-700 text-lg font-bold">:</span>
                  <div>
                    <span className="text-2xl font-black text-white">{timeLeft.hours}</span>
                    <span className="text-[10px] text-neutral-500 block font-sans font-medium mt-0.5">Jam</span>
                  </div>
                  <span className="text-neutral-700 text-lg font-bold">:</span>
                  <div>
                    <span className="text-2xl font-black text-white">{timeLeft.minutes}</span>
                    <span className="text-[10px] text-neutral-500 block font-sans font-medium mt-0.5">Menit</span>
                  </div>
                  <span className="text-neutral-700 text-lg font-bold">:</span>
                  <div>
                    <span className="text-2xl font-black text-amber-400">{timeLeft.seconds}</span>
                    <span className="text-[10px] text-amber-400/80 block font-sans font-medium mt-0.5">Detik</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-neutral-500 block text-center py-1">Memuat sisa waktu...</span>
              )}
            </div>

            {/* Expiration Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-neutral-800/60">
                <span className="text-neutral-400">Kedaluwarsa Pada</span>
                <span className="font-semibold text-neutral-200">
                  {premiumUntil ? formatDate(premiumUntil) : '-'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-neutral-400">Fasilitas</span>
                <span className="font-semibold text-amber-400">Bebas Iklan &amp; Nobar VIP</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  window.dispatchEvent(new Event('open-premium-modal'));
                }}
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-amber-400/10 flex items-center justify-center gap-2"
              >
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>Perpanjang Masa VIP (+30 Hari)</span>
              </button>

              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
