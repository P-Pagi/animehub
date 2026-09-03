'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Eye, Calendar, ArrowLeft, RefreshCw, Lock } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
  todayCount: number;
  totalCount: number;
  history: { date: string; count: number }[];
}

export default function PrivateTrafficPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics?admin=true');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <Lock className="w-3.5 h-3.5" />
            <span>Private Admin Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary">Statistik Traffic Pengunjung</h1>
          <p className="text-xs text-secondary">
            Laporan unik pengunjung per hari (1 Pengunjung / Hari - Anti Duplikasi)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-secondary hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-12 text-center text-sm text-secondary">Memuat data traffic...</div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-surface border border-border/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-secondary">
                <span className="text-xs font-semibold uppercase tracking-wider">Pengunjung Hari Ini (Unik)</span>
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-primary">{data.todayCount.toLocaleString('id-ID')}</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hanya dihitung 1x per pengunjung per hari</span>
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-secondary">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Pengunjung Unik</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-primary">{data.totalCount.toLocaleString('id-ID')}</p>
              <p className="text-[11px] text-secondary font-medium">Akumulasi total unik sejak sistem diaktifkan</p>
            </div>
          </div>

          {/* History Breakdown Table */}
          <div className="p-6 rounded-2xl bg-surface border border-border/80 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              <h2 className="text-base font-bold text-primary">Riwayat Kunjungan dari Hari ke Hari</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-secondary">
                <thead className="bg-background/80 text-primary uppercase text-[10px] tracking-wider font-extrabold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4 text-right">Pengunjung Unik</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.history.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-secondary">
                        Belum ada riwayat kunjungan.
                      </td>
                    </tr>
                  ) : (
                    data.history.map((row, idx) => (
                      <tr key={row.date} className="hover:bg-surface-secondary/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-primary">{row.date}</td>
                        <td className="py-3 px-4 font-bold text-primary text-right">
                          {row.count.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {idx === 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold text-[9px] uppercase">
                              Hari Ini
                            </span>
                          ) : (
                            <span className="text-secondary/70 text-[10px]">Tercatat</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
