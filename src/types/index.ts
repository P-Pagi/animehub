export interface Anime {
  id: string;
  slug: string;
  title: string;
  alternativeTitles?: string[];
  thumbnail?: string;
  cover?: string;
  description?: string;
  type?: string;
  status?: string;
  genres?: string[];
  studio?: string;
  season?: string;
  year?: number;
  rating?: number;
  episodes?: number;
  duration?: string;
  sourceUrl: string;
  isAiring?: boolean; // currently airing (Sedang Tayang section)
}

export interface Episode {
  number: number;
  title?: string;
  slug: string;
  url: string;
  sourceUrl: string;
}

export interface AnimeDetail extends Omit<Anime, 'episodes'> {
  episodes: Episode[];
  episodeCount?: number;
}

export interface DownloadServer {
  name: string;
  url: string;
}

export interface DownloadQuality {
  resolution: string; // e.g. "360p (SD)", "480p (HD)", "720p (FHD)", "1080p (BD)"
  size?: string;
  servers: DownloadServer[];
}

export interface EpisodeDetail {
  animeTitle: string;
  animeSlug: string;
  episodeNumber: number;
  title: string;
  thumbnail?: string;
  poster?: string;
  embedUrl?: string;
  availableServers?: { name: string; url: string }[];
  downloadOptions?: DownloadQuality[];
  prevEpisodeSlug?: string | null;
  nextEpisodeSlug?: string | null;
  sourceUrl: string;
}

export interface ScheduleItem {
  slug: string;
  title: string;
  thumbnail?: string;
  episode?: string;
  time?: string;
  type?: string;
}

export interface DaySchedule {
  day: string; // e.g. "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"
  anime: ScheduleItem[];
}

export interface Pagination {
  page: number;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  error?: {
    code: string;
    message: string;
  };
}
