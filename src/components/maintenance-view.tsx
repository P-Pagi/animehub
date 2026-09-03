'use client';

import { useState } from 'react';
import { RefreshCw, ServerOff, WifiOff, Home } from 'lucide-react';
import Link from 'next/link';

interface MaintenanceViewProps {
  message?: string;
  sourceName?: string;
  onRetry?: () => void;
}

export function MaintenanceView({
  message = 'Gagal memuat data dari server. Silakan coba beberapa saat lagi.',
  sourceName = 'Anime Source',
  onRetry,
}: MaintenanceViewProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleManualRetry = () => {
    setIsRetrying(true);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative max-w-lg w-full bg-surface border border-border rounded-3xl p-8 shadow-2xl space-y-6 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Server Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
          <ServerOff className="w-8 h-8" />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Gagal Terhubung Ke Server</span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Koneksi Data Terganggu
          </h1>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed max-w-md mx-auto">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-background font-extrabold text-xs hover:bg-accent transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Memuat Ulang...' : 'Coba Ulang'}</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-secondary border border-border text-secondary font-bold text-xs hover:text-primary transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
