'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Star, ChevronRight, X, Film, Tv } from 'lucide-react';
import { Anime } from '@/types';

interface SearchAutocompleteProps {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onSearchSubmit?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchAutocomplete({
  placeholder = 'Cari anime...',
  className = '',
  inputClassName = '',
  autoFocus = false,
  onSearchSubmit,
  inputRef: externalInputRef,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const internalInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = externalInputRef || internalInputRef;
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search fetching with AbortController to prevent race conditions
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setResults(json.data.slice(0, 6));
          } else {
            setResults([]);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard ESC
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      if (onSearchSubmit) onSearchSubmit();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectAnime = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    if (onSearchSubmit) onSearchSubmit();
    const isEpLink = slug.startsWith('nonton-');
    const targetUrl = isEpLink ? `/watch/${slug}` : `/anime/${slug}`;
    router.push(targetUrl);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <Search className="w-4 h-4 text-secondary absolute left-3.5 pointer-events-none z-10" />
        <input
          ref={actualInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full bg-surface text-primary placeholder-secondary text-xs rounded-xl pl-9 pr-14 py-2 border border-border focus:outline-none focus:border-accent focus:bg-surface-elevated transition-all duration-200 ${inputClassName}`}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="text-secondary hover:text-primary p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Autocomplete Results Preview Dropdown (100% Opaque Solid Dark Card) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[99] bg-[#141416] border border-border/80 rounded-2xl shadow-2xl overflow-hidden divide-y divide-border/60 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Status */}
          <div className="px-3.5 py-2.5 bg-[#1a1a1d] flex items-center justify-between border-b border-border/60">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
              {isLoading ? 'Mencari Anime...' : `Hasil Pencarian (${results.length})`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-secondary hover:text-primary font-semibold"
            >
              Tutup (ESC)
            </button>
          </div>

          {/* Results List */}
          {isLoading ? (
            <div className="p-4 space-y-3 bg-[#141416]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-14 bg-surface-elevated rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-surface-elevated rounded w-3/4" />
                    <div className="h-2.5 bg-surface-elevated rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[380px] overflow-y-auto py-1 scrollbar-thin bg-[#141416]">
              {results.map((anime) => (
                <button
                  key={anime.id || anime.slug}
                  type="button"
                  onClick={() => handleSelectAnime(anime.slug)}
                  className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#202024] transition-colors text-left group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-surface-secondary border border-border/80 shrink-0 group-hover:border-accent/60 transition-colors">
                    {anime.thumbnail ? (
                      <Image
                        src={anime.thumbnail}
                        alt={anime.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-secondary text-[9px] text-secondary">
                        N/A
                      </div>
                    )}
                  </div>

                  {/* Information */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-primary group-hover:text-accent transition-colors truncate">
                      {anime.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-secondary">
                      {anime.type && (
                        <span className="px-1.5 py-0.5 rounded bg-surface-secondary border border-border font-semibold flex items-center gap-1">
                          {anime.type === 'Movie' ? <Film className="w-2.5 h-2.5 text-accent" /> : <Tv className="w-2.5 h-2.5 text-accent" />}
                          {anime.type}
                        </span>
                      )}
                      {anime.rating && (
                        <span className="font-bold text-amber-400 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          {anime.rating.toFixed(1)}
                        </span>
                      )}
                      {anime.status && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          anime.isAiring || anime.status.toLowerCase().includes('ongoing')
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {anime.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-secondary/50 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="p-6 text-center text-xs text-secondary space-y-1 bg-[#141416]">
              <p className="font-semibold text-primary">Tidak ada anime yang cocok</p>
              <p className="text-[11px]">Coba cari dengan kata kunci lain seperti &quot;Solo Leveling&quot; atau &quot;Naruto&quot;</p>
            </div>
          ) : null}

          {/* Footer View All Button */}
          {query.trim().length >= 2 && (
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full px-3.5 py-2.5 bg-[#1a1a1d] hover:bg-[#202024] text-xs font-bold text-accent hover:text-primary transition-colors flex items-center justify-between border-t border-border"
            >
              <span className="truncate">Lihat semua hasil pencarian &quot;{query.trim()}&quot;</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
