import { NextResponse } from 'next/server';
import { animeService } from '@/lib/services/anime-service';

export async function GET() {
  try {
    // Pick from a random page (page 1 to 3) of popular anime
    const randomPage = Math.floor(Math.random() * 3) + 1;
    let popularResult = await animeService.getPopular(randomPage);

    if (!popularResult.anime || popularResult.anime.length === 0) {
      popularResult = await animeService.getLatest(1);
    }

    if (!popularResult.anime || popularResult.anime.length === 0) {
      return NextResponse.json({ success: false, message: 'No anime found' }, { status: 404 });
    }

    const randomBasic = popularResult.anime[Math.floor(Math.random() * popularResult.anime.length)];

    // Fetch full anime details (synopsis, genres, studio, rating, total episodes)
    try {
      const fullDetail = await animeService.getDetail(randomBasic.slug);
      if (fullDetail) {
        const episodeCount = Array.isArray(fullDetail.episodes)
          ? fullDetail.episodes.length
          : randomBasic.episodes;

        return NextResponse.json({
          success: true,
          anime: {
            ...randomBasic,
            ...fullDetail,
            thumbnail: fullDetail.thumbnail || randomBasic.thumbnail,
            description: fullDetail.description || 'Anime pilihan acak terbaik hari ini.',
            totalEpisodeCount: episodeCount,
          },
        });
      }
    } catch {
      // Fallback to basic info if detail fetch fails
    }

    return NextResponse.json({
      success: true,
      anime: {
        ...randomBasic,
        totalEpisodeCount: randomBasic.episodes,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to fetch random anime' }, { status: 500 });
  }
}
