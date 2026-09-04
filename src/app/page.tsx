import Link from 'next/link';
import { ChevronRight, Film } from 'lucide-react';
import { animeService } from '@/lib/services/anime-service';
import { AnimeGrid } from '@/components/anime-grid';
import { HeroBanner } from '@/components/hero-banner';
import dynamic from 'next/dynamic';
import { MaintenanceView } from '@/components/maintenance-view';
import { TodayScheduleStrip } from '@/components/today-schedule-strip';
import { AdSlot } from '@/components/ad-slot';

const ContinueWatching = dynamic(() => import('@/components/continue-watching').then((mod) => mod.ContinueWatching));
const GenreBar = dynamic(() => import('@/components/genre-bar').then((mod) => mod.GenreBar));

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);

  let latestAnimeList: any[] = [];
  let onAirAnimeList: any[] = [];
  let popularAnimeList: any[] = [];
  let moviesAnimeList: any[] = [];
  let errorMsg: string | null = null;

  try {
    // Staggered fetching to prevent burst rate-limiting to Samehadaku API
    const latestRes = await animeService.getLatest(page).catch(() => null);
    const onAirRes  = await animeService.getOnAir().catch(() => null);
    const moviesRes = await animeService.getMovies(1).catch(() => null);

    if (latestRes)  latestAnimeList = latestRes.anime;
    if (onAirRes)   onAirAnimeList  = onAirRes.anime;
    if (moviesRes)  moviesAnimeList = moviesRes.anime;

    if (
      latestAnimeList.length === 0 &&
      onAirAnimeList.length === 0 &&
      moviesAnimeList.length === 0
    ) {
      errorMsg = 'Gagal terhubung ke server provider. Silakan coba beberapa saat lagi.';
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Gagal memuat daftar anime.';
  }

  // Carousel Items: Combine top items from onAir and latest for Hero Banner (No extra API call required)
  const featuredItems = [
    ...onAirAnimeList.slice(0, 3),
    ...latestAnimeList.slice(0, 3),
  ].filter(
    (item, index, self) => index === self.findIndex((t) => t.slug === item.slug)
  ).slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-7 sm:space-y-12">
      {/* ── 1. Redesigned Hero Banner (Page 1) ── */}
      {page === 1 && featuredItems.length > 0 && <HeroBanner items={featuredItems} />}

      {/* ── Header Ad Banner ── */}
      <AdSlot position="headerBanner" />

      {/* ── 2. Quick Genre Chips Bar ── */}
      {page === 1 && <GenreBar />}

      {/* ── 3. Jadwal Tayang Hari Ini (Today's Schedule Strip Widget) ── */}
      {page === 1 && <TodayScheduleStrip />}

      {/* ── 4. Continue Watching (Client-side localStorage) ── */}
      {page === 1 && <ContinueWatching />}

      {errorMsg || (latestAnimeList.length === 0 && popularAnimeList.length === 0 && page === 1) ? (
        <MaintenanceView message={errorMsg || 'Data anime sedang tidak dapat diakses saat ini.'} />
      ) : (
        <>
          {/* ── 4. Sedang Tayang Section ── */}
          {page === 1 && onAirAnimeList.length > 0 && (
            <AnimeGrid
              title="Sedang Tayang"
              subtitle="Daftar anime rilisan episode terbaru minggu ini"
              animeList={onAirAnimeList}
            />
          )}

          {/* ── 5. Film Anime (Movie) Section ── */}
          {page === 1 && moviesAnimeList.length > 0 && (
            <div className="pt-4 border-t border-border/60">
              <AnimeGrid
                title="Film Anime & Movie"
                subtitle="Koleksi film layar lebar dan movie anime populer"
                animeList={moviesAnimeList}
                action={
                  <Link
                    href="/genre/movie"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition-colors whitespace-nowrap"
                  >
                    <span>Lihat Semua Movie</span>
                    <ChevronRight className="w-3.5 h-3.5 text-accent" />
                  </Link>
                }
              />
            </div>
          )}

          {/* ── 6. Baru Ditambah Section ── */}
          <div className="space-y-6 pt-4 border-t border-border/60">
            <AnimeGrid
              title="Baru Ditambah"
              subtitle="Daftar anime yang baru saja ditambahkan"
              animeList={latestAnimeList}
              action={
                <Link
                  href="/popular"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition-colors whitespace-nowrap"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3.5 h-3.5 text-accent" />
                </Link>
              }
            />
          </div>

          {/* ── 7. Terpopuler Preview Section ── */}
          {page === 1 && popularAnimeList.length > 0 && (
            <div className="pt-4 border-t border-border/60">
              <AnimeGrid
                title="Terpopuler"
                subtitle="Daftar anime dengan jumlah penonton terbanyak"
                animeList={popularAnimeList}
                action={
                  <Link
                    href="/popular"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition-colors whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Lihat Semua Popular</span>
                    <span className="sm:hidden">Lihat Semua</span>
                    <ChevronRight className="w-3.5 h-3.5 text-accent" />
                  </Link>
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
