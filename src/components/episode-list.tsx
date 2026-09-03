'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Episode } from '@/types';
import { Search, ArrowUpDown, Play, X, ChevronDown, ChevronUp } from 'lucide-react';

interface EpisodeListProps {
  episodes: Episode[];
  currentEpisodeSlug?: string;
}

export function EpisodeList({ episodes, currentEpisodeSlug }: EpisodeListProps) {
  const [search, setSearch] = useState('');
  const [isReversed, setIsReversed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  let filtered = episodes.filter((ep) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      ep.number.toString().includes(q) ||
      (ep.title && ep.title.toLowerCase().includes(q))
    );
  });

  if (isReversed) {
    filtered = [...filtered].reverse();
  }

  // On mobile, show only 20 episodes by default unless expanded
  const MOBILE_LIMIT = 20;
  const isSearching = search.trim().length > 0;
  const showAll = expanded || isSearching;
  const displayedEpisodes = showAll ? filtered : filtered.slice(0, MOBILE_LIMIT);
  const hasMore = filtered.length > MOBILE_LIMIT && !isSearching;

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-primary tracking-tight">Daftar Episode</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-secondary text-secondary border border-border">
            {episodes.length}
          </span>
        </div>
        <button
          onClick={() => setIsReversed(!isReversed)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-secondary border border-border text-[11px] text-secondary font-semibold hover:text-primary transition-colors"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span className="hidden xs:inline">{isReversed ? 'Terlama' : 'Terbaru'}</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 border-b border-border/60 bg-background/40">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-secondary absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari episode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface text-primary placeholder-secondary text-xs rounded-xl pl-8 pr-8 py-2 border border-border focus:outline-none focus:border-accent transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 text-secondary hover:text-primary p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Episode Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-secondary text-xs px-4">
          Tidak ada episode yang cocok dengan &quot;{search}&quot;.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 p-4">
            {displayedEpisodes.map((ep) => {
              const isActive = currentEpisodeSlug === ep.slug;
              return (
                <Link
                  key={ep.slug}
                  href={`/watch/${ep.slug}`}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-center text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-background border-primary shadow-md scale-[1.03]'
                      : 'bg-surface-secondary border-border/80 text-secondary hover:text-primary hover:border-accent hover:bg-surface-elevated active:scale-[0.97]'
                  }`}
                >
                  {isActive && <Play className="w-3 h-3 fill-current shrink-0" />}
                  <span>Ep {ep.number}</span>
                </Link>
              );
            })}
          </div>

          {/* Show More / Less Toggle */}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-secondary hover:text-primary border-t border-border/60 bg-background/30 hover:bg-surface-secondary/40 transition-all"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Tampilkan Lebih Sedikit
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Tampilkan {filtered.length - MOBILE_LIMIT} Episode Lainnya
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
