import { Skeleton, SkeletonAvatar, SkeletonText, SkeletonButton } from './Skeleton';

export function ProfileCardSkeleton() {
  return (
    <div className="group p-6 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg">
      <div className="flex items-start gap-4">
        <SkeletonAvatar size="xl" />
        <div className="flex-1">
          <Skeleton className="h-7 w-48 mb-3" />
          <SkeletonText lines={2} className="mb-4" />
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <Skeleton className="h-6 w-64 mb-2" />
          <SkeletonText lines={1} className="mb-3" />
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg to-light-card dark:from-github-bg dark:to-github-card p-4">
      <div className="max-w-5xl mx-auto bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-80 mb-3" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-light-border dark:border-github-border">
          <div className="flex space-x-8">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-6 w-20 mb-4" />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <ProfileCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg to-light-card dark:from-github-bg dark:to-github-card">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-light-card dark:bg-github-card rounded-lg p-8 mb-6 border border-light-border dark:border-github-border">
          <div className="flex items-start gap-6">
            <SkeletonAvatar size="xl" />
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-3" />
              <SkeletonText lines={2} className="mb-4" />
              <div className="flex gap-3">
                <SkeletonButton />
                <SkeletonButton />
                <SkeletonButton />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-light-card dark:bg-github-card rounded-lg border border-light-border dark:border-github-border">
          <div className="border-b border-light-border dark:border-github-border px-6 py-4">
            <div className="flex space-x-8">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-6 w-16" />
              ))}
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="relative w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-8 rounded-full mx-auto mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {/* Form Title */}
      <Skeleton className="h-8 w-64 mx-auto" />
      
      {/* Form Fields */}
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      ))}
      
      {/* Form Buttons */}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-12 w-32 rounded-md" />
        <Skeleton className="h-12 w-24 rounded-md" />
      </div>
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WalletSkeleton() {
  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-20 rounded-md" />
        ))}
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}