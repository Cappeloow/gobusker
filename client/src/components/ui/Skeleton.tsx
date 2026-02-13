import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}>
      {children}
    </div>
  );
}

export function SkeletonText({ 
  lines = 1, 
  className = '' 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={className}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton 
          key={i}
          className={`h-4 mb-2 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  return (
    <Skeleton className={`${sizeClasses[size]} rounded-full flex-shrink-0`} />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <div className="flex items-start gap-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1">
          <Skeleton className="h-6 w-48 mb-3" />
          <SkeletonText lines={2} className="mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonButton({ className = '' }: { className?: string }) {
  return (
    <Skeleton className={`h-10 w-24 rounded-md ${className}`} />
  );
}