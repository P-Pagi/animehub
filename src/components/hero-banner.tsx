'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Anime } from '@/types';
import { Play, Info, Bookmark, BookmarkCheck, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroBannerProps {
  items: Anime[];
}

export function HeroBanner({ items }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const total = items.length;

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
    setProgress(0);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    setProgress(0);
  }, [total]);

  useEffect(() => {
    if (isPaused || total <= 1) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, total, nextSlide]);

  const current = items[currentIndex];
  useEffect(() => {
    if (!current) return;
    try {
      const saved = localStorage.getItem('animehub_bookmarks');
      if (saved) {
        const bookmarks: Anime[] = JSON.parse(saved);
        setIsBookmarked(bookmarks.some((b) => b.slug === current.slug));
      } else {
        setIsBookmarked(false);
      }
    } catch {
      // Ignore
    }
  }, [current]);

  const toggleBookmark = () => {
    if (!current) return;
    try {
      const saved = localStorage.getItem('animehub_bookmarks');
      let bookmarks: { slug: string; title: string; thumbnail?: string; type?: string }[] = saved
        ? JSON.parse(saved)
        : [];

      if (isBookmarked) {
        bookmarks = bookmarks.filter((b) => b.slug !== current.slug);
        setIsBookmarked(false);
      } else {
        bookmarks.unshift({
          slug: current.slug,
          title: current.title,
          thumbnail: current.thumbnail,
          type: current.type,
        });
        setIsBookmarked(true);
      }
      localStorage.setItem('animehub_bookmarks', JSON.stringify(bookmarks));
      window.dispatchEvent(new Event('bookmarks-updated'));
    } catch {
      // Ignore
    }
  };

  const handleRandomAnime = () => {
    if (items.length === 0) return;
    const randomIndex = Math.floor(Math.random() * items.length);
    const randomAnime = items[randomIndex];
    router.push(`/anime/${randomAnime.slug}`);
  };

  if (!items || items.length === 0) return null;

  const metaParts: string[] = [];
  if (current.year) metaParts.push(current.year.toString());
  if (current.type) metaParts.push(current.type);
  if (current.episodes) metaParts.push(`${current.episodes} Episode`);
  else if (current.status) metaParts.push(current.status);

  const metaString = metaParts.join(' · ');
  const targetUrl = current.slug.startsWith('nonton-') ? `/watch/${current.slug}` : `/anime/${current.slug}`;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl group min-h-[360px] sm:min-h-[440px] lg:min-h-[500px]"
    >
      {/* ── Ambient Blur Backdrop ── */}
      {current.thumbnail && (
        <div key={`bg-${current.slug}`} className="absolute inset-0 z-0 animate-fade-in transition-all duration-700">
          <Image
            src={current.thumbnail}
            alt=""
            fill
            className="object-cover scale-105 sm:scale-125 blur-lg sm:blur-2xl opacity-20 sm:opacity-30 transform-gpu pointer-events-none"
            priority
          />
          <div className="hero-gradient-bottom absolute inset-x-0 bottom-0 h-52 z-10" />
        </div>
      )}

      {/* ── Gradient Overlay ── */}
      <div className="hero-gradient absolute inset-0 z-10" />

      {/* ── Main Content Grid ── */}
      <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 h-full min-h-[360px] sm:min-h-[440px] lg:min-h-[500px] items-center p-5 sm:p-8 md:p-12 gap-6">
        {/* Left Column: Title & Info */}
        <div key={`content-${current.slug}`} className="lg:col-span-7 space-y-3.5 sm:space-y-5 animate-fade-up">
          <div className="flex gap-4 items-start justify-between">
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] sm:text-[10px] font-extrabold tracking-[0.15em] text-primary uppercase bg-primary/10 border border-primary/30 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                  Trending #{currentIndex + 1}
                </span>
                {current.isAiring && (
                  <span className="badge-onair inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-red-600 text-white uppercase tracking-wider shadow-md">
                    Tayang
                  </span>
                )}
                {current.type && (
                  <span className="glass-badge text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-secondary uppercase">
                    {current.type}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight text-primary leading-[1.15] line-clamp-2">
                {current.title}
              </h1>

              {metaString && (
                <p className="text-[11px] sm:text-xs font-semibold text-secondary/90 tracking-wide flex items-center gap-2">
                  <span>{metaString}</span>
                </p>
              )}
            </div>

            {/* Mobile Poster Image Card */}
            <div className="lg:hidden relative aspect-[2/3] w-20 sm:w-28 shrink-0 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-surface-secondary">
              {current.thumbnail ? (
                <Image
                  src={current.thumbnail}
                  alt={current.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-secondary">
                  Anime
                </div>
              )}
            </div>
          </div>

          {current.description && (
            <p className="text-xs sm:text-sm text-secondary/90 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-xl">
              {current.description}
            </p>
          )}

          {/* Interactive CTA Buttons with Mobile-First Layout */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
            {/* Primary Nonton Button */}
            <Link
              href={targetUrl}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-background font-extrabold text-xs sm:text-sm hover:bg-accent transition-all duration-200 shadow-xl active:scale-[0.97]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Nonton Sekarang</span>
            </Link>

            {/* Secondary Buttons Grid (3 columns on mobile) */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0">
              <Link
                href={`/anime/${current.slug}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-surface-secondary/80 text-primary font-semibold text-xs hover:border-accent transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Detail Anime</span>
                <span className="sm:hidden">Detail</span>
              </Link>

              <button
                onClick={toggleBookmark}
                className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-xs font-bold transition-all duration-200 ${
                  isBookmarked
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : 'bg-surface-secondary/80 border-border text-secondary hover:text-primary hover:border-accent'
                }`}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-red-400" />
                    <span>Favorit</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tambah Favorit</span>
                    <span className="sm:hidden">Favorit</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRandomAnime}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-surface-secondary/60 text-secondary hover:text-primary hover:border-accent text-xs font-semibold transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Acak Anime</span>
                <span className="sm:hidden">Acak</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Thumbnail Selector Grid (Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col items-end space-y-3">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-widest self-start pl-1">
            Unggulan Minggu Ini
          </span>

          <div className="grid grid-cols-3 gap-2.5 w-full">
            {items.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.slug}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setProgress(0);
                  }}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border transition-all duration-300 group/thumb ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/50 scale-105 shadow-xl z-20'
                      : 'border-border/60 opacity-60 hover:opacity-100 hover:border-accent hover:scale-102'
                  }`}
                >
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-secondary" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                  <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white line-clamp-1 text-left">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Controls & Progress ── */}
      {total > 1 && (
        <>
          {/* Nav Arrows — always visible on mobile, hover only on desktop */}
          <button
            onClick={prevSlide}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-surface/80 border border-border text-secondary hover:text-primary hover:bg-surface-elevated transition-all shadow-xl sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-surface/80 border border-border text-secondary hover:text-primary hover:bg-surface-elevated transition-all shadow-xl sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Dot indicators — mobile-friendly tap targets */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentIndex(idx); setProgress(0); }}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? 'w-5 h-1.5 bg-primary'
                    : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Bottom Progress Bar (CSS Accelerated) */}
          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-neutral-800/50 z-30 overflow-hidden">
            <div
              key={currentIndex}
              className="h-full bg-accent w-full origin-left transform-gpu"
              style={{
                animation: 'heroProgress 5s linear infinite',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
