import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { animeService } from '@/lib/services/anime-service';
import { CountdownBadge } from '@/components/countdown-badge';

export async function TodayScheduleStrip() {
  let todayAnimeList: { slug: string; title: string; thumbnail?: string; episode?: string; time?: string }[] = [];
  let currentDayName = '';

  try {
    const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    currentDayName = daysIndo[now.getDay()];

    const scheduleData = await animeService.getSchedule();

    // Find matching day
    const matchingDay = scheduleData.find(
      (d) => d.day.toLowerCase().trim() === currentDayName.toLowerCase().trim()
    );

    if (matchingDay && matchingDay.anime.length > 0) {
      todayAnimeList = matchingDay.anime;
    } else if (scheduleData.length > 0) {
      // Fallback to first day if matching day has no items
      todayAnimeList = scheduleData[0].anime;
      currentDayName = scheduleData[0].day;
    }
  } catch {
    // Fail gracefully
  }

  if (todayAnimeList.length === 0) return null;

  return (
    <div className="p-3.5 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-extrabold text-white leading-none truncate">
                Jadwal Rilis Hari Ini
              </h3>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-black uppercase border border-amber-500/30">
                {currentDayName}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5 hidden sm:block">
              Episode anime baru yang dijadwalkan rilis hari ini
            </p>
          </div>
        </div>

        <Link
          href="/jadwal"
          className="inline-flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors shrink-0"
        >
          <span>Semua</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mobile Bleed Scrollable Anime Cards */}
      <div className="-mx-3.5 px-3.5 sm:mx-0 sm:px-0 flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent snap-x snap-mandatory scroll-strip">
        {todayAnimeList.map((item) => (
          <Link
            key={item.slug}
            href={`/anime/${item.slug}`}
            className="group scroll-card shrink-0 w-32 sm:w-44 p-1.5 sm:p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-amber-500/50 hover:bg-neutral-900 transition-[border-color,background-color] duration-200 space-y-1.5 active:scale-95 snap-start"
          >
            <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 128px, 176px"
                  className="card-img object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-[10px] text-neutral-500">
                  No Thumbnail
                </div>
              )}
              {item.time && <CountdownBadge rawTime={item.time} />}
            </div>

            <div className="space-y-0.5">
              <h4 className="text-[11px] sm:text-xs font-bold text-neutral-200 group-hover:text-white line-clamp-1 leading-tight">
                {item.title}
              </h4>
              {item.episode && (
                <p className="text-[10px] font-medium text-amber-400 line-clamp-1">
                  {item.episode}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
