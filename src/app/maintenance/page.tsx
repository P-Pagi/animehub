import { Metadata } from 'next';
import { MaintenanceView } from '@/components/maintenance-view';

export const metadata: Metadata = {
  title: 'Mode Pemeliharaan - AnimeHub',
  description: 'Server sumber anime sedang dalam pemeliharaan.',
};

export default function MaintenancePage() {
  return <MaintenanceView />;
}
