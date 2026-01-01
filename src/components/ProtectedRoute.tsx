import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { canAccessPathWithUser } from '@/utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string; // The route path to check access for
}

/**
 * ProtectedRoute component that checks if user has permission to access a route
 * Redirects to dashboard if user doesn't have permission
 */
export default function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to auth (Layout will handle this, but we check here too)
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user can access this path
  const canAccess = canAccessPathWithUser(user, path);

  if (!canAccess) {
    // User doesn't have permission - redirect to dashboard
    console.warn(`[ProtectedRoute] User ${user.email} (${user.role}) does not have permission to access ${path}`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}



