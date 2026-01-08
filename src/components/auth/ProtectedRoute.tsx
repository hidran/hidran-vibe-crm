/*
 * ProtectedRoute - Route guard component for authenticated pages
 *
 * This component protects routes that require authentication by checking
 * the user's authentication status. It handles three states:
 * 1. Loading: Shows spinner while checking auth status
 * 2. Unauthenticated: Redirects to login page
 * 3. Authenticated: Renders the protected content
 *
 * BEHAVIOR:
 * - On mount, checks if user is authenticated via AuthContext
 * - If loading (auth status unknown), shows centered spinner
 * - If user is null (not authenticated), redirects to /auth
 * - If user exists (authenticated), renders children
 *
 * REDIRECT:
 * - Uses <Navigate replace /> to prevent back button navigation to protected route
 * - Redirects to /auth where user can sign in or sign up
 * - After successful auth, user is redirected back (if implemented in auth flow)
 *
 * LOADING STATE:
 * - Prevents flash of unauthenticated content
 * - Shows spinner until AuthContext finishes checking session
 * - Full-screen centered layout for consistent UX
 *
 * INVARIANTS:
 * - Must be used within AuthProvider (uses useAuth hook)
 * - loading = true until initial auth check completes
 * - User is either null or an authenticated User object (never undefined)
 *
 * USAGE:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   } />
 *
 * NOTE: This component only checks authentication status. For role-based
 * access control (e.g., superadmin-only routes), use SuperadminRoute instead.
 */

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode; // Content to render if authenticated
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  /*
   * Loading state: Auth status is being checked
   *
   * Shows full-screen centered spinner to prevent flash of
   * redirect or content while AuthContext initializes.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /*
   * Unauthenticated state: No user session found
   *
   * Redirects to login page using replace to prevent back button
   * from returning to protected route. After login, user should
   * be redirected back to this route (if auth flow implements it).
   */
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  /*
   * Authenticated state: User session exists
   *
   * Renders the protected content. At this point we know:
   * - loading = false (auth check complete)
   * - user is not null (valid session exists)
   */
  return <>{children}</>;
};

export default ProtectedRoute;
