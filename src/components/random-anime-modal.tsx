'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Dices, Play, RefreshCw, X, Star } from 'lucide-react';
import { Anime } from '@/types';

interface ExtendedAnime extends Omit<Anime, 'episodes'> {
  studio?: string;
  season?: string;
  totalEpisodeCount?: number | string;
  episodes?: unknown;
}

interface RandomAnimeModalProps {
  variant?: 'pill' | 'icon';
}

export function RandomAnimeModal({ variant = 'pill' }: RandomAnimeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anime, setAnime] = useState<ExtendedAnime | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchRandomAnime = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/anime/random');
      const json = await res.json();
      if (json.success && json.anime) {
        setAnime(json.anime);
      }
    } catch {
      // Ignore error
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!anime) {
      fetchRandomAnime();
    }
  };

  const renderModalContent = () => (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col my-auto">

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <h3 className="text-sm font-bold text-white">
            Rekomendasi Anime
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 shrink-0">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-neutral-400">Mencari anime acak...</p>
          </div>
        ) : anime ? (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 scrollbar-thin">

            {/* Poster & Title Info */}
            <div className="flex gap-3.5 items-start">
              {/* Poster Thumbnail */}
              <div className="relative w-24 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                {anime.thumbnail ? (
                  <Image
                    src={anime.thumbnail}
                    alt={anime.title}
                    fill
                    className="object-cover object-top"
                    sizes="96px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                    No Image
                  </div>
                )}
                {anime.rating && (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    <span>{anime.rating}</span>
                  </div>
                )}
              </div>

              {/* Anime Metadata */}
              <div className="flex-1 space-y-2 min-w-0">
                <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                  {anime.title}
                </h4>

                <div className="flex flex-wrap gap-1.5 text-[11px] text-neutral-400">
                  {anime.type && (
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium">
                      {anime.type}
                    </span>
                  )}
                  {anime.status && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                      {anime.status}
                    </span>
                  )}
                </div>

                {(anime.totalEpisodeCount !== undefined || anime.episodes !== undefined) && (
                  <p className="text-xs text-neutral-400">
                    Episode:{' '}
                    <span className="text-neutral-200 font-medium">
                      {anime.totalEpisodeCount !== undefined
                        ? anime.totalEpisodeCount
                        : Array.isArray(anime.episodes)
                          ? anime.episodes.length
                          : String(anime.episodes)}
                    </span>
                  </p>
                )}

                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {anime.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-[10px] text-neutral-300"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Synopsis */}
            {anime.description && (
              <p className="text-xs text-neutral-300 leading-relaxed line-clamp-4 pt-1">
                {anime.description}
              </p>
            )}
          </div>
        ) : null}

        {/* Action Buttons */}
        {anime && (
          <div className="grid grid-cols-2 gap-2.5 pt-2 shrink-0 border-t border-neutral-800">
            <button
              onClick={fetchRandomAnime}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Acak Lagi</span>
            </button>

            <Link
              href={`/anime/${anime.slug}`}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Nonton</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Trigger Button Variants */}
      {variant === 'icon' ? (
        <button
          onClick={handleOpen}
          type="button"
          aria-label="Acak Anime"
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <Dices className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-neutral-300 hidden sm:inline">Acak</span>
        </button>
      ) : (
        <button
          onClick={handleOpen}
          type="button"
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800"
        >
          <Dices className="w-3.5 h-3.5 text-amber-400" />
          <span>Acak</span>
        </button>
      )}

      {/* Render Modal into document.body using React Portal */}
      {isOpen && mounted && createPortal(renderModalContent(), document.body)}
    </>
  );
}
