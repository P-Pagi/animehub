import { Anime } from '@/types';
import { AnimeCard } from './anime-card';

interface AnimeGridProps {
  title?: string;
  subtitle?: string;
  animeList: Anime[];
  action?: React.ReactNode;
}

export function AnimeGrid({ title, subtitle, animeList, action }: AnimeGridProps) {
  if (!animeList || animeList.length === 0) {
    return (
      <div className="text-center py-14 border border-border rounded-xl bg-surface">
        <p className="text-secondary text-sm font-medium">Tidak ada anime yang ditemukan.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-5 content-visibility-auto">
      {(title || action) && (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="section-title text-base sm:text-lg font-bold tracking-tight text-primary">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-secondary mt-1 line-clamp-1">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="text-xs font-semibold text-secondary hover:text-primary transition-colors pb-0.5 shrink-0 whitespace-nowrap">
              {action}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {animeList.map((anime, idx) => (
          <AnimeCard key={`${anime.id || anime.slug || 'anime'}-${idx}`} anime={anime} />
        ))}
      </div>
    </section>
  );
}
