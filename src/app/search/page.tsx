import { Metadata } from 'next';
import { animeService } from '@/lib/services/anime-service';
import { AnimeGrid } from '@/components/anime-grid';
import { AdvancedSearch } from '@/components/advanced-search';
import { Pagination } from '@/components/pagination';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string }>;
}): Promise<Metadata> {
  const { q, genre } = await searchParams;
  const titleStr = q
    ? `Hasil Pencarian "${q}" - AnimeHub`
    : genre
    ? `Pencarian Kategori "${genre}" - AnimeHub`
    : 'Cari Anime - AnimeHub';

  return {
    title: titleStr,
  };
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    type?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const genreFilter = params.genre || '';
  const typeFilter = params.type || '';
  const statusFilter = params.status || '';
  const page = parseInt(params.page || '1', 10);

  let searchList: any[] = [];
  let hasNextPage = false;
  let errorMsg: string | null = null;

  try {
    const pageOffset = (page - 1) * 2 + 1;

    if (query.trim()) {
      const [res1, res2] = await Promise.all([
        animeService.search(query.trim(), pageOffset),
        animeService.search(query.trim(), pageOffset + 1),
      ]);
      searchList = [...res1.anime, ...res2.anime].slice(0, 20);
      hasNextPage = res2.hasNextPage;
    } else if (genreFilter) {
      const [res1, res2] = await Promise.all([
        animeService.getGenre(genreFilter, pageOffset),
        animeService.getGenre(genreFilter, pageOffset + 1),
      ]);
      searchList = [...res1.anime, ...res2.anime].slice(0, 20);
      hasNextPage = res2.hasNextPage;
    } else {
      // Default to popular listing if search page is opened without query
      const [res1, res2] = await Promise.all([
        animeService.getPopular(pageOffset),
        animeService.getPopular(pageOffset + 1),
      ]);
      searchList = [...res1.anime, ...res2.anime].slice(0, 20);
      hasNextPage = res2.hasNextPage;
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Gagal melakukan pencarian.';
  }

  // Filter client-side by type and status if specified
  let filteredList = searchList;
  if (typeFilter) {
    filteredList = filteredList.filter((a) => a.type?.toLowerCase() === typeFilter.toLowerCase());
  }
  if (statusFilter) {
    if (statusFilter === 'ongoing') {
      filteredList = filteredList.filter(
        (a) => a.isAiring || a.status?.toLowerCase().includes('ongoing') || a.status?.toLowerCase().includes('sedang')
      );
    } else if (statusFilter === 'completed') {
      filteredList = filteredList.filter(
        (a) => !a.isAiring && (a.status?.toLowerCase().includes('completed') || a.status?.toLowerCase().includes('tamat'))
      );
    }
  }

  const searchParamsObj = new URLSearchParams();
  if (query) searchParamsObj.set('q', query);
  if (genreFilter) searchParamsObj.set('genre', genreFilter);
  if (typeFilter) searchParamsObj.set('type', typeFilter);
  if (statusFilter) searchParamsObj.set('status', statusFilter);

  const prevUrl = `/search?${searchParamsObj.toString()}&page=${page - 1}`;
  const nextUrl = `/search?${searchParamsObj.toString()}&page=${page + 1}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-border pb-4">
        <h1 className="text-xl font-bold text-primary">
          {query
            ? `Hasil Pencarian "${query}"`
            : genreFilter
            ? `Pencarian Kategori "${genreFilter}"`
            : 'Pencarian Anime Lanjutan'}
        </h1>
        <p className="text-xs text-secondary">Temukan anime favorit berdasarkan judul, genre, tipe, dan status.</p>
      </div>

      {/* Advanced Filter Component */}
      <AdvancedSearch
        initialQuery={query}
        initialGenre={genreFilter}
        initialType={typeFilter}
        initialStatus={statusFilter}
      />

      {errorMsg ? (
        <div className="p-6 rounded-xl bg-surface border border-border text-secondary text-center text-sm">
          {errorMsg}
        </div>
      ) : filteredList.length > 0 ? (
        <>
          <AnimeGrid animeList={filteredList} />

          {/* Mobile-First Responsive Pagination */}
          <Pagination
            currentPage={page}
            hasNextPage={hasNextPage}
            prevUrl={prevUrl}
            nextUrl={nextUrl}
          />
        </>
      ) : (
        <div className="py-16 text-center border border-border rounded-xl bg-surface">
          <p className="text-secondary text-sm font-medium">Tidak ada anime yang sesuai dengan filter pencarian kamu.</p>
        </div>
      )}
    </div>
  );
}
