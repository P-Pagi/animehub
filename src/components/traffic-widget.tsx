'use client';

import { useState, useEffect } from 'react';
import { Users, Eye, Activity, CheckCircle2 } from 'lucide-react';

export function TrafficWidget() {
  const [stats, setStats] = useState<{ todayCount: number; totalCount: number } | null>(null);

  useEffect(() => {
    async function initVisitorTracking() {
      try {
        let visitorId = localStorage.getItem('ah_visitor_id');
        if (!visitorId) {
          visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
          localStorage.setItem('ah_visitor_id', visitorId);
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')}`;

        const lastVisitDate = localStorage.getItem('ah_last_visit_date');

        if (lastVisitDate !== todayStr) {
          // New day visit for this visitor -> record visit!
          const res = await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId }),
          });
          const json = await res.json();
          if (json.status === 'success') {
            setStats(json.data);
            localStorage.setItem('ah_last_visit_date', todayStr);
          }
        } else {
          // Same day visit -> just get current stats without incrementing
          const res = await fetch('/api/analytics');
          const json = await res.json();
          if (json.status === 'success') {
            setStats(json.data);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    initVisitorTracking();
  }, []);

  if (!stats) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface/90 border border-border/80 shadow-lg space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-primary">
          <Activity className="w-4 h-4 text-accent animate-pulse" />
          <span>Statistik Pengunjung Unik (Traffic Realtime)</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>1 Pengunjung / Hari</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-background/70 border border-border/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-secondary">Hari Ini (Unik)</p>
            <p className="text-base sm:text-lg font-black text-primary leading-none mt-0.5">
              {stats.todayCount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/70 border border-border/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-secondary">Total Pengunjung</p>
            <p className="text-base sm:text-lg font-black text-primary leading-none mt-0.5">
              {stats.totalCount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
