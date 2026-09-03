'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimeCard } from '@/components/anime-card';
import { Anime } from '@/types';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Anime[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('animehub_bookmarks');
      if (saved) {
        const list = JSON.parse(saved);
        setBookmarks(
          list.map((item: { slug: string; title: string; thumbnail?: string; type?: string }) => ({
            id: item.slug,
            slug: item.slug,
            title: item.title,
            thumbnail: item.thumbnail,
            type: item.type,
            sourceUrl: `https://v2.samehadaku.how/anime/${item.slug}/`,
          }))
        );
      }
    } catch {
      // Ignore
    } finally {
      setLoaded(true);
    }
  }, []);

  const clearBookmarks = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua anime favorit?')) {
      localStorage.removeItem('animehub_bookmarks');
      setBookmarks([]);
      window.dispatchEvent(new Event('bookmarks-updated'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-[60vh]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Anime Favorit Saya</h1>
          <p className="text-xs text-secondary mt-1">Daftar anime yang kamu simpan untuk ditonton nanti.</p>
        </div>

        {bookmarks.length > 0 && (
          <button
            onClick={clearBookmarks}
            className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="text-center py-12 text-secondary text-sm">Memuat daftar favorit...</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16 space-y-4 border border-border rounded-xl bg-surface">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-primary">Belum ada anime favorit</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              Klik tombol &quot;Simpan ke Favorit&quot; di halaman detail anime untuk menyimpannya di sini.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-primary text-background text-xs font-bold hover:bg-accent transition-colors"
          >
            Jelajahi Anime Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {bookmarks.map((anime) => (
            <AnimeCard key={anime.slug} anime={anime} />
          ))}
        </div>
      )}
    </div>
  );
}
