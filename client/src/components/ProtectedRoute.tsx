import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Skeleton } from './ui/Skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tan-pearl to-sage-green flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Skeleton className="w-12 h-12 rounded-full" />
            </div>
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return path
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected component
  return <>{children}</>;
}