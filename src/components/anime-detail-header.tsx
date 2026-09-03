'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimeDetail } from '@/types';
import { Star, Building2, Calendar, Play, Bookmark, BookmarkCheck, Share2, Check, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface AnimeDetailHeaderProps {
  detail: AnimeDetail;
}

export function AnimeDetailHeader({ detail }: AnimeDetailHeaderProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('animehub_bookmarks');
      if (saved) {
        const bookmarks: AnimeDetail[] = JSON.parse(saved);
        setIsBookmarked(bookmarks.some((b) => b.slug === detail.slug));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [detail.slug]);

  const toggleBookmark = () => {
    try {
      const saved = localStorage.getItem('animehub_bookmarks');
      let bookmarks: { slug: string; title: string; thumbnail?: string; type?: string }[] = saved
        ? JSON.parse(saved)
        : [];

      if (isBookmarked) {
        bookmarks = bookmarks.filter((b) => b.slug !== detail.slug);
        setIsBookmarked(false);
      } else {
        bookmarks.unshift({
          slug: detail.slug,
          title: detail.title,
          thumbnail: detail.thumbnail,
          type: detail.type,
        });
        setIsBookmarked(true);
      }
      localStorage.setItem('animehub_bookmarks', JSON.stringify(bookmarks));
      window.dispatchEvent(new Event('bookmarks-updated'));
    } catch {
      // Ignore
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: detail.title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Ignore copy error
    }
  };

  const sortedEpisodes = [...detail.episodes].sort((a, b) => a.number - b.number);
  const firstEp = sortedEpisodes[0];
  const latestEp = sortedEpisodes[sortedEpisodes.length - 1];

  const needsTruncation = (detail.description?.length ?? 0) > 280;
  const displayedSynopsis =
    needsTruncation && !isExpanded
      ? `${detail.description?.slice(0, 280)}...`
      : detail.description;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-surface border border-border">
      {/* Dynamic Ambient Blur Backdrop */}
      {detail.thumbnail && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 blur-3xl scale-125">
          <Image
            src={detail.thumbnail}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="relative z-10 p-6 sm:p-8 md:p-10 grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Poster Column */}
        <div className="md:col-span-1 space-y-4">
          <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface-secondary border border-border shadow-2xl group">
            {detail.thumbnail ? (
              <Image
                src={detail.thumbnail}
                alt={detail.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-secondary text-xs">
                Tidak Ada Sampul
              </div>
            )}

            {detail.type && (
              <span className="glass-badge absolute top-3 left-3 text-[10px] font-extrabold tracking-widest px-2 py-0.5 rounded text-primary uppercase">
                {detail.type}
              </span>
            )}
            {detail.status && (
              <span
                className={`absolute top-3 right-3 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                  detail.status.toLowerCase().includes('sedang') || detail.status.toLowerCase().includes('ongoing')
                    ? 'bg-red-600/90 text-white badge-onair shadow-md'
                    : 'bg-emerald-600/90 text-white'
                }`}
              >
                {detail.status}
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="space-y-2 pt-1">
            {firstEp && (
              <Link
                href={`/watch/${firstEp.slug}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-background font-bold text-sm hover:bg-accent transition-all duration-200 shadow-md active:scale-98"
              >
                <Play className="w-4 h-4 fill-current" />
                Episode 1
              </Link>
            )}
            {latestEp && latestEp.number !== firstEp?.number && (
              <Link
                href={`/watch/${latestEp.slug}`}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-surface-secondary border border-border text-primary font-semibold text-xs hover:border-accent transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Episode Terbaru (Ep {latestEp.number})
              </Link>
            )}
          </div>
        </div>

        {/* Main Details Column */}
        <div className="md:col-span-3 space-y-6">
          {/* Header & Titles */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              {detail.rating && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Rating {detail.rating.toFixed(1)} / 10</span>
                </div>
              )}
              {detail.studio && (
                <span className="text-xs font-medium text-secondary bg-surface-secondary px-2.5 py-1 rounded-md border border-border inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Studio: {detail.studio}
                </span>
              )}
              {detail.season && (
                <span className="text-xs font-medium text-secondary bg-surface-secondary px-2.5 py-1 rounded-md border border-border inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Musim: {detail.season}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-primary leading-tight">
              {detail.title}
            </h1>

            {detail.alternativeTitles && detail.alternativeTitles.length > 0 && (
              <p className="text-xs text-secondary font-medium italic">
                {detail.alternativeTitles.join(' • ')}
              </p>
            )}
          </div>

          {/* Genre Pills */}
          {detail.genres && detail.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {detail.genres.map((genre) => {
                const genreSlug = genre.toLowerCase().replace(/\s+/g, '-');
                return (
                  <Link
                    key={genre}
                    href={`/genre/${genreSlug}`}
                    className="px-3 py-1 rounded-md text-xs font-medium text-secondary bg-surface-secondary border border-border hover:text-primary hover:border-accent transition-all duration-150"
                  >
                    {genre}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Interactive Synopsis Section */}
          <div className="space-y-2 pt-2 border-t border-border/80">
            <h2 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" />
              Sinopsis
            </h2>

            {detail.description ? (
              <div className="space-y-2">
                <p className="text-sm text-secondary/90 leading-relaxed whitespace-pre-line">
                  {displayedSynopsis}
                </p>
                {needsTruncation && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs font-semibold text-primary hover:underline focus:outline-none inline-flex items-center gap-1 pt-1"
                  >
                    <span>{isExpanded ? 'Sembunyikan' : 'Baca Selengkapnya'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-secondary italic">Sinopsis belum tersedia untuk anime ini.</p>
            )}
          </div>

          {/* Action Tools: Bookmark & Share */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
            <button
              onClick={toggleBookmark}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                isBookmarked
                  ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                  : 'bg-surface-secondary border-border text-secondary hover:text-primary hover:border-accent'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-red-400" />
                  Tersimpan di Favorit
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Simpan ke Favorit
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-secondary border border-border text-secondary hover:text-primary hover:border-accent text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Link Tersalin!' : 'Bagikan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
