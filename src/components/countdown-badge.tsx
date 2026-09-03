'use client';

import { useEffect, useState } from 'react';

interface CountdownBadgeProps {
  /** Raw value from API — either "Xd Yh Zm" countdown or "HH:MM" air time */
  rawTime: string;
}

/**
 * Parses a countdown string like "1d 7h 24m" or "0d 9h 9m" into total minutes.
 * Returns null if the format is not recognized.
 */
function parseCountdownToMinutes(raw: string): number | null {
  const match = raw.match(/(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m)?/);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const d = parseInt(match[1] || '0', 10);
  const h = parseInt(match[2] || '0', 10);
  const m = parseInt(match[3] || '0', 10);
  return d * 1440 + h * 60 + m;
}

/**
 * Parses an "HH:MM" string and returns minutes remaining from now (local time).
 * Assumes the time is for today; if the time has already passed, returns 0.
 */
function parseAirTimeToMinutes(raw: string): number | null {
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const now = new Date();
  const airTime = new Date();
  airTime.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  const diff = Math.floor((airTime.getTime() - now.getTime()) / 60000);
  return diff > 0 ? diff : 0;
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'Tayang';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}j ${m}m`;
}

export function CountdownBadge({ rawTime }: CountdownBadgeProps) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Determine initial minutes from the raw value
    let initialMinutes: number | null = null;

    // Try HH:MM format first (actual air time — most accurate)
    initialMinutes = parseAirTimeToMinutes(rawTime);

    // If not HH:MM, try countdown format "Xd Yh Zm"
    if (initialMinutes === null) {
      const fromCountdown = parseCountdownToMinutes(rawTime);
      // Only accept if < 24 hours (1440 min) — anything ≥1d is likely a timezone error
      if (fromCountdown !== null && fromCountdown < 1440) {
        initialMinutes = fromCountdown;
      }
    }

    setMinutesLeft(initialMinutes);

    // Tick down every minute
    if (initialMinutes !== null && initialMinutes > 0) {
      const interval = setInterval(() => {
        setMinutesLeft((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [rawTime]);

  // Don't render anything until mounted (prevents SSR/client mismatch)
  if (!mounted || minutesLeft === null) return null;

  return (
    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[9px] font-extrabold text-amber-300 border border-amber-500/30 backdrop-blur-sm">
      {formatMinutes(minutesLeft)}
    </div>
  );
}
