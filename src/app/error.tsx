'use client';

import { useEffect } from 'react';
import { MaintenanceView } from '@/components/maintenance-view';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GLOBAL_ERROR_BOUNDARY]', error);
  }, [error]);

  return (
    <MaintenanceView
      message={
        error.message && !error.message.includes('digest')
          ? error.message
          : 'Terjadi gangguan sementara saat memuat data. Silakan coba ulang.'
      }
      onRetry={reset}
    />
  );
}
