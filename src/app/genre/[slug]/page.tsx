import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { animeService } from '@/lib/services/anime-service';
import { AnimeGrid } from '@/components/anime-grid';
import { AdvancedSearch } from '@/components/advanced-search';
import { Pagination } from '@/components/pagination';
import { MaintenanceView } from '@/components/maintenance-view';

// Common genre slugs available on animasu.love
const KNOWN_GENRES: Record<string, string> = {
  'action': 'Aksi',
  'aksi': 'Aksi',
  'adventure': 'Petualangan',
  'petualangan': 'Petualangan',
  'comedy': 'Komedi',
  'komedi': 'Komedi',
  'drama': 'Drama',
  'fantasy': 'Fantasi',
  'fantasi': 'Fantasi',
  'horror': 'Horror',
  'isekai': 'Isekai',
  'mystery': 'Misteri',
  'misteri': 'Misteri',
  'reincarnation': 'Reinkarnasi',
  'reinkarnasi': 'Reinkarnasi',
  'romance': 'Romansa',
  'romansa': 'Romansa',
  'sci-fi': 'Sci-Fi',
  'seinen': 'Seinen',
  'shoujo': 'Shoujo',
  'shounen': 'Shounen',
  'slice-of-life': 'Slice of Life',
  'supernatural': 'Supranatural',
  'supranatural': 'Supranatural',
  'psychological': 'Psikologis',
  'psikologis': 'Psikologis',
  'military': 'Militer',
  'militer': 'Militer',
  'mecha': 'Mecha / Robot',
  'sports': 'Olahraga',
  'olahraga': 'Olahraga',
  'martial-arts': 'Bela Diri',
  'bela-diri': 'Bela Diri',
  'music': 'Musik',
  'musik': 'Musik',
  'historical': 'Sejarah',
  'sejarah': 'Sejarah',
  'school': 'Sekolah',
  'sekolahan': 'Sekolah',
  'harem': 'Harem',
  'game': 'Game',
  'super-power': 'Super Power',
  'ecchi': 'Ecchi',
  'vampire': 'Vampir',
  'vampir': 'Vampir',
  'movie': 'Movie',
  'donghua': 'Donghua',
};

interface GenrePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = KNOWN_GENRES[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    title: `Anime Kategori ${label} - AnimeHub`,
    description: `Daftar anime kategori ${label} terlengkap di AnimeHub.`,
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { slug } = await params;
  const p = await searchParams;
  const page = parseInt(p.page || '1', 10);

  const label = KNOWN_GENRES[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);

  let animeList: any[] = [];
  let hasNextPage = false;
  let errorMsg: string | null = null;

  try {
    const pageOffset = (page - 1) * 2 + 1;
    const [res1, res2] = await Promise.all([
      animeService.getGenre(slug, pageOffset),
      animeService.getGenre(slug, pageOffset + 1),
    ]);

    animeList = [...res1.anime, ...res2.anime].slice(0, 20);
    hasNextPage = res2.hasNextPage;

    if (animeList.length === 0 && page === 1) notFound();
  } catch {
    errorMsg = 'Gagal memuat anime untuk kategori ini.';
  }

  const prevUrl = `/genre/${slug}?page=${page - 1}`;
  const nextUrl = `/genre/${slug}?page=${page + 1}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-border pb-4">
        <p className="text-xs text-secondary uppercase tracking-widest font-semibold">Kategori Genre</p>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Anime Kategori {label}
        </h1>
      </div>

      {/* Advanced Filter Component */}
      <AdvancedSearch initialGenre={slug} />

      {errorMsg ? (
        <MaintenanceView message={errorMsg || 'Gagal memuat anime untuk kategori ini.'} />
      ) : (
        <>
          <AnimeGrid animeList={animeList} />

          {/* Mobile-First Pagination Controls */}
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
