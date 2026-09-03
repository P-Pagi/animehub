import { Metadata } from 'next';
import { animeService } from '@/lib/services/anime-service';
import { ScheduleList } from '@/components/schedule-list';
import { MaintenanceView } from '@/components/maintenance-view';
import { Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Jadwal Rilis Anime Minggu Ini - AnimeHub',
  description: 'Jadwal tayang anime terbaru subtitle Indonesia update setiap hari dari Senin hingga Minggu.',
};

export default async function JadwalPage() {
  let schedule: any[] = [];
  let errorMsg: string | null = null;

  try {
    schedule = await animeService.getSchedule();
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Gagal memuat jadwal rilis.';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Jadwal Rilis Anime Mingguan</h1>
            <p className="text-xs text-secondary">Pantau waktu update episode terbaru anime favoritmu setiap harinya.</p>
          </div>
        </div>
      </div>

      {errorMsg || schedule.length === 0 ? (
        <MaintenanceView message={errorMsg || 'Gagal memuat jadwal tayang anime dari server.'} />
      ) : (
        <ScheduleList schedule={schedule} />
      )}
    </div>
  );
}
