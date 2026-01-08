/*
 * AuthContext - Authentication state management for the CRM application
 *
 * This context manages Supabase authentication state including the current user,
 * session, and loading status. It also handles cache invalidation on auth events
 * to prevent displaying stale data after sign in/out operations.
 *
 * INVARIANTS:
 * - Loading is true until the initial auth state is checked on mount
 * - User and session are synchronized; both are null or both are non-null
 * - Cache is cleared on SIGNED_IN and SIGNED_OUT to prevent stale data
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/* Shape of the authentication context */
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/*
 * AuthProvider component - wraps the application to provide auth state
 *
 * BEHAVIOR:
 * - Initializes loading = true until the initial auth check completes
 * - Subscribes to Supabase auth state changes on mount
 * - Syncs user and session with Supabase auth state
 * - Clears React Query cache on SIGNED_IN and SIGNED_OUT to prevent stale data
 *
 * The cache clearing is essential for security: when a different user signs in,
 * the previous user's cached data should not be accessible.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    /*
     * Subscribe to Supabase auth state changes. The callback fires immediately
     * with the current session, then again on any auth events (sign in, sign out,
     * token refresh, etc.).
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        /*
         * SECURITY: Clear the entire query cache on sign in/out to prevent
         * one user from accessing another user's cached data. This is critical
         * in multi-tenant scenarios where data is organization-scoped.
         */
        if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
          queryClient.clear();
        }
      }
    );

    /* Cleanup: unsubscribe from auth changes on unmount */
    return () => subscription.unsubscribe();
  }, [queryClient]);

  /*
   * Sign out the current user.
   *
   * Delegates to Supabase auth.signOut(). The onAuthStateChange callback will
   * fire with SIGNED_OUT event, which clears the query cache automatically.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    /* Query cache is cleared by the SIGNED_OUT event handler above */
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

/*
 * useAuth - Hook to access authentication context
 *
 * Must be called within an AuthProvider. Throws an error if used outside
 * of the provider hierarchy to catch misconfigurations early.
 *
 * USAGE:
 *   const { user, loading, signOut } = useAuth();
 *   if (loading) return <LoadingSpinner />;
 *   if (!user) return <SignInForm />;
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
