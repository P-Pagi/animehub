import { SkeletonGrid } from './skeleton';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="h-6 bg-surface rounded w-36 animate-pulse" />
      <SkeletonGrid count={12} />
    </div>
  );
}
