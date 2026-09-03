'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  prevUrl?: string;
  nextUrl: string;
}

export function Pagination({ currentPage, hasNextPage, prevUrl, nextUrl }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-2 pt-6 border-t border-border/80 text-xs font-semibold">
      {/* Previous Button */}
      {currentPage > 1 && prevUrl ? (
        <Link
          href={prevUrl}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-surface border border-border text-secondary hover:text-primary hover:border-accent transition-all duration-150 shadow-sm active:scale-95 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Halaman Sebelumnya</span>
          <span className="sm:hidden">Sebelumnya</span>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-surface/40 border border-border/40 text-secondary/30 cursor-not-allowed shrink-0">
          <ChevronLeft className="w-4 h-4 opacity-40" />
          <span className="hidden sm:inline">Halaman Sebelumnya</span>
          <span className="sm:hidden">Sebelumnya</span>
        </span>
      )}

      {/* Current Page Indicator */}
      <span className="px-3 sm:px-4 py-2 rounded-xl bg-surface-secondary text-primary font-bold border border-border text-center shrink-0 shadow-inner">
        <span className="hidden sm:inline">Halaman </span>
        <span> {currentPage}</span>
      </span>

      {/* Next Button */}
      {hasNextPage ? (
        <Link
          href={nextUrl}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-surface border border-border text-secondary hover:text-primary hover:border-accent transition-all duration-150 shadow-sm active:scale-95 shrink-0"
        >
          <span className="hidden sm:inline">Halaman Selanjutnya</span>
          <span className="sm:hidden">Selanjutnya</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-surface/40 border border-border/40 text-secondary/30 cursor-not-allowed shrink-0">
          <span className="hidden sm:inline">Halaman Selanjutnya</span>
          <span className="sm:hidden">Selanjutnya</span>
          <ChevronRight className="w-4 h-4 opacity-40" />
        </span>
      )}
    </div>
  );
}
