'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Users,
  Activity,
  Zap,
  HardDrive,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Server,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Database,
  Radio,
  Crown,
  UserCheck,
  Trash2,
  Search,
  ShieldCheck,
  Clock,
  Menu,
  X,
} from 'lucide-react';

function UserVIPCountdown({ premiumUntil }: { premiumUntil: string | null }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!premiumUntil) return;

    const calculate = () => {
      const target = new Date(premiumUntil).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [premiumUntil]);

  if (!timeLeft) {
    return <span className="text-neutral-500 font-mono text-[11px]">-</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-bold whitespace-nowrap">
      <Clock className="w-3 h-3 animate-pulse shrink-0" />
      <span>
        {timeLeft.days}d {timeLeft.hours.toString().padStart(2, '0')}h {timeLeft.minutes.toString().padStart(2, '0')}m {timeLeft.seconds.toString().padStart(2, '0')}s
      </span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vip_price' | 'users' | 'api' | 'cache' | 'ads' | 'security'>('overview');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // VIP Price Admin States
  const [currentVipPrice, setCurrentVipPrice] = useState<number>(5000);
  const [newVipPrice, setNewVipPrice] = useState<string>('5000');
  const [adminPin, setAdminPin] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [vipPriceMsg, setVipPriceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVipPrice = async () => {
    try {
      const res = await fetch('/api/admin/vip-price');
      if (res.ok) {
        const data = await res.json();
        if (data.price) {
          setCurrentVipPrice(data.price);
          setNewVipPrice(String(data.price));
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchVipPrice();
  }, []);

  const handleSaveVipPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrice(true);
    setVipPriceMsg(null);

    try {
      const res = await fetch('/api/admin/vip-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(newVipPrice), adminPin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setVipPriceMsg({ type: 'success', text: data.message });
        setCurrentVipPrice(data.price);
        setAdminPin('');
      } else {
        setVipPriceMsg({ type: 'error', text: data.message || 'Gagal mengubah harga VIP' });
      }
    } catch {
      setVipPriceMsg({ type: 'error', text: 'Terjadi kesalahan koneksi ke server.' });
    } finally {
      setSavingPrice(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      console.error('Failed to fetch admin stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Auto-refresh stats every 10s
    return () => clearInterval(interval);
  }, []);

  const handleFlushCache = async () => {
    setFlushing(true);
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flush_cache' }),
      });
      const data = await res.json();
      alert(data.message || 'Cache dibersihkan!');
      fetchStats();
    } catch {
      alert('Gagal membersihkan cache.');
    } finally {
      setFlushing(false);
    }
  };

  const handleToggleAd = async (key: string, currentValue: boolean) => {
    if (!stats) return;
    const updated = { ...stats.adSettings, [key]: !currentValue };
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_ads', settings: updated }),
      });
      const data = await res.json();
      if (data.success) fetchStats();
    } catch {
      alert('Gagal memperbarui slot iklan');
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsersList(data.users);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleToggleUserPremium = async (userId: string, currentPremium: boolean) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isPremium: !currentPremium }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUsers();
      } else {
        alert(data.message || 'Gagal mengupdate status premium user.');
      }
    } catch {
      alert('Gagal mengupdate status premium user.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch {
      alert('Gagal menghapus user.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    window.location.href = '/admin/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-amber-400 font-bold text-sm">
        Memuat Dashboard Admin...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden border-b border-neutral-800 bg-neutral-900 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-sm font-black text-white">AnimeHub Admin</h1>
            <p className="text-[10px] text-amber-400 font-mono font-bold">2FA Active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleLogout} className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* ── Vertical Sidebar ── */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-neutral-900/95 border-r border-neutral-800/80 flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out backdrop-blur-md ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        <div className="space-y-6">
          {/* Sidebar Brand Header */}
          <div className="px-2 pt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="AnimeHub Logo"
                width={36}
                height={36}
                className="w-9 h-9 rounded-xl object-contain border border-neutral-800 shadow-sm"
              />
              <div>
                <h1 className="text-sm font-black text-white tracking-tight">AnimeHub Admin</h1>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>2FA Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Navigasi Utama</p>
            {[
              { id: 'overview', label: 'Live Analytics', icon: Users },
              { id: 'vip_price', label: 'Harga VIP & Billing', icon: Crown },
              { id: 'users', label: 'Manajemen User', icon: UserCheck },
              { id: 'api', label: 'Monitor API & Server', icon: Server },
              { id: 'cache', label: 'Kontrol Cache (SWR)', icon: Database },
              { id: 'ads', label: 'Manajemen Iklan', icon: DollarSign },
              { id: 'security', label: 'Keamanan & Log', icon: ShieldAlert },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3.5 transition-all duration-150 ${isActive
                    ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20 font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="pt-4 border-t border-neutral-800/80 space-y-2">
          <button
            onClick={fetchStats}
            className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh Data</span>
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Panel</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-6xl w-full min-w-0">

        {/* ── TAB: HARGA VIP & BILLING ── */}
        {activeTab === 'vip_price' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6 max-w-xl">
            <div className="space-y-1">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Pengaturan Harga VIP Subskripsi</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Ubah nominal harga langganan VIP 30 Hari secara dinamis. Harga ini akan berlaku secara otomatis untuk pembayaran QRIS dan email kuitansi.
              </p>
            </div>

            {/* Price Preview Card */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Harga Berjalan Saat Ini:</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                Rp {currentVipPrice.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Form Edit Harga */}
            <form onSubmit={handleSaveVipPrice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  Nominal Harga VIP Baru (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 text-xs font-bold font-mono">
                    Rp
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={newVipPrice}
                    onChange={(e) => setNewVipPrice(e.target.value)}
                    placeholder="Contoh: 5000"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  PIN Otentikasi Admin
                </label>
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Masukkan PIN Admin untuk konfirmasi"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {vipPriceMsg && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs ${vipPriceMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400 font-bold'
                    }`}
                >
                  {vipPriceMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{vipPriceMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingPrice}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-amber-400/10"
              >
                {savingPrice ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /><span>Menyimpan Harga...</span></>
                ) : (
                  <span>Simpan & Verifikasi PIN Admin</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 1: OVERVIEW & ANALYTICS ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Card 1: Live Visitors */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-bold">Pengunjung Aktif (Live)</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">{stats?.liveVisitors}</span>
                  <span className="text-[10px] font-bold text-emerald-400">● Online</span>
                </div>
              </div>

              {/* Card 2: API Latency */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-bold">Responsivitas API</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">{stats?.apiHealth?.latencyMs} ms</span>
                  <span className="text-[10px] font-bold text-neutral-400">Target &lt; 500ms</span>
                </div>
              </div>

              {/* Card 3: Memory Cache Entries */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-bold">Entri Cache Memori</span>
                  <HardDrive className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">{stats?.cacheStats?.memoryEntries}</span>
                  <span className="text-[10px] font-bold text-blue-400">Aktif</span>
                </div>
              </div>

              {/* Card 4: Rate Limit Usage */}
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-bold">Penggunaan Rate Limit</span>
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.apiHealth?.rateLimitUsed}/{stats?.apiHealth?.rateLimitMax}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400">Req/Menit</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── TAB 2: USER MANAGEMENT ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari user berdasarkan nama atau email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-amber-400 focus:outline-none transition-all placeholder:text-neutral-600"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
              </div>
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh User</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Daftar Pengguna ({usersList.length})</span>
                </h3>
              </div>

              {loadingUsers ? (
                <div className="py-12 text-center text-xs text-neutral-500 font-bold">Memuat daftar pengguna...</div>
              ) : usersList.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500 font-bold">Belum ada data user terdaftar di database.</div>
              ) : (
                <>
                  {/* Mobile-first User Cards (sm:hidden) */}
                  <div className="space-y-3 sm:hidden">
                    {usersList
                      .filter(
                        (u) =>
                          u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((u) => (
                        <div key={u.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {u.image ? (
                                <img src={u.image} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-neutral-700 shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">
                                  {u.name?.[0] || 'U'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-white text-xs truncate">{u.name || 'User'}</p>
                                <p className="text-[10px] text-neutral-400 font-mono truncate">{u.email}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-bold uppercase shrink-0">
                              {u.role || 'USER'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2.5">
                            <div>
                              {u.isPremium ? (
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400">
                                    <Crown className="w-3 h-3 fill-current" /> VIP PREMIUM
                                  </span>
                                  <UserVIPCountdown premiumUntil={u.premiumUntil} />
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] font-bold">
                                  REGULER
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleUserPremium(u.id, u.isPremium)}
                                disabled={updatingUserId === u.id}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${u.isPremium
                                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                  : 'bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black shadow-sm'
                                  }`}
                              >
                                {updatingUserId === u.id && (
                                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                                )}
                                <span>
                                  {updatingUserId === u.id
                                    ? '...'
                                    : u.isPremium
                                      ? 'Revoke VIP'
                                      : '+ VIP'}
                                </span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={updatingUserId === u.id}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                                title="Hapus User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop User Table (hidden on mobile, sm:block) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                      <thead>
                        <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-extrabold">
                          <th className="py-3 px-3">Pengguna</th>
                          <th className="py-3 px-3">Email</th>
                          <th className="py-3 px-3">Role</th>
                          <th className="py-3 px-3">Status Premium</th>
                          <th className="py-3 px-3">Masa Aktif VIP</th>
                          <th className="py-3 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {usersList
                          .filter(
                            (u) =>
                              u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                              u.email?.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map((u) => (
                            <tr key={u.id} className="hover:bg-neutral-800/40 transition-colors">
                              <td className="py-3 px-3 font-bold text-white flex items-center gap-2 whitespace-nowrap">
                                {u.image ? (
                                  <img src={u.image} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-neutral-700 shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">
                                    {u.name?.[0] || 'U'}
                                  </div>
                                )}
                                <span className="truncate max-w-[120px]">{u.name || 'User'}</span>
                              </td>
                              <td className="py-3 px-3 text-neutral-300 font-mono text-[11px] whitespace-nowrap">{u.email}</td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[10px] font-bold uppercase">
                                  {u.role || 'USER'}
                                </span>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                {u.isPremium ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                                    <Crown className="w-3 h-3 fill-current" />
                                    <span>VIP PREMIUM</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-bold">
                                    REGULER
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                {u.isPremium ? (
                                  <UserVIPCountdown premiumUntil={u.premiumUntil} />
                                ) : (
                                  <span className="text-neutral-500 font-mono text-[11px]">-</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleToggleUserPremium(u.id, u.isPremium)}
                                    disabled={updatingUserId === u.id}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${u.isPremium
                                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                      : 'bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black shadow-sm'
                                      }`}
                                  >
                                    {updatingUserId === u.id && (
                                      <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                                    )}
                                    <span>
                                      {updatingUserId === u.id
                                        ? 'Memproses...'
                                        : u.isPremium
                                          ? 'Revoke VIP'
                                          : 'Set VIP (+30hr)'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    disabled={updatingUserId === u.id}
                                    className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                                    title="Hapus User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: API & SERVER MONITORING ── */}
        {activeTab === 'api' && (
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Status Server API Gateway Sanka Vollerei</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="text-xs font-bold text-neutral-400">Kondisi Server Gateway</div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-black text-emerald-400 uppercase tracking-wide">
                    {stats?.apiHealth?.status}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="text-xs font-bold text-neutral-400">Batas Kuota Penggunaan API</div>
                <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{
                      width: `${(stats?.apiHealth?.rateLimitUsed / stats?.apiHealth?.rateLimitMax) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">
                  {stats?.apiHealth?.rateLimitUsed} dari {stats?.apiHealth?.rateLimitMax} Request per menit terpakai.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: CACHE CONTROL ── */}
        {activeTab === 'cache' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white">Manajemen Cache Memory &amp; SWR</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Kelora entri cache untuk efisiensi respon 0ms</p>
              </div>
              <button
                onClick={handleFlushCache}
                disabled={flushing}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-black flex items-center justify-center gap-2 transition-all shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${flushing ? 'animate-spin' : ''}`} />
                <span>{flushing ? 'Memproses...' : 'Bersihkan Cache (Flush)'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 font-mono text-xs text-neutral-300">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 gap-2">
                <span className="text-[11px] sm:text-xs">In-Memory Cache Entries:</span>
                <span className="font-bold text-amber-400 shrink-0">{stats?.cacheStats?.memoryEntries} Key</span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 gap-2">
                <span className="text-[11px] sm:text-xs">In-Flight Requests (Deduplicated):</span>
                <span className="font-bold text-blue-400 shrink-0">{stats?.cacheStats?.inFlightRequests}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                <span className="text-[11px] sm:text-xs">Redis Server Status:</span>
                <span className={`font-bold text-[11px] sm:text-xs ${stats?.cacheStats?.redisConnected ? 'text-emerald-400' : 'text-neutral-400'}`}>
                  {stats?.cacheStats?.redisConnected ? 'Connected' : 'Fallback to Local Memory'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: ADS MANAGEMENT ── */}
        {activeTab === 'ads' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Pengaturan Sakelar Slot Iklan Website</span>
            </h3>

            <div className="space-y-3">
              {[
                { key: 'headerBanner', label: 'Slot Iklan Banner Header / Top Navbar' },
                { key: 'playerBanner', label: 'Slot Iklan Player Streaming Video' },
                { key: 'sidebarBanner', label: 'Slot Iklan Native Sidebar' },
              ].map((slot) => {
                const isEnabled = !!stats?.adSettings?.[slot.key];
                return (
                  <div key={slot.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-neutral-950 border border-neutral-800 gap-3">
                    <span className="text-xs font-bold text-white leading-snug">{slot.label}</span>
                    <button
                      onClick={() => handleToggleAd(slot.key, isEnabled)}
                      className={`w-full sm:w-auto px-4 py-2 rounded-full text-xs font-black transition-all shrink-0 ${isEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                    >
                      {isEnabled ? 'AKTIF (ON)' : 'MATI (OFF)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 6: SECURITY & LOGS ── */}
        {activeTab === 'security' && (
          <div className="p-4 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Log Aktivitas &amp; Keamanan Admin</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs space-y-2.5 max-h-80 overflow-y-auto">
              {stats?.securityLogs?.map((log: any) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 border-b border-neutral-800/60 pb-2 text-[11px]">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-black ${log.level === 'WARN' ? 'text-amber-400' : 'text-blue-400'}`}>
                      [{log.level}]
                    </span>
                  </div>
                  <span className="text-neutral-300 break-words">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
