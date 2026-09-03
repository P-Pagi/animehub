import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { animeService } from '@/lib/services/anime-service';
import { EpisodeList } from '@/components/episode-list';
import { AnimeGrid } from '@/components/anime-grid';
import { WatchTracker } from '@/components/watch-tracker';
import { VideoPlayer } from '@/components/video-player';
import { NobarRoom } from '@/components/nobar-room';
import { MaintenanceView } from '@/components/maintenance-view';
import { AdSlot } from '@/components/ad-slot';
import { Anime, AnimeDetail, EpisodeDetail } from '@/types';

interface WatchPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ nobar?: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanTitle = slug
    .replace(/^nonton-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `Nonton ${cleanTitle} Sub Indo - AnimeHub`;
  return {
    title,
    description: `Streaming & nonton ${cleanTitle} subtitle Indonesia gratis di AnimeHub.`,
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const isNobarActive = !!sParams?.nobar;

  let episode: EpisodeDetail;
  let animeDetail: AnimeDetail | null = null;
  let recommendations: Anime[] = [];

  try {
    episode = await animeService.getWatchEpisode(slug);

    // Parallelise animeDetail + popular (both cached)
    const [detailResult, popularResult] = await Promise.allSettled([
      episode.animeSlug ? animeService.getDetail(episode.animeSlug) : Promise.resolve(null),
      animeService.getPopular(1),
    ]);

    if (detailResult.status === 'fulfilled') animeDetail = detailResult.value;
    if (popularResult.status === 'fulfilled' && popularResult.value?.anime) {
      recommendations = popularResult.value.anime
        .filter((a) => a.slug !== episode.animeSlug)
        .slice(0, 10);
    }

    // Dynamic resolution of prev/next episode slugs from animeDetail episode list
    if (animeDetail && animeDetail.episodes && animeDetail.episodes.length > 0) {
      const epList = animeDetail.episodes;
      const currentIdx = epList.findIndex(
        (ep) => ep.slug === slug || ep.number === episode.episodeNumber
      );

      if (currentIdx !== -1) {
        const isDescending =
          epList.length > 1 &&
          (epList[0].number > epList[epList.length - 1].number ||
            epList[0].slug.localeCompare(epList[epList.length - 1].slug) > 0);

        if (isDescending) {
          episode.nextEpisodeSlug = currentIdx > 0 ? epList[currentIdx - 1].slug : null;
          episode.prevEpisodeSlug = currentIdx < epList.length - 1 ? epList[currentIdx + 1].slug : null;
        } else {
          episode.prevEpisodeSlug = currentIdx > 0 ? epList[currentIdx - 1].slug : null;
          episode.nextEpisodeSlug = currentIdx < epList.length - 1 ? epList[currentIdx + 1].slug : null;
        }
      }
    }
  } catch (err: any) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') {
      notFound();
    }
    const isRateLimit =
      err?.status === 429 ||
      err?.statusCode === 429 ||
      String(err?.message || '').toLowerCase().includes('rate limit') ||
      String(err?.message || '').includes('429');

    if (isRateLimit) {
      return (
        <MaintenanceView
          message="Server provider sedang membatasi batas akses (Rate Limit 429). Silakan tunggu 1-2 menit lalu muat ulang halaman ini."
        />
      );
    }
    return <MaintenanceView message={`Gagal memuat episode: ${err?.message || 'Gagal terhubung ke server.'}`} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Tracker for Continue Watching history */}
      <WatchTracker
        slug={slug}
        title={episode.title}
        animeTitle={episode.animeTitle}
        animeSlug={episode.animeSlug}
        episodeNumber={episode.episodeNumber}
        thumbnail={episode.thumbnail || animeDetail?.thumbnail}
      />

      {/* Header with Focused Back Button */}
      <div className="space-y-3">
        <Link
          href={`/anime/${episode.animeSlug}`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border text-secondary hover:text-primary hover:border-accent active:scale-95 transition-all text-xs font-semibold shadow-sm w-fit group"
        >
          <ArrowLeft className="w-4 h-4 text-accent transition-transform group-hover:-translate-x-0.5 shrink-0" />
          <span className="truncate max-w-[260px] sm:max-w-md">{episode.animeTitle}</span>
        </Link>
        <h1 className="text-base sm:text-xl font-bold text-primary tracking-tight leading-snug line-clamp-2">{episode.title}</h1>
      </div>

      {/* Player Ad Banner */}
      <AdSlot position="playerBanner" />

      {/* Video Container */}
      {episode.embedUrl ? (
        <VideoPlayer
          embedUrl={episode.embedUrl}
          title={episode.title}
          sourceUrl={episode.sourceUrl}
          availableServers={episode.availableServers}
          downloadOptions={episode.downloadOptions}
          isNobarActive={isNobarActive}
        />
      ) : (
        <div className="w-full aspect-video rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-white">Video Tidak Tersedia</p>
            <p className="text-xs text-neutral-400">Sumber video episode ini tidak dapat ditemukan.</p>
          </div>
          {episode.sourceUrl && (
            <a
              href={episode.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black transition-all active:scale-95"
            >
              Buka Sumber Langsung
            </a>
          )}
        </div>
      )}

      {/* Real-Time Nobar (Watch Together) Feature — wrapped in Suspense because NobarRoom uses useSearchParams() */}
      <Suspense fallback={
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-neutral-800" />
        </div>
      }>
        <NobarRoom
          slug={slug}
          animeTitle={episode.animeTitle}
          episodeTitle={episode.title}
          poster={episode.poster || episode.thumbnail}
          availableServers={episode.availableServers}
          embedUrl={episode.embedUrl}
        />
      </Suspense>

      {/* Episode Controls — symmetrical grid layout */}
      <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
        {episode.prevEpisodeSlug ? (
          <Link
            href={`/watch/${episode.prevEpisodeSlug}`}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-secondary hover:text-primary hover:border-accent active:scale-[0.97] transition-all text-center"
          >
            ← Ep Sebelumnya
          </Link>
        ) : (
          <span className="flex items-center justify-center px-4 py-3 rounded-xl bg-surface/50 border border-border/40 text-secondary/40 cursor-not-allowed text-center">
            ← Ep Sebelumnya
          </span>
        )}

        {episode.nextEpisodeSlug ? (
          <Link
            href={`/watch/${episode.nextEpisodeSlug}`}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-secondary hover:text-primary hover:border-accent active:scale-[0.97] transition-all text-center"
          >
            Ep Selanjutnya →
          </Link>
        ) : (
          <span className="flex items-center justify-center px-4 py-3 rounded-xl bg-surface/50 border border-border/40 text-secondary/40 cursor-not-allowed text-center">
            Ep Selanjutnya →
          </span>
        )}
      </div>

      {/* Episode Selector List */}
      {animeDetail && animeDetail.episodes.length > 0 && (
        <EpisodeList episodes={animeDetail.episodes} currentEpisodeSlug={slug} />
      )}

      {/* Rekomendasi Anime Section */}
      {recommendations.length > 0 && (
        <div className="pt-6 border-t border-border">
          <AnimeGrid
            title="Rekomendasi Anime Untukmu"
            subtitle="Anime pilihan menarik lainnya yang patut kamu tonton"
            animeList={recommendations}
          />
        </div>
      )}
    </div>
  );
}
