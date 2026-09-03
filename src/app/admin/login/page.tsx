'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ShieldCheck, Key, Lock, QrCode, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState<{ qrImageUrl: string; secret: string } | null>(null);

  const [isPaired, setIsPaired] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/admin/setup-2fa?check=status')
      .then((res) => res.json())
      .then((data) => {
        if (data.isPaired) setIsPaired(true);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, token }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Login gagal');
        setLoading(false);
        return;
      }

      // Success -> Redirect to Admin Dashboard
      window.location.href = '/admin';
    } catch {
      setError('Gagal terhubung ke server login.');
      setLoading(false);
    }
  };

  const handleFetchQR = async () => {
    try {
      const res = await fetch('/api/admin/setup-2fa');
      const data = await res.json();
      if (data.success) {
        setQrData({ qrImageUrl: data.qrImageUrl, secret: data.secret });
        setShowQR(true);
      } else {
        setError(data.message || 'Pemasangan 2FA dikunci!');
      }
    } catch {
      setError('Gagal memuat QR Code setup 2FA.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Admin Dashboard Login</h1>
          <p className="text-xs text-neutral-400">Diperlukan Autentikasi 2FA Authenticator &amp; PIN Admin</p>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl space-y-6 backdrop-blur-xl">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input PIN Admin */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-neutral-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>PIN Admin</span>
              </label>
              <input
                type="password"
                required
                maxLength={10}
                placeholder="Masukkan PIN Admin (6 Angka)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-amber-500 focus:outline-none transition-all placeholder:text-neutral-600"
              />
            </div>

            {/* Input 2FA Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-neutral-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Kode 2FA Authenticator (6 Angka)</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Contoh: 123456"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm font-mono tracking-widest text-center focus:border-amber-500 focus:outline-none transition-all placeholder:text-neutral-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk Panel Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Setup 2FA Link */}
          <div className="pt-4 border-t border-neutral-800/80 text-center">
            {!isPaired ? (
              <button
                type="button"
                onClick={handleFetchQR}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Belum pasang 2FA di Authenticator? Klik di sini</span>
              </button>
            ) : (
              <div className="text-[11px] font-bold text-emerald-400 inline-flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2FA Terpasang &amp; Dikunci pada Device Utama</span>
              </div>
            )}
          </div>
        </div>

        {/* 2FA Setup Modal */}
        {showQR && qrData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 text-center">
              <h3 className="text-sm font-black text-white">Scan QR Code dengan Google Authenticator</h3>
              <p className="text-xs text-neutral-400">Gunakan aplikasi Google Authenticator, Authy, atau Passwords untuk scan kode di bawah:</p>
              
              <div className="p-3 bg-white rounded-2xl inline-block shadow-inner">
                <img src={qrData.qrImageUrl} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-amber-400 break-all">
                Secret: {qrData.secret}
              </div>

              <button
                onClick={() => setShowQR(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-extrabold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
