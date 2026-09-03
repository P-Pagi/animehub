'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DaySchedule } from '@/types';
import { Calendar, Clock, Play, Globe } from 'lucide-react';

const DAYS_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getUserIndonesianTimezone(): string {
  if (typeof window === 'undefined') return 'WIB';
  try {
    const offset = -new Date().getTimezoneOffset() / 60;
    if (offset === 7) return 'WIB';
    if (offset === 8) return 'WITA';
    if (offset === 9) return 'WIT';

    const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timeZoneName.includes('Jakarta') || timeZoneName.includes('Pontianak')) return 'WIB';
    if (timeZoneName.includes('Makassar') || timeZoneName.includes('Ujung_Pandang') || timeZoneName.includes('Bali')) return 'WITA';
    if (timeZoneName.includes('Jayapura')) return 'WIT';

    return offset >= 0 ? `UTC+${offset}` : `UTC${offset}`;
  } catch {
    return 'WIB';
  }
}

interface ScheduleListProps {
  schedule: DaySchedule[];
}

export function ScheduleList({ schedule }: ScheduleListProps) {
  const [activeDay, setActiveDay] = useState<string>('');
  const [todayName, setTodayName] = useState<string>('');
  const [userTz, setUserTz] = useState<string>('WIB');

  useEffect(() => {
    const localTodayIndex = new Date().getDay();
    const localToday = DAYS_INDONESIA[localTodayIndex];
    const tz = getUserIndonesianTimezone();

    setTodayName(localToday);
    setActiveDay(localToday);
    setUserTz(tz);
  }, []);

  const currentActiveDay = activeDay || todayName || schedule[0]?.day || 'Minggu';
  const activeDaySchedule = schedule.find((d) => d.day === currentActiveDay) || schedule[0];

  return (
    <div className="space-y-6">
      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {schedule.map((item) => {
          const isSelected = item.day === currentActiveDay;
          const isToday = item.day === todayName;

          return (
            <button
              key={item.day}
              onClick={() => setActiveDay(item.day)}
              className={`flex-shrink-0 relative px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-2 border ${isSelected
                  ? 'bg-primary text-background border-primary shadow-xl scale-102'
                  : 'bg-surface border-border text-secondary hover:text-primary hover:border-accent'
                }`}
            >
              <span>{item.day}</span>
              {isToday && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black uppercase ${isSelected ? 'bg-background text-primary' : 'bg-red-500 text-white'
                    }`}
                >
                  Hari Ini ({userTz})
                </span>
              )}
              {item.anime.length > 0 && (
                <span className="text-[10px] opacity-70">({item.anime.length})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Day Content */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <h3 className="text-base font-bold text-primary">
              Jadwal Rilis Hari {activeDaySchedule?.day}
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary bg-surface-secondary px-2 py-0.5 rounded-lg border border-border">
              <Globe className="w-3 h-3 text-accent" />
              {userTz}
            </span>
          </div>
          <span className="text-xs text-secondary font-medium">
            {activeDaySchedule?.anime.length || 0} Anime Tayang
          </span>
        </div>

        {!activeDaySchedule || activeDaySchedule.anime.length === 0 ? (
          <div className="py-16 text-center border border-border rounded-2xl bg-surface">
            <p className="text-secondary text-sm font-medium">
              Belum ada jadwal rilis anime untuk hari {currentActiveDay}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDaySchedule.anime.map((anime) => {
              const targetUrl = anime.slug.startsWith('nonton-')
                ? `/watch/${anime.slug}`
                : `/anime/${anime.slug}`;

              return (
                <Link
                  key={anime.slug}
                  href={targetUrl}
                  className="group flex gap-3.5 p-3.5 rounded-2xl bg-surface border border-border hover:border-accent transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative aspect-[2/3] w-20 shrink-0 rounded-xl overflow-hidden bg-surface-secondary border border-border/60">
                    {anime.thumbnail ? (
                      <Image
                        src={anime.thumbnail}
                        alt={anime.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-secondary">
                        Anime
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                          {currentActiveDay === todayName
                            ? (anime.time && !anime.time.includes('1d') && !anime.time.includes('2d') ? `Hari Ini (${anime.time})` : 'Hari Ini')
                            : (anime.time && !anime.time.includes('1d') && !anime.time.includes('2d') ? `Rilis: ${anime.time}` : `Jadwal ${currentActiveDay}`)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {anime.episode}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-primary line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                        {anime.title}
                      </h4>
                    </div>

                    <div className="pt-2 flex items-center text-xs font-semibold text-secondary group-hover:text-primary transition-colors">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:text-accent">
                        <Play className="w-3 h-3 fill-current" />
                        Tonton Sekarang
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
