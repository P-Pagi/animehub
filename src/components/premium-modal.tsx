'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { Crown, Check, RefreshCw, Clock, AlertCircle, Mail, ArrowLeft, X } from 'lucide-react';
import { AuthModal } from './auth-modal';
import { TrialButton } from './trial-banner';

const VIP_PRICE = 1;
const POLL_INTERVAL_MS = 5000;
const QRIS_EXPIRY_MS = 5 * 60 * 1000;

let isPremiumModalActive = false;

type PaymentStep = 'info' | 'qris' | 'success';

interface QrisData {
  qris_id: string;
  trx_id: string;
  qris_code: string;
  amount: number;
  expires_at: string;
}

export function PremiumModal() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState<PaymentStep>('info');
  const [vipPrice, setVipPrice] = useState<number>(5000);
  const [qrisData, setQrisData] = useState<QrisData | null>(null);
  const [loadingQris, setLoadingQris] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const handleTestEmail = async () => {
    setSendingTestEmail(true);
    setErrorMsg('');
    try {
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('animehub_user') : null;
      let email = session?.user?.email;
      if (!email && savedUser) {
        try { email = JSON.parse(savedUser).email; } catch {}
      }
      email = email || 'adinury84@gmail.com';

      const res = await fetch('/api/test/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Email test berhasil dikirim ke: ${email}`);
      } else {
        setErrorMsg(data.message || 'Gagal mengirim email test');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan saat mengirim email test.');
    } finally {
      setSendingTestEmail(false);
    }
  };
  const [pollStatus, setPollStatus] = useState<'pending' | 'checking' | 'paid' | 'expired'>('pending');
  const [secondsLeft, setSecondsLeft] = useState(QRIS_EXPIRY_MS / 1000);
  const [errorMsg, setErrorMsg] = useState('');

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handleCloseModal = () => {
    isPremiumModalActive = false;
    stopPolling();
    setIsOpen(false);
    setStep('info');
    setQrisData(null);
    setPollStatus('pending');
    setErrorMsg('');
  };

  useEffect(() => {
    setMounted(true);

    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/payment/create-qris');
        if (res.ok) {
          const data = await res.json();
          if (data.price) setVipPrice(data.price);
        }
      } catch {}
    };
    fetchPrice();

    const checkPremium = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch('/api/user/me', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              const { isPremium: dbPremium, premiumUntil: dbUntil } = data.user;
              const isStillActive = dbPremium && dbUntil && new Date(dbUntil) > new Date();
              if (isStillActive) {
                localStorage.setItem('animehub_is_premium', 'true');
                localStorage.setItem('animehub_premium_until', dbUntil);
                setIsPremium(true);
              } else {
                localStorage.removeItem('animehub_is_premium');
                localStorage.removeItem('animehub_premium_until');
                localStorage.removeItem('animehub_is_trial');
                setIsPremium(false);
              }
              return;
            }
          }
        } catch { /* fall through */ }
      }

      const savedPremium = localStorage.getItem('animehub_is_premium') === 'true';
      const savedUntil = localStorage.getItem('animehub_premium_until');
      const sessionPremium = (session?.user as any)?.isPremium || false;
      const sessionUntil = (session?.user as any)?.premiumUntil || null;
      const until = savedUntil || sessionUntil;
      const claimedPremium = savedPremium || sessionPremium;

      if (claimedPremium && until && new Date(until) <= new Date()) {
        localStorage.removeItem('animehub_is_premium');
        localStorage.removeItem('animehub_premium_until');
        localStorage.removeItem('animehub_is_trial');
        setIsPremium(false);
        return;
      }
      setIsPremium(claimedPremium);
    };

    const handleOpenTrigger = () => {
      if (!isPremiumModalActive) { isPremiumModalActive = true; setIsOpen(true); }
    };

    checkPremium();
    window.addEventListener('storage', checkPremium);
    window.addEventListener('open-premium-modal', handleOpenTrigger);
    return () => {
      window.removeEventListener('storage', checkPremium);
      window.removeEventListener('open-premium-modal', handleOpenTrigger);
    };
  }, [session]);

  const handleOpenModal = () => {
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('animehub_user') : null;
    if (!savedUser && !session?.user) { setAuthOpen(true); return; }
    if (!isPremiumModalActive) { isPremiumModalActive = true; setIsOpen(true); }
  };

  const activatePremium = useCallback(async (qrisTrxId?: string) => {
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('animehub_user') : null;
    let email = session?.user?.email;
    if (!email && savedUser) { try { email = JSON.parse(savedUser).email; } catch { } }

    let expirationIso: string;
    if (email) {
      const upgradeRes = await fetch('/api/premium/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trxId: qrisTrxId, amount: vipPrice }),
      });
      const upgradeData = await upgradeRes.json();
      expirationIso = upgradeData.user?.premiumUntil || (() => {
        const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString();
      })();
    } else {
      const d = new Date(); d.setDate(d.getDate() + 30);
      expirationIso = d.toISOString();
    }

    localStorage.setItem('animehub_is_premium', 'true');
    localStorage.setItem('animehub_premium_until', expirationIso);
    localStorage.removeItem('animehub_is_trial');
    if (savedUser) {
      try {
        const obj = JSON.parse(savedUser);
        obj.isPremium = true; obj.premiumUntil = expirationIso;
        localStorage.setItem('animehub_user', JSON.stringify(obj));
      } catch { }
    }
    window.dispatchEvent(new Event('storage'));
  }, [session]);

  const startPolling = useCallback((qrisId: string, expiresAt: string, currentTrxId?: string) => {
    stopPolling();
    const expiryMs = new Date(expiresAt).getTime();
    countdownRef.current = setInterval(() => {
      const diff = Math.floor((expiryMs - Date.now()) / 1000);
      if (diff <= 0) { setSecondsLeft(0); setPollStatus('expired'); stopPolling(); }
      else { setSecondsLeft(diff); }
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/check/${qrisId}`);
        const data = await res.json();
        if (data.paid) {
          stopPolling(); setPollStatus('paid');
          await activatePremium(currentTrxId); setStep('success');
        } else if (data.status === 'EXPIRED') {
          stopPolling(); setPollStatus('expired');
        }
      } catch { }
    }, POLL_INTERVAL_MS);
  }, [activatePremium]);

  const handleCreateQris = async () => {
    setLoadingQris(true); setErrorMsg('');
    try {
      const res = await fetch('/api/payment/create-qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: VIP_PRICE }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Gagal membuat QRIS. Cek apakah GoPay Gateway sedang berjalan.');
        setLoadingQris(false); return;
      }
      const q: QrisData = data.data;
      setQrisData(q); setSecondsLeft(QRIS_EXPIRY_MS / 1000);
      setPollStatus('pending'); setStep('qris');
      startPolling(q.qris_id, q.expires_at, q.trx_id);
    } catch {
      setErrorMsg('Tidak dapat terhubung ke server pembayaran.');
    } finally { setLoadingQris(false); }
  };

  const qrImageUrl = qrisData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrisData.qris_code)}`
    : '';

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerText = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const timerPct = (secondsLeft / (QRIS_EXPIRY_MS / 1000)) * 100;
  const isUrgent = secondsLeft <= 60;

  const userEmail = session?.user?.email || (typeof window !== 'undefined' && localStorage.getItem('animehub_user') ? JSON.parse(localStorage.getItem('animehub_user') || '{}').email : null) || 'user@animehub.com';

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
        onSuccess={() => setIsOpen(true)}
      />

      {!isPremium && (
        <button
          onClick={handleOpenModal}
          className="relative group px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-95 transition-all shrink-0"
          title="Upgrade VIP"
        >
          <span className="absolute inset-0 rounded-xl ring-2 ring-amber-400/40 animate-pulse group-hover:ring-amber-300/60 transition-all" />
          <Crown className="w-3.5 h-3.5 fill-current shrink-0 group-hover:scale-110 transition-transform" />
          <span className="hidden 2xl:inline">VIP — Rp {VIP_PRICE.toLocaleString('id-ID')}</span>
          <span className="2xl:hidden">VIP</span>
        </button>
      )}

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center text-neutral-200">

            {/* ══ STEP 1 — Info ══ */}
            {step === 'info' && (
              <div className="space-y-6 text-left">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-400 text-[10px] font-bold tracking-wide uppercase border border-amber-400/20">
                      <Crown className="w-3 h-3 fill-current" />
                      <span>{isPremium ? 'Perpanjangan' : 'Membership'}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      {isPremium ? 'Perpanjang Masa VIP' : 'AnimeHub VIP'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-1.5 rounded-lg bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline justify-between p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/90">
                  <div>
                    <span className="text-xs text-neutral-400 font-medium block">
                      {isPremium ? 'Durasi Tambahan' : 'Paket Berlangganan'}
                    </span>
                    <span className="text-sm font-semibold text-neutral-200">
                      +30 Hari Akses Penuh
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-neutral-500 block">Total</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      Rp {vipPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 text-xs text-neutral-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span><strong className="text-white">Akumulasi Otomatis:</strong> Sisa hari VIP kamu akan ditambahkan 30 hari tanpa hangus.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span><strong className="text-white">100% Tanpa Iklan:</strong> Bebas banner, pop-up, dan video ads.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span><strong className="text-white">Akses Fitur Nobar:</strong> Buat Watch Party privat bersama teman.</span>
                  </div>
                </div>

                {!isPremium && <TrialButton />}

                {errorMsg && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleCreateQris}
                    disabled={loadingQris}
                    className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-neutral-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10"
                  >
                    {loadingQris ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /><span>Membuat QRIS...</span></>
                    ) : (
                      <span>{isPremium ? 'Bayar & Perpanjang +30 Hari' : 'Lanjut Pembayaran QRIS'}</span>
                    )}
                  </button>

                  <button
                    onClick={handleCloseModal}
                    className="w-full py-2.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2 — QRIS ══ */}
            {step === 'qris' && qrisData && (
              <div className="space-y-5 text-left">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-bold text-white">Pembayaran QRIS</h3>
                  <p className="text-xs text-neutral-400">Scan QR Code dengan e-wallet pilihan kamu</p>
                </div>

                <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400" /> Sisa Waktu</span>
                    <span className={`font-mono font-bold text-sm ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>{timerText}</span>
                  </div>

                  <div className="flex justify-center py-2">
                    {pollStatus === 'expired' ? (
                      <div className="w-[200px] h-[200px] rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center text-neutral-500 text-xs gap-2">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <span>QRIS Expiry</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrImageUrl} alt="QRIS Code" width={200} height={200} className="block rounded" />
                      </div>
                    )}
                  </div>

                  <div className="text-center text-xs">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${pollStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {pollStatus === 'paid' ? 'Pembayaran Sukses!' : 'Menunggu Pembayaran...'}
                    </span>
                  </div>
                </div>

                {pollStatus === 'expired' && (
                  <button
                    onClick={handleCreateQris}
                    disabled={loadingQris}
                    className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-neutral-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Buat QRIS Baru
                  </button>
                )}

                <button
                  onClick={handleCloseModal}
                  className="w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-400 font-medium transition-colors text-center block"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* ══ STEP 3 — Success (Exact Receipt UI Structure matching reference image) ══ */}
            {step === 'success' && (
              <div className="space-y-6">
                {/* 1. Header Circle Icon with Checkmark */}
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-400/15 text-amber-400 flex items-center justify-center mx-auto ring-8 ring-amber-400/5">
                    <div className="w-10 h-10 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shadow-lg">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold text-white tracking-tight">Payment Successful!</h3>
                    <p className="text-xs text-neutral-400 max-w-[280px] mx-auto leading-relaxed">
                      Your payment has been processed successfully. You will receive a confirmation email shortly.
                    </p>
                  </div>
                </div>

                {/* 2. Structured Receipt Details Card */}
                <div className="bg-neutral-950/80 border border-neutral-800/90 rounded-2xl p-4 text-xs space-y-3 shadow-inner">
                  <div className="flex justify-between items-center pb-2.5 border-b border-neutral-800/60">
                    <span className="text-neutral-400 font-medium">Amount</span>
                    <span className="font-bold text-white text-sm font-mono">Rp {VIP_PRICE.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">Transaction ID</span>
                    <span className="font-mono text-[11px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md text-neutral-300">
                      {qrisData?.trx_id || 'TXN-VIP891234'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">Payment Method</span>
                    <span className="font-medium text-neutral-200">QRIS GoPay</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">Date</span>
                    <span className="font-medium text-neutral-200">{currentDateStr}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">Merchant</span>
                    <span className="font-semibold text-amber-400">AnimeHub</span>
                  </div>
                </div>

                {/* 3. Confirmation Info Banner */}
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-[11px] text-amber-300/90 font-medium">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="truncate">Receipt sent to {userEmail}</span>
                </div>

                {/* 4. Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={handleCloseModal}
                    className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
                  >
                    <span>Akses VIP Sekarang</span>
                  </button>

                  <button
                    onClick={handleCloseModal}
                    className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Home</span>
                  </button>
                </div>

                {/* 5. Footer Support Note */}
                <p className="text-[10px] text-neutral-500 pt-1">
                  Need help? Contact our support team at <a href="mailto:support@animehub.com" className="text-amber-400/80 hover:underline">support@animehub.com</a>
                </p>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
