import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tan-pearl to-sage-green">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan-dark mx-auto mb-4"></div>
          <p className="text-tan-dark">Loading...</p>
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