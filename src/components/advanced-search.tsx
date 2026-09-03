'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, RotateCcw, Filter, Tv, Radio, X } from 'lucide-react';

const ALL_GENRES = [
  { label: 'Semua Kategori', value: '' },
  { label: 'Aksi (Action)', value: 'action' },
  { label: 'Isekai', value: 'isekai' },
  { label: 'Romansa (Romance)', value: 'romance' },
  { label: 'Fantasi (Fantasy)', value: 'fantasy' },
  { label: 'Komedi (Comedy)', value: 'comedy' },
  { label: 'Sci-Fi', value: 'sci-fi' },
  { label: 'Petualangan (Adventure)', value: 'adventure' },
  { label: 'Drama', value: 'drama' },
  { label: 'Misteri (Mystery)', value: 'mystery' },
  { label: 'Horror', value: 'horror' },
  { label: 'Slice of Life', value: 'slice-of-life' },
  { label: 'Supranatural', value: 'supernatural' },
  { label: 'Donghua', value: 'donghua' },
  { label: 'Olahraga (Sports)', value: 'sports' },
  { label: 'School / Sekolah', value: 'school' },
  { label: 'Mecha / Robot', value: 'mecha' },
];

const ALL_TYPES = [
  { label: 'Semua Tipe', value: '' },
  { label: 'TV Series', value: 'TV' },
  { label: 'Movie', value: 'Movie' },
  { label: 'ONA', value: 'ONA' },
  { label: 'OVA', value: 'OVA' },
  { label: 'Special', value: 'Special' },
];

const ALL_STATUS = [
  { label: 'Semua Status', value: '' },
  { label: 'Sedang Tayang (Ongoing)', value: 'ongoing' },
  { label: 'Tamat (Completed)', value: 'completed' },
];

interface AdvancedSearchProps {
  initialQuery?: string;
  initialGenre?: string;
  initialType?: string;
  initialStatus?: string;
}

export function AdvancedSearch({
  initialQuery = '',
  initialGenre = '',
  initialType = '',
  initialStatus = '',
}: AdvancedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [genre, setGenre] = useState(initialGenre);
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);

  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (genre && !query.trim() && !type && !status) {
      router.push(`/genre/${genre}`);
      return;
    }

    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (genre) params.set('genre', genre);
    if (type) params.set('type', type);
    if (status) params.set('status', status);

    const searchUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.push(searchUrl);
  };

  const handleReset = () => {
    setQuery('');
    setGenre('');
    setType('');
    setStatus('');
    router.push('/search');
  };

  const hasActiveFilters = Boolean(query || genre || type || status);

  return (
    <form onSubmit={handleSearch} className="p-6 rounded-2xl bg-surface border border-border space-y-5 shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div>
            <h3 className="text-sm font-extrabold text-primary tracking-tight">Pencarian & Filter Lanjutan</h3>
            <p className="text-[11px] text-secondary">Filter anime berdasarkan judul, kategori, tipe, dan status tayang</p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-secondary hover:text-primary transition-colors font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-secondary border border-border"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filter
          </button>
        )}
      </div>

      {/* Row 1: Symmetrical Input Judul + Search Button */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-accent" />
          Judul Anime
        </label>
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ketik judul anime (contoh: Solo Leveling, Tensei Shitara...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-background text-primary placeholder-secondary text-xs rounded-xl pl-4 pr-10 py-3 border border-border focus:outline-none focus:border-accent transition-all shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-background font-black text-xs hover:bg-accent transition-all duration-200 shadow-md active:scale-95"
          >
            <Search className="w-4 h-4" />
            Cari Anime Sekarang
          </button>
        </div>
      </div>

      {/* Row 2: 3 Equal-Width Filter Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
        {/* Filter Genre */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-accent" />
            Kategori / Genre
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-background text-primary text-xs rounded-xl px-3.5 py-2.5 border border-border focus:outline-none focus:border-accent transition-colors font-medium"
          >
            {ALL_GENRES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tipe */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-accent" />
            Format Tipe
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-background text-primary text-xs rounded-xl px-3.5 py-2.5 border border-border focus:outline-none focus:border-accent transition-colors font-medium"
          >
            {ALL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-accent" />
            Status Tayang
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-background text-primary text-xs rounded-xl px-3.5 py-2.5 border border-border focus:outline-none focus:border-accent transition-colors font-medium"
          >
            {ALL_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}
