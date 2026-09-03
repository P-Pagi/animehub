// Global loading skeleton — mirrors the exact homepage layout
export default function GlobalLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-7 sm:space-y-12 animate-pulse">

      {/* ── 1. Hero Banner Skeleton ── */}
      <div className="relative w-full min-h-[360px] sm:min-h-[440px] rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        {/* Gradient shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-800/30 to-neutral-900" />
        {/* Content placeholder */}
        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 space-y-3 w-2/3">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-neutral-800" />
            <div className="h-5 w-14 rounded-full bg-neutral-800" />
          </div>
          <div className="h-7 sm:h-9 w-5/6 rounded-xl bg-neutral-800" />
          <div className="h-5 w-3/5 rounded-xl bg-neutral-800" />
          <div className="h-4 w-2/5 rounded bg-neutral-800" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-36 rounded-xl bg-neutral-800" />
            <div className="h-10 w-28 rounded-xl bg-neutral-800" />
          </div>
        </div>
        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[1,2,3,4,5,6].map(i => <div key={i} className={`rounded-full bg-neutral-700 ${i === 1 ? 'w-5 h-1.5' : 'w-1.5 h-1.5'}`} />)}
        </div>
      </div>

      {/* ── 2. Genre Bar Skeleton ── */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shrink-0 h-8 w-20 rounded-full bg-neutral-900 border border-neutral-800" />
        ))}
      </div>

      {/* ── 3. Today Schedule Strip Skeleton ── */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-32 rounded bg-neutral-800" />
            <div className="h-4 w-14 rounded-md bg-neutral-800" />
          </div>
          <div className="h-4 w-14 rounded bg-neutral-800" />
        </div>
        {/* Cards */}
        <div className="flex gap-2.5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-32 sm:w-44 space-y-1.5">
              <div className="aspect-[16/10] w-full rounded-lg bg-neutral-800" />
              <div className="h-3 w-4/5 rounded bg-neutral-800" />
              <div className="h-2.5 w-1/2 rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Sedang Tayang Grid Skeleton ── */}
      <div className="space-y-4">
        {/* Section Title */}
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-36 rounded-lg bg-neutral-800" />
            <div className="h-3 w-56 rounded bg-neutral-800" />
          </div>
        </div>
        {/* Card Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] w-full rounded-xl bg-neutral-900 border border-neutral-800" />
              <div className="h-3 w-4/5 rounded bg-neutral-800" />
              <div className="h-2.5 w-1/2 rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Popular Section Skeleton ── */}
      <div className="space-y-4 pt-4 border-t border-neutral-800/60">
        <div className="h-5 w-32 rounded-lg bg-neutral-800" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] w-full rounded-xl bg-neutral-900 border border-neutral-800" />
              <div className="h-3 w-4/5 rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
