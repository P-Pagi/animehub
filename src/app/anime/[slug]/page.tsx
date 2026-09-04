import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { animeService } from '@/lib/services/anime-service';
import { AnimeDetailHeader } from '@/components/anime-detail-header';
import { EpisodeList } from '@/components/episode-list';
import { MaintenanceView } from '@/components/maintenance-view';

interface DetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanTitle = slug
    .replace(/^nonton-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const title = `Nonton ${cleanTitle} Sub Indo - AnimeHub`;
  const description = `Streaming & download ${cleanTitle} subtitle Indonesia gratis terlengkap di AnimeHub.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function AnimeDetailPage({ params }: DetailPageProps) {
  const { slug } = await params;

  let detail;
  try {
    detail = await animeService.getDetail(slug);
  } catch (err: any) {
    if (err?.status === 404 || err?.code === 'NOT_FOUND') {
      notFound();
    }
    return <MaintenanceView message="Gagal terhubung ke server streaming untuk memuat rincian anime ini." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Dynamic Detail Header with Ambient Blur & Synopsis */}
      <AnimeDetailHeader detail={detail} />

      {/* Episode List */}
      <EpisodeList episodes={detail.episodes} />
    </div>
  );
}
