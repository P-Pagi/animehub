import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { animeService } from '@/lib/services/anime-service';
import { AnimeDetailHeader } from '@/components/anime-detail-header';
import { EpisodeList } from '@/components/episode-list';
import { AnimeGrid } from '@/components/anime-grid';
import { MaintenanceView } from '@/components/maintenance-view';

interface DetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const detail = await animeService.getDetail(slug);
    const title = `Nonton ${detail.title} Sub Indo - AnimeHub`;
    const description = detail.description
      ? detail.description.substring(0, 160)
      : `Streaming & download ${detail.title} subtitle Indonesia gratis di AnimeHub.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: detail.thumbnail ? [{ url: detail.thumbnail }] : [],
      },
    };
  } catch {
    return {
      title: 'Anime Detail - AnimeHub',
    };
  }
}

export default async function AnimeDetailPage({ params }: DetailPageProps) {
  const { slug } = await params;

  let detail;
  let popularResult;
  try {
    const [d, pop] = await Promise.all([
      animeService.getDetail(slug),
      animeService.getPopular(1),
    ]);
    detail = d;
    popularResult = pop;
  } catch (err: any) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') {
      notFound();
    }
    return <MaintenanceView message="Gagal terhubung ke server streaming untuk memuat rincian anime ini." />;
  }

  // Recommendations: filter out current anime
  const recommendations = popularResult.anime
    .filter((a) => a.slug !== detail.slug)
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Dynamic Detail Header with Ambient Blur & Synopsis */}
      <AnimeDetailHeader detail={detail} />

      {/* Episode List */}
      <EpisodeList episodes={detail.episodes} />

      {/* Recommended Anime Section */}
      {recommendations.length > 0 && (
        <div className="pt-6 border-t border-border">
          <AnimeGrid
            title="Rekomendasi Anime Popular"
            subtitle="Anime populer pilihan penonton"
            animeList={recommendations}
          />
        </div>
      )}
    </div>
  );
}
