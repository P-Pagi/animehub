'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { X, Check } from 'lucide-react';
import { AuthModal } from './auth-modal';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimed: (premiumUntil: string) => void;
}

function TrialModal({ isOpen, onClose, onClaimed }: TrialModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClaim = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/premium/trial', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Gagal mengaktifkan trial.');
        setLoading(false);
        return;
      }

      const expiryIso = data.user?.premiumUntil || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString();
      })();

      // Sync localStorage
      localStorage.setItem('animehub_is_premium', 'true');
      localStorage.setItem('animehub_premium_until', expiryIso);
      localStorage.setItem('animehub_trial_claimed', 'true');
      localStorage.setItem('animehub_is_trial', 'true');

      const savedUser = localStorage.getItem('animehub_user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          userObj.isPremium = true;
          userObj.premiumUntil = expiryIso;
          userObj.trialClaimed = true;
          localStorage.setItem('animehub_user', JSON.stringify(userObj));
        } catch {}
      }

      window.dispatchEvent(new Event('storage'));
      setLoading(false);
      setSuccess(true);
      onClaimed(expiryIso);
    } catch {
      setLoading(false);
      setError('Terjadi kesalahan. Coba lagi.');
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError('');
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-5 relative shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!success ? (
          <>
            {/* Modal Header */}
            <div className="space-y-1 pr-6">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                Penawaran Pengguna Baru
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">
                Coba VIP Gratis 3 Hari
              </h3>
              <p className="text-xs text-neutral-400">
                Akses semua fitur VIP tanpa biaya. Otomatis berakhir tanpa tagihan.
              </p>
            </div>

            {/* Clean Feature List */}
            <ul className="space-y-3.5 py-1 text-xs">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-neutral-200">100% Bebas Iklan</p>
                  <p className="text-neutral-400">Nonton anime tanpa iklan video & banner</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-neutral-200">Fitur Nobar VIP</p>
                  <p className="text-neutral-400">Buat Watch Party room & kunci dengan PIN</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-neutral-200">Server Prioritas</p>
                  <p className="text-neutral-400">Streaming kencang tanpa buffering</p>
                </div>
              </li>
            </ul>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center font-medium">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition-all disabled:opacity-60"
              >
                {loading ? 'Mengaktifkan...' : 'Klaim Trial 3 Hari'}
              </button>

              <button
                onClick={handleClose}
                className="w-full py-2 text-center text-neutral-500 hover:text-neutral-400 text-xs font-medium transition-colors"
              >
                Lain kali
              </button>
            </div>
          </>
        ) : (
          /* Success View */
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">VIP Berhasil Diaktifkan!</h3>
              <p className="text-xs text-neutral-400">
                Akses VIP kamu aktif selama 3 hari ke depan. Selamat menonton!
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
            >
              Tutup & Mulai Nonton
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Banner Strip (shown on page / navbar area) ────────────────────────────────
export function TrialBanner() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isEligible, setIsEligible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || pathname?.startsWith('/admin')) return;

    const dismissed = sessionStorage.getItem('animehub_trial_dismissed') === 'true';
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const checkEligibility = async () => {
      // If no session, show trial banner invitation to login
      if (!session?.user?.email) {
        setIsEligible(false);
        return;
      }

      // Quick local check first
      const trialClaimed = localStorage.getItem('animehub_trial_claimed') === 'true';
      const isPremium = localStorage.getItem('animehub_is_premium') === 'true';
      if (trialClaimed || isPremium) {
        setIsEligible(false);
        return;
      }

      // Validate from server
      try {
        const res = await fetch('/api/user/me', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.user) return;

        const { isPremium: dbPremium, trialClaimed: dbTrial, createdAt, premiumUntil } = data.user;

        if (dbPremium && premiumUntil && new Date(premiumUntil) > new Date()) {
          setIsEligible(false);
          return;
        }
        if (dbTrial) {
          setIsEligible(false);
          return;
        }

        // Check account age
        if (createdAt) {
          const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
          const age = Date.now() - new Date(createdAt).getTime();
          setIsEligible(age <= ONE_WEEK);
        }
      } catch {
        setIsEligible(false);
      }
    };

    checkEligibility();
  }, [session, mounted, pathname]);

  const handleDismiss = () => {
    sessionStorage.setItem('animehub_trial_dismissed', 'true');
    setIsDismissed(true);
  };

  const handleOpenModal = () => {
    if (!session?.user) {
      setAuthOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const handleClaimed = () => {
    setIsEligible(false);
  };

  if (!mounted || isDismissed || !isEligible || pathname?.startsWith('/admin')) return null;

  return (
    <>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
        onSuccess={() => setIsModalOpen(true)}
      />

      <TrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClaimed={handleClaimed}
      />

      {/* Clean Minimal Banner Strip */}
      <div className="bg-neutral-900 border-b border-neutral-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-amber-400 shrink-0">Trial VIP 3 Hari</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-300 truncate">
              Nikmati streaming tanpa iklan, fitur Nobar, & server prioritas.
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenModal}
              className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs transition-colors"
            >
              Coba Gratis
            </button>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-white transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Inline Button Variant (for use inside PremiumModal) ──────────────────────
export function TrialButton() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !session?.user?.email) return;

    const trialClaimed = localStorage.getItem('animehub_trial_claimed') === 'true';
    const isPremium = localStorage.getItem('animehub_is_premium') === 'true';
    if (trialClaimed || isPremium) return;

    fetch('/api/user/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.success || !data.user) return;
        const { isPremium: dbPremium, trialClaimed: dbTrial, createdAt, premiumUntil } = data.user;
        if (dbPremium && premiumUntil && new Date(premiumUntil) > new Date()) return;
        if (dbTrial) return;
        if (createdAt) {
          const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
          const age = Date.now() - new Date(createdAt).getTime();
          setIsEligible(age <= ONE_WEEK);
        }
      })
      .catch(() => { });
  }, [session, mounted]);

  const handleClaimed = () => setIsEligible(false);

  if (!mounted || !isEligible) return null;

  return (
    <>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
        onSuccess={() => setIsModalOpen(true)}
      />
      <TrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClaimed={handleClaimed}
      />
      <button
        onClick={() => {
          if (!session?.user) { setAuthOpen(true); return; }
          setIsModalOpen(true);
        }}
        className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        <span>Coba Trial VIP 3 Hari (Gratis)</span>
      </button>
    </>
  );
}
