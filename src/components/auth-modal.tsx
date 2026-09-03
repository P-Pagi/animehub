'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { User, LogIn, LogOut, Mail, Lock, UserPlus, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccessMsg('');
  }, [initialMode, isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.message || 'Gagal mendaftar');
          setLoading(false);
          return;
        }
        setSuccessMsg('Akun berhasil dibuat! Silakan login.');
        setMode('login');
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.message || 'Email atau password salah');
          setLoading(false);
          return;
        }
        localStorage.setItem('animehub_user', JSON.stringify(data.user));
        if (data.user.isPremium) {
          localStorage.setItem('animehub_is_premium', 'true');
        }
        setSuccessMsg('Login berhasil!');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
          window.location.reload();
        }, 800);
      }
    } catch {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthGoogle = async () => {
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch {
      setError('Gagal mengarahkan ke Google OAuth.');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-5 relative shadow-2xl custom-scrollbar my-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <Image src="/logo.png" alt="AnimeHub Logo" width={36} height={36} className="w-9 h-9 rounded-xl object-contain drop-shadow-md" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {mode === 'login' ? (
              <>Masuk ke Anime<span className="text-amber-400">Hub</span></>
            ) : (
              <>Daftar Akun Anime<span className="text-amber-400">Hub</span></>
            )}
          </h3>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            {mode === 'login' ? 'Kelola koleksi favorit & status VIP Bebas Iklan Anda' : 'Buat akun gratis untuk pengalaman nonton anime terbaik'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* OAuth Buttons (Available on both Login & Register modes) */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleOAuthGoogle}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-black flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-neutral-800 w-full"></div>
            <span className="bg-neutral-900 px-3 text-[10px] text-neutral-500 uppercase font-extrabold absolute">
              atau via email
            </span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Nama Lengkap</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Nama Pengguna"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-amber-500 focus:outline-none transition-all"
                />
                <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Alamat Email</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-amber-500 focus:outline-none transition-all"
              />
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Kata Sandi</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-amber-500 focus:outline-none transition-all"
              />
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Memproses...' : mode === 'login' ? 'Masuk Akun' : 'Daftar Akun'}</span>
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="text-center text-xs text-neutral-400 border-t border-neutral-800/80 pt-4">
          {mode === 'login' ? (
            <p>
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-bold text-amber-400 hover:underline"
              >
                Daftar sekarang
              </button>
            </p>
          ) : (
            <p>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-amber-400 hover:underline"
              >
                Masuk di sini
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
