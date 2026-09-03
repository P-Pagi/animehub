import Link from 'next/link';
import { Metadata } from 'next';
import { animeService } from '@/lib/services/anime-service';
import { AnimeGrid } from '@/components/anime-grid';
import { Pagination } from '@/components/pagination';
import { MaintenanceView } from '@/components/maintenance-view';

export const metadata: Metadata = {
  title: 'Anime Terpopuler - AnimeHub',
  description: 'Daftar anime paling populer dan terbanyak ditonton.',
};

// Popular anime type filters
const TYPE_FILTERS = [
  { label: 'Semua Tipe', value: '' },
  { label: 'TV Series', value: 'TV' },
  { label: 'Movie', value: 'Movie' },
  { label: 'ONA', value: 'ONA' },
  { label: 'OVA', value: 'OVA' },
  { label: 'Special', value: 'Special' },
];

interface PopularPageProps {
  searchParams: Promise<{ page?: string; type?: string }>;
}

export default async function PopularPage({ searchParams }: PopularPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const typeFilter = params.type || '';

  let animeList: any[] = [];
  let hasNextPage = false;
  let errorMsg: string | null = null;

  try {
    const result = await animeService.getPopular(page);
    animeList = result.anime;
    hasNextPage = result.hasNextPage;
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Gagal memuat anime populer.';
  }

  // Filter by type
  const filteredAnime = typeFilter
    ? animeList.filter((a) => a.type?.toLowerCase() === typeFilter.toLowerCase())
    : animeList;

  const prevUrl = `/popular?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ''}`;
  const nextUrl = `/popular?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ''}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Katalog Anime</h1>
        <p className="text-xs text-secondary">Jelajahi 400+ judul anime lengkap dengan subtitle Indonesia. Halaman {page} dari ~18.</p>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => {
          const isActive = typeFilter === f.value;
          const href = f.value
            ? `/popular?type=${f.value}${page > 1 ? `&page=${page}` : ''}`
            : `/popular${page > 1 ? `?page=${page}` : ''}`;

          return (
            <Link
              key={f.value}
              href={href}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${isActive
                  ? 'bg-primary text-background border-primary shadow-md'
                  : 'bg-surface border-border text-secondary hover:text-primary hover:border-accent'
                }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {errorMsg || animeList.length === 0 ? (
        <MaintenanceView message={errorMsg || 'Gagal memuat katalog anime dari server.'} />
      ) : (
        <>
          <AnimeGrid animeList={filteredAnime} />

          {/* Mobile-First Pagination */}
          <Pagination
            currentPage={page}
            hasNextPage={hasNextPage}
            prevUrl={prevUrl}
            nextUrl={nextUrl}
          />
        </>
      )}
    </div>
  );
}
