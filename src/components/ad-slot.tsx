'use client';

import { useEffect, useState } from 'react';

interface AdSlotProps {
  position: 'headerBanner' | 'playerBanner' | 'sidebarBanner';
  className?: string;
}

export function AdSlot({ position, className = '' }: AdSlotProps) {
  const [adSettings, setAdSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats?.adSettings) {
          setAdSettings(data.stats.adSettings);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !adSettings) return null;

  // Premium users see NO ads
  const isPremiumUser = typeof window !== 'undefined' && localStorage.getItem('animehub_is_premium') === 'true';
  if (isPremiumUser) return null;

  // Check if this specific ad position is active from Admin Dashboard
  const isEnabled = adSettings[position];
  if (!isEnabled) return null;

  return (
    <div className={`w-full my-4 flex flex-col items-center justify-center ${className}`}>
      <div className="w-full max-w-4xl p-4 rounded-2xl bg-neutral-900/80 border border-amber-500/20 text-center space-y-1 shadow-lg backdrop-blur-sm">
        <div className="text-[10px] font-extrabold tracking-widest uppercase text-amber-400/70">
          — SLOT IKLAN AKTIF ({position.toUpperCase()}) —
        </div>
        <div className="py-6 px-4 bg-neutral-950/60 rounded-xl border border-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-400">
          <span>Area Spanduk / Dynamic Ad Network Tag (Admin Managed)</span>
        </div>
      </div>
    </div>
  );
}
