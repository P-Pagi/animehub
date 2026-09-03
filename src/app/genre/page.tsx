import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Daftar Kategori Genre Anime - AnimeHub',
  description: 'Jelajahi anime berdasarkan kategori genre terlengkap di AnimeHub.',
};

const GENRES = [
  { slug: 'action', label: 'Aksi' },
  { slug: 'adventure', label: 'Petualangan' },
  { slug: 'comedy', label: 'Komedi' },
  { slug: 'drama', label: 'Drama' },
  { slug: 'fantasy', label: 'Fantasi' },
  { slug: 'horror', label: 'Horror' },
  { slug: 'isekai', label: 'Isekai' },
  { slug: 'mystery', label: 'Misteri' },
  { slug: 'reincarnation', label: 'Reinkarnasi' },
  { slug: 'romance', label: 'Romansa' },
  { slug: 'sci-fi', label: 'Sci-Fi' },
  { slug: 'seinen', label: 'Seinen' },
  { slug: 'shoujo', label: 'Shoujo' },
  { slug: 'shounen', label: 'Shounen' },
  { slug: 'slice-of-life', label: 'Slice of Life' },
  { slug: 'supernatural', label: 'Supranatural' },
  { slug: 'psychological', label: 'Psikologis' },
  { slug: 'military', label: 'Militer' },
  { slug: 'mecha', label: 'Mecha / Robot' },
  { slug: 'sports', label: 'Olahraga' },
  { slug: 'donghua', label: 'Donghua' },
  { slug: 'martial-arts', label: 'Bela Diri (Martial Arts)' },
  { slug: 'music', label: 'Musik' },
  { slug: 'historical', label: 'Sejarah' },
  { slug: 'school', label: 'Sekolah' },
  { slug: 'harem', label: 'Harem' },
  { slug: 'game', label: 'Game' },
  { slug: 'super-power', label: 'Super Power' },
  { slug: 'ecchi', label: 'Ecchi' },
  { slug: 'vampire', label: 'Vampir' },
];

export default function GenreIndexPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-1 border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Daftar Kategori Genre Anime</h1>
        <p className="text-xs text-secondary">Pilih kategori genre di bawah ini untuk menjelajahi daftar anime.</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {GENRES.map((g) => (
          <Link
            key={g.slug}
            href={`/genre/${g.slug}`}
            className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-secondary hover:text-primary hover:border-accent transition-all font-semibold shadow-sm hover:scale-102"
          >
            {g.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
