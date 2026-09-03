'use client';

import Link from 'next/link';
import { Compass, ChevronRight } from 'lucide-react';

const POPULAR_GENRES = [
  { name: 'Trending', slug: '' },
  { name: 'Action', slug: 'action' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Isekai', slug: 'isekai' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Sci-Fi', slug: 'sci-fi' },
  { name: 'School', slug: 'school' },
  { name: 'Slice of Life', slug: 'slice-of-life' },
  { name: 'Misteri', slug: 'mystery' },
  { name: 'Movie', slug: 'movie' },
];

export function GenreBar() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <span>Kategori Pilihan</span>
        </h3>
        <Link href="/genre" className="text-xs font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5">
          <span>Lihat Semua Genre</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {POPULAR_GENRES.map((g) => (
          <Link
            key={g.slug || 'home'}
            href={g.slug ? `/genre/${g.slug}` : '/'}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface border border-border text-secondary hover:text-primary hover:border-accent hover:bg-surface-elevated transition-all duration-200"
          >
            {g.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
