'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, LogIn, Sparkles, X, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthModal } from './auth-modal';

export function NobarJoinModal() {
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    const u = getUser();
    if (!u) {
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
          code: cleanCode,
          user: u,
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        handleClose();
        router.push(`/watch/${data.room.slug}?nobar=${data.room.code}`);
      } else if (data.requiresPin) {
        setRequiresPin(true);
        setPendingCode(cleanCode);
        setErrorMsg(null);
      } else {
        setErrorMsg(data.error || 'Kode room tidak valid atau room penuh.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim() || !pendingCode) return;

    const u = getUser();
    if (!u) {
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
          code: pendingCode,
          pin: pinInput.trim(),
          user: u,
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        handleClose();
        router.push(`/watch/${data.room.slug}?nobar=${data.room.code}`);
      } else {
        setErrorMsg(data.error || 'PIN salah, coba lagi.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Navbar Button Trigger */}
      <button
        onClick={handleOpen}
        className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center gap-1 sm:gap-1.5 active:scale-95 transition-all shrink-0 shadow-sm"
        title="Gabung Watch Party Nobar"
      >
        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-[11px] sm:text-xs">Nobar</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-amber-500/30 space-y-5 relative shadow-2xl my-auto">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1">
                {requiresPin ? <Lock className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <h3 className="text-lg font-black text-white">
                {requiresPin ? 'Room Private 🔒' : 'Join Room Watch Party'}
              </h3>
              <p className="text-xs text-neutral-400">
                {requiresPin
                  ? `Masukkan PIN 4 digit untuk room ${pendingCode}`
                  : 'Masukkan kode dari Host untuk langsung menuju ke lokasi streaming.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs text-center font-semibold">
                {errorMsg}
              </div>
            )}

            {!requiresPin ? (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1.5">
                    Kode Room (Contoh: NOBAR-X82A1)
                  </label>
                  <input
                    type="text"
                    placeholder="NOBAR-XXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-center font-bold text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 uppercase tracking-widest transition-colors"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <span>{loading ? 'Menghubungkan...' : 'Masuk Room Streaming'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
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
