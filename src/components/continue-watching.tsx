'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Play, Clock, Trash2, Film } from 'lucide-react';

export interface WatchHistoryItem {
  slug: string;
  title: string;
  animeTitle?: string;
  animeSlug?: string;
  episodeNumber?: number;
  thumbnail?: string;
  watchedAt: number;
}


export function ContinueWatching() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const hasEnrichedRef = useRef(false);

  const deduplicateHistory = (items: WatchHistoryItem[]): WatchHistoryItem[] => {
    const seenKeys = new Set<string>();
    const result: WatchHistoryItem[] = [];

    for (const item of items) {
      const baseSlug = (item.animeSlug || item.slug)
        .replace(/^nonton-/, '')
        .replace(/-(episode|ep)-\d+.*$/i, '')
        .replace(/--+/g, '-')
        .trim()
        .toLowerCase();
      const titleKey = (item.animeTitle || item.title).toLowerCase().trim();
      const key = baseSlug || titleKey;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(item);
      }
    }

    return result.slice(0, 10);
  };

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('animehub_history');
      if (stored) {
        let parsed = JSON.parse(stored) as WatchHistoryItem[];
        // Deduplicate history so 1 anime = 1 entry (latest episode watched)
        const uniqueItems = deduplicateHistory(parsed);
        setHistory(uniqueItems);
        localStorage.setItem('animehub_history', JSON.stringify(uniqueItems));

        if (!hasEnrichedRef.current) {
          hasEnrichedRef.current = true;
          enrichMissingThumbnails(uniqueItems);
        }
      } else {
        setHistory([]);
      }
    } catch {
      // Ignore
    }
  };

  const cleanAnimeSlug = (slug: string) => {
    return slug
      .replace(/^nonton-/, '')
      .replace(/-(episode|ep)-\d+.*$/i, '')
      .replace(/--+/g, '-')
      .trim();
  };

  const enrichMissingThumbnails = async (items: WatchHistoryItem[]) => {
    const missingItems = items.filter((item) => !item.thumbnail);
    if (missingItems.length === 0) return;

    let updated = [...items];
    let hasChanges = false;

    for (const item of missingItems) {
      let fetchedThumbnail: string | undefined;

      try {
        // STRATEGY 1: Use stored animeSlug → /api/anime/[slug] (correct endpoint)
        const rawAnimeSlug = item.animeSlug || cleanAnimeSlug(item.slug);
        // Remove 'nonton-' prefix that animasu uses (not a valid anime detail slug)
        const slugForDetail = rawAnimeSlug.replace(/^nonton-/, '');

        if (slugForDetail) {
          const detailRes = await fetch(`/api/anime/${slugForDetail}`).catch(() => null);
          if (detailRes && detailRes.ok) {
            const detailData = await detailRes.json();
            fetchedThumbnail = detailData.data?.thumbnail;
          }
        }

        // STRATEGY 2: Fetch watch endpoint → extract animeSlug → /api/anime/[cleaned-animeSlug]
        if (!fetchedThumbnail) {
          const watchRes = await fetch(`/api/anime/watch/${item.slug}`).catch(() => null);
          if (watchRes && watchRes.ok) {
            const watchData = await watchRes.json();
            // Watch endpoint may have thumbnail directly (og:image)
            if (watchData.data?.thumbnail) {
              fetchedThumbnail = watchData.data.thumbnail;
            }
            // Use animeSlug from watch response → fetch anime detail
            if (!fetchedThumbnail && watchData.data?.animeSlug) {
              const animeSlugFromWatch = watchData.data.animeSlug.replace(/^nonton-/, '');
              const detailRes2 = await fetch(`/api/anime/${animeSlugFromWatch}`).catch(() => null);
              if (detailRes2 && detailRes2.ok) {
                const detailData2 = await detailRes2.json();
                fetchedThumbnail = detailData2.data?.thumbnail;
                if (fetchedThumbnail) {
                  // Persist the cleaned animeSlug for future use
                  updated = updated.map((h) =>
                    h.slug === item.slug ? { ...h, animeSlug: animeSlugFromWatch } : h
                  );
                }
              }
            }
          }
        }

        if (fetchedThumbnail) {
          updated = updated.map((h) =>
            h.slug === item.slug ? { ...h, thumbnail: fetchedThumbnail } : h
          );
          hasChanges = true;
        }
      } catch {
        // Silently ignore
      }
    }

    if (hasChanges) {
      const finalItems = updated.slice(0, 10);
      setHistory(finalItems);
      try {
        localStorage.setItem('animehub_history', JSON.stringify(finalItems));
      } catch {
        // Ignore
      }
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = () => {
    try {
      localStorage.removeItem('animehub_history');
      setHistory([]);
    } catch {
      // Ignore
    }
  };

  if (history.length === 0) return null;

  return (
    <section className="space-y-3.5">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-primary">Lanjutkan Nonton</h2>
          <span className="text-[10px] font-extrabold bg-surface-secondary text-secondary px-2.5 py-0.5 rounded-full border border-border">
            {history.length}/10
          </span>
        </div>

        <button
          onClick={handleClearHistory}
          className="text-[11px] font-semibold text-secondary hover:text-red-400 transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border"
          title="Hapus riwayat tontonan"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hapus Riwayat</span>
        </button>
      </div>

      {/* Visual Horizontal Scrollable Cards */}
      <div className="flex items-center gap-3.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
        {history.slice(0, 10).map((item) => (
          <Link
            key={item.slug}
            href={`/watch/${item.slug}`}
            className="group relative snap-start w-60 sm:w-72 shrink-0 rounded-2xl overflow-hidden border border-border bg-surface hover:border-accent transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] flex flex-col"
          >
            {/* Card Cover Image with Gradient */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-secondary">
              {item.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.thumbnail}
                  alt={item.animeTitle || item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-3 text-center">
                  <Film className="w-6 h-6 text-accent/60 mb-1 animate-pulse" />
                  <span className="text-[11px] font-bold text-primary truncate max-w-full">
                    {item.animeTitle || item.title}
                  </span>
                </div>
              )}

              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

              {/* Episode Badge */}
              {item.episodeNumber ? (
                <span className="glass-badge absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white border border-white/20 uppercase tracking-wider shadow-md z-10">
                  Ep {item.episodeNumber}
                </span>
              ) : null}

              {/* Center Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity z-10">
                <div className="w-10 h-10 rounded-full bg-black/75 text-white border border-white/20 backdrop-blur-md flex items-center justify-center shadow-xl transform group-hover:scale-110 group-hover:bg-accent group-hover:text-background group-hover:border-accent transition-all duration-200">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* Bottom Content Metadata */}
            <div className="p-3 space-y-0.5 bg-surface">
              <h4 className="text-xs sm:text-sm font-bold text-primary group-hover:text-accent truncate transition-colors leading-snug">
                {item.animeTitle || item.title}
              </h4>
              <p className="text-[11px] font-semibold text-secondary truncate">
                {item.episodeNumber ? `Episode ${item.episodeNumber}` : item.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
