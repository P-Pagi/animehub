'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, Home, Flame, Grid, Calendar, Bookmark, X } from 'lucide-react';
import { SearchAutocomplete } from './search-autocomplete';
import { RandomAnimeModal } from './random-anime-modal';
import { PremiumModal } from './premium-modal';
import { UserProfileButton } from './user-profile-button';
import { NobarJoinModal } from './nobar-join-modal';

export function Navbar() {
  const [query, setQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived flag — used to skip effects and early-return after all hooks
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;

  // Throttled shadow on scroll (60fps optimized)
  useEffect(() => {
    if (isAdminRoute) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isAdminRoute]);

  // Update bookmark count from localStorage
  useEffect(() => {
    if (isAdminRoute) return;
    const syncBookmarks = () => {
      try {
        const saved = localStorage.getItem('animehub_bookmarks');
        if (saved) {
          const parsed = JSON.parse(saved);
          setBookmarkCount(parsed.length);
        } else {
          setBookmarkCount(0);
        }
      } catch {
        // Ignore
      }
    };

    syncBookmarks();
    window.addEventListener('bookmarks-updated', syncBookmarks);
    return () => window.removeEventListener('bookmarks-updated', syncBookmarks);
  }, [isAdminRoute]);

  // Auto-focus mobile search with slight delay to allow smooth GPU animation
  useEffect(() => {
    if (mobileSearchOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [mobileSearchOpen]);

  // Hide Navbar completely on all admin routes (after all hooks)
  if (isAdminRoute) {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setMobileSearchOpen(false);
      setQuery('');
    }
  };

  const navLinks = [
    { href: '/', label: 'Beranda', icon: Home },
    { href: '/popular', label: 'Terpopuler', icon: Flame },
    { href: '/genre', label: 'Kategori', icon: Grid },
    { href: '/jadwal', label: 'Jadwal', icon: Calendar },
    {
      href: '/bookmark',
      label: 'Favorit',
      icon: Bookmark,
      badge: bookmarkCount > 0 ? bookmarkCount : undefined,
    },
  ];

  return (
    <>
      {/* ── Top Header Bar ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? 'bg-[#0a0a0a]/95 border-neutral-800/80 shadow-2xl shadow-black/90 backdrop-blur-2xl'
            : 'bg-[#0a0a0a]/85 sm:bg-[#0a0a0a]/75 border-neutral-800/40 backdrop-blur-xl'
        }`}
      >
        <div className="w-full px-4 sm:px-6 xl:px-8 h-14 sm:h-16 flex items-center justify-between gap-3 lg:gap-4 xl:gap-6">
          {/* Brand Logo */}
          <Link
            href="/"
            className="font-extrabold text-xl sm:text-2xl tracking-tight text-white hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          >
            <Image
              src="/logo.png"
              alt="AnimeHub Logo"
              width={32}
              height={32}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0"
            />
            <span>
              Anime<span className="text-amber-400 font-black">Hub</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-800/60 shrink-0">
            {navLinks.map(({ href, label, icon: Icon, badge }) => {
              const isActive =
                href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? 'text-white bg-neutral-800 border border-neutral-700/80 shadow-md ring-1 ring-neutral-700/40'
                      : 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                  <span>{label}</span>
                  {badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-600 text-white shadow-sm">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <RandomAnimeModal variant="pill" />
          </nav>

          {/* Right Action Cluster (Desktop) */}
          <div className="hidden md:flex items-center gap-2 xl:gap-3 shrink-0">
            <NobarJoinModal />
            <PremiumModal />
            <UserProfileButton />
            <div className="w-36 lg:w-44 xl:w-60">
              <SearchAutocomplete placeholder="Cari anime..." />
            </div>
          </div>

          {/* Mobile Right Action Buttons */}
          <div className="md:hidden flex items-center gap-1.5 shrink-0">
            <NobarJoinModal />
            <PremiumModal />
            <UserProfileButton />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-white hover:text-amber-400 transition-colors flex items-center justify-center text-xs font-semibold backdrop-blur-md shadow-sm shrink-0"
              aria-label="Cari anime"
            >
              <Search className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Mobile Search Overlay Bar */}
        <div
          className={`md:hidden overflow-visible transition-all duration-200 ease-out border-t border-neutral-800/80 bg-[#0a0a0a]/95 backdrop-blur-xl ${
            mobileSearchOpen
              ? 'opacity-100 py-2.5 px-4 translate-y-0 block'
              : 'opacity-0 py-0 px-4 -translate-y-1 hidden'
          }`}
        >
          <SearchAutocomplete
            placeholder="Ketik judul anime yang dicari..."
            autoFocus
            onSearchSubmit={() => setMobileSearchOpen(false)}
            inputRef={inputRef}
          />
        </div>
      </header>

      {/* ── Fixed Bottom Navigation Bar for Mobile (Mobile First UI) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 border-t border-neutral-800/90 backdrop-blur-2xl px-2 py-1.5 shadow-2xl">
        <div className="grid grid-cols-5 items-center max-w-md mx-auto">
          {navLinks.map(({ href, label, icon: Icon, badge }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-accent font-bold scale-105'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 text-[9px] font-black bg-red-600 text-white rounded-full border border-background">
                      {badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black text-white' : 'font-semibold text-neutral-300'}`}>
                  {label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-0.5 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
