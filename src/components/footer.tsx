'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const GENRE_LINKS = [
  { slug: 'isekai', label: 'Isekai' },
  { slug: 'shounen', label: 'Shounen' },
  { slug: 'romansa', label: 'Romansa' },
  { slug: 'aksi', label: 'Aksi' },
  { slug: 'fantasi', label: 'Fantasi' },
  { slug: 'komedi', label: 'Komedi' },
  { slug: 'horror', label: 'Horror' },
  { slug: 'donghua', label: 'Donghua' },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-background border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="AnimeHub Logo" width={24} height={24} className="w-6 h-6 rounded-md object-contain" />
              <p className="font-extrabold text-lg text-primary tracking-tight">
                Anime<span className="text-amber-400 font-black">Hub</span>
              </p>
            </div>
            <p className="text-xs text-secondary leading-relaxed max-w-xs">
              Platform streaming anime real-time. Seluruh data diambil langsung dari sumber utama tanpa penyimpanan data permanen.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Navigasi Utama</p>
            <div className="space-y-2">
              {[
                { href: '/', label: 'Beranda' },
                { href: '/popular', label: 'Terpopuler' },
                { href: '/genre', label: 'Kategori Genre' },
                { href: '/bookmark', label: 'Anime Favorit' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block text-sm text-secondary hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Kategori Populer</p>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_LINKS.map((g) => (
                <Link
                  key={g.slug}
                  href={`/genre/${g.slug}`}
                  className="px-2.5 py-1 rounded-md text-xs bg-surface border border-border text-secondary hover:text-primary hover:border-accent transition-colors"
                >
                  {g.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-secondary">
          <p>© {new Date().getFullYear()} AnimeHub. Hak Cipta Dilindungi.</p>
          <p>Tanpa Penyimpanan Data · Performa Tinggi</p>
        </div>
      </div>
    </footer>
  );
}
