'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function NavigationProgressBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPathnameRef = useRef(pathname);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Detect navigation complete when pathname changes
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      clearAllTimers();
      setProgress(100);
      const t = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 350);
      timersRef.current.push(t);
    }
  }, [pathname]);

  // Intercept link clicks to trigger loader immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip external links, hash links, and blank target
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank'
      ) return;

      const currentPath = window.location.pathname;
      const targetPath = href.split('?')[0];

      if (targetPath !== currentPath) {
        clearAllTimers();
        setLoading(true);
        setProgress(20);

        const t1 = setTimeout(() => setProgress(50), 300);
        const t2 = setTimeout(() => setProgress(75), 900);
        const t3 = setTimeout(() => setProgress(90), 2500);
        timersRef.current.push(t1, t2, t3);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      clearAllTimers();
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Top Progress Bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 z-[99999] h-[3px] bg-white shadow-[0_0_10px_rgba(245,158,11,0.7)] pointer-events-none transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          transitionDuration: progress === 100 ? '150ms' : '400ms',
        }}
      />

      {/* Floating Pill Indicator */}
      {loading && progress < 100 && (
        <div className="fixed top-[60px] right-3 sm:right-5 z-[99999] pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950/95 border border-amber-500/30 text-amber-400 text-[11px] font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Memuat...</span>
          </div>
        </div>
      )}
    </>
  );
}
