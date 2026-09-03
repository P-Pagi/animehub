import Link from 'next/link';
import Image from 'next/image';
import { Anime } from '@/types';
import { Play } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const isEpisodeLink = anime.slug.startsWith('nonton-');
  const targetUrl = isEpisodeLink ? `/watch/${anime.slug}` : `/anime/${anime.slug}`;

  const metaParts: string[] = [];
  if (anime.type && !anime.isAiring) metaParts.push(anime.type);
  if (anime.episodes) metaParts.push(`Ep ${anime.episodes}`);
  else if (anime.status && !anime.isAiring) metaParts.push(anime.status);
  else if (anime.year) metaParts.push(String(anime.year));

  const metaString = metaParts.join(' · ');

  return (
    <Link href={targetUrl} className="group flex flex-col h-full">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface-secondary border border-border/60 transition-all duration-300 group-hover:border-accent/50 group-hover:shadow-xl group-hover:shadow-black/40 active:scale-[0.97] transform-gpu">
        {anime.thumbnail ? (
          <Image
            src={anime.thumbnail}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 15vw"
            className="card-img object-cover transform-gpu"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-secondary">
            <span className="text-secondary text-[10px] text-center px-2">Tidak Ada Gambar</span>
          </div>
        )}

        {/* Dark bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Type badge — top left */}
        {anime.type && (
          <span className="glass-badge absolute top-1.5 left-1.5 text-[9px] font-extrabold tracking-widest px-1.5 py-0.5 rounded text-primary uppercase">
            {anime.type}
          </span>
        )}


        {/* Episode info — bottom overlay */}
        {anime.isAiring && anime.status && (
          <div className="absolute bottom-0 inset-x-0 px-2 pb-2 pt-4">
            <span className="text-[10px] font-semibold text-white/90 truncate block">
              {anime.status}
            </span>
          </div>
        )}

        {/* Hover play indicator (Hidden on touch devices, shown on desktop hover) */}
        <div className="hidden sm:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
          <div className="w-9 h-9 rounded-full bg-black/80 text-white border border-white/20 flex items-center justify-center shadow-2xl transform scale-95 group-hover:scale-110 group-hover:bg-accent group-hover:text-background group-hover:border-accent transition-all duration-200">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Metadata below poster */}
      <div className="mt-2 space-y-0.5">
        <h3 className="text-xs sm:text-[13px] font-semibold text-primary line-clamp-2 group-hover:text-accent transition-colors duration-150 leading-snug">
          {anime.title}
        </h3>
        {metaString && (
          <p className="text-[10px] sm:text-[11px] text-secondary">{metaString}</p>
        )}
      </div>
    </Link>
  );
}
