'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, DollarSign, X } from 'lucide-react';

export function AdminVipPriceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(5000);
  const [newPrice, setNewPrice] = useState<string>('5000');
  const [adminPin, setAdminPin] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const onOpen = () => setIsOpen(true);
    window.addEventListener('open-admin-vip-modal', onOpen);
    return () => window.removeEventListener('open-admin-vip-modal', onOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentPrice();
    }
  }, [isOpen]);

  const fetchCurrentPrice = async () => {
    try {
      const res = await fetch('/api/admin/vip-price');
      if (res.ok) {
        const data = await res.json();
        if (data.price) {
          setCurrentPrice(data.price);
          setNewPrice(String(data.price));
        }
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/admin/vip-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: Number(newPrice), adminPin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMsg({ type: 'success', text: data.message });
        setCurrentPrice(data.price);
        setAdminPin('');
        setTimeout(() => setIsOpen(false), 1500);
      } else {
        setMsg({ type: 'error', text: data.message || 'Gagal mengubah harga VIP' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Terjadi kesalahan koneksi ke server.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 text-neutral-200 relative">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-400 text-[10px] font-bold tracking-wide uppercase border border-amber-400/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Admin Panel</span>
            </div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">
              Pengaturan Harga VIP
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg bg-neutral-800/80 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Harga Saat Ini */}
        <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-medium">Harga VIP Berjalan:</span>
          <span className="text-sm font-black text-amber-400 font-mono">
            Rp {currentPrice.toLocaleString('id-ID')}
          </span>
        </div>

        {/* Form Pengaturan */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Harga Baru (Rp)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 text-xs font-bold font-mono">
                Rp
              </div>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Misal: 5000"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              PIN Otentikasi Admin
            </label>
            <input
              type="password"
              required
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Masukkan PIN Admin"
              className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {msg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
                msg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {msg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="pt-1 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span>Menyimpan...</span></>
              ) : (
                <span>Simpan Harga VIP Baru</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 text-xs text-neutral-500 hover:text-neutral-400 font-medium transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
