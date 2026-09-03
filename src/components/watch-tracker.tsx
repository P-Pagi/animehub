'use client';

import { useEffect } from 'react';
import { WatchHistoryItem } from './continue-watching';

interface WatchTrackerProps {
  slug: string;
  title: string;
  animeTitle?: string;
  animeSlug?: string;
  episodeNumber?: number;
  thumbnail?: string;
}

export function getBaseAnimeSlug(itemSlug: string, itemAnimeSlug?: string): string {
  const raw = itemAnimeSlug || itemSlug;
  return raw
    .replace(/^nonton-/, '')
    .replace(/-(episode|ep)-\d+.*$/i, '')
    .replace(/--+/g, '-')
    .trim()
    .toLowerCase();
}

export function WatchTracker({ slug, title, animeTitle, animeSlug, episodeNumber, thumbnail }: WatchTrackerProps) {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('animehub_history');
      let history: WatchHistoryItem[] = stored ? JSON.parse(stored) : [];

      const currentBaseSlug = getBaseAnimeSlug(slug, animeSlug);
      const currentTitleKey = (animeTitle || title).toLowerCase().trim();

      // Filter out ANY previous entry of the SAME anime (so 1 anime = 1 entry only, updated to latest)
      history = history.filter((item) => {
        const itemBaseSlug = getBaseAnimeSlug(item.slug, item.animeSlug);
        const itemTitleKey = (item.animeTitle || item.title).toLowerCase().trim();
        const isSameAnime =
          item.slug === slug ||
          (currentBaseSlug && itemBaseSlug === currentBaseSlug) ||
          (currentTitleKey && itemTitleKey === currentTitleKey);
        return !isSameAnime;
      });

      // Add the new episode to front
      history.unshift({
        slug,
        title,
        animeTitle,
        animeSlug,
        episodeNumber,
        thumbnail,
        watchedAt: Date.now(),
      });

      // Keep max 10 unique anime items
      localStorage.setItem('animehub_history', JSON.stringify(history.slice(0, 10)));
    } catch {
      // Ignore localStorage write error
    }
  }, [slug, title, animeTitle, animeSlug, episodeNumber, thumbnail]);

  return null;
}
