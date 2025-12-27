import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { getUserRoles, getUserProfile, getUserPrimaryRole } from "@/services/auth.service";
import { canAccessModule, canPerformAction, type AppRole } from "@/utils/permissions";
import { logger } from "@/utils/logger";

export type UserRole = AppRole;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  roles: string[]; // All roles user has
  name?: string;
  santriId?: string; // UUID dari tabel santri
  idSantri?: string; // ID Santri (format: BM240001)
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [testRoleOverride, setTestRoleOverride] = useState<string | null>(null);

  // Check for test role override in localStorage (for role switcher)
  useEffect(() => {
    const storedOverride = localStorage.getItem("test_role_override");
    if (storedOverride) {
      setTestRoleOverride(storedOverride);
    }
  }, []);

  // Fetch user role from database
  const fetchUserRole = useCallback(async (userId: string, supabaseUser: SupabaseUser) => {
    try {
      const [roles, profile, santriData] = await Promise.all([
        getUserRoles(userId).catch(err => {
          logger.warn("Error fetching roles, using default:", err);
          return [];
        }),
        getUserProfile(userId).catch(err => {
          logger.warn("Error fetching profile:", err);
          return null;
        }),
        // Fetch santri data if user is santri
        // Try RPC function first with timeout, fallback to direct query if RPC doesn't exist
        (async () => {
          try {
            // Try RPC function first with timeout
            const rpcPromise = supabase.rpc('get_santri_by_user_id', { p_user_id: userId });
            const timeoutPromise = new Promise((resolve) => 
              setTimeout(() => resolve({ data: null, error: { message: 'RPC timeout' } }), 3000)
            );
            
            const result: any = await Promise.race([rpcPromise, timeoutPromise]);
            const { data: rpcData, error: rpcError } = result;
            
            // Check if it's a CORS/network error - silently fail
            const isNetworkError = rpcError && (
              rpcError.message?.includes('CORS') || 
              rpcError.message?.includes('520') || 
              rpcError.message?.includes('523') || 
              rpcError.message?.includes('Failed to fetch') ||
              rpcError.message?.includes('unreachable') ||
              rpcError.message?.includes('Access-Control-Allow-Origin') ||
              rpcError.message?.includes('timeout')
            );
            
            if (isNetworkError) {
              // Silently fail for network errors, don't spam console
              return null;
            }
            
            if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
              return rpcData[0];
            }
            
            // Fallback: Query directly from santri table using user_id column
            // Link between auth user and santri is via user_id column in santri table
            const { data: santriData, error: santriError } = await supabase
              .from('santri')
              .select('*')
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle();
            
            if (!santriError && santriData) {
              return santriData;
            }
            
            return null;
          } catch (err: any) {
            // Check if it's a CORS/network error - silently fail
            const isNetworkError = err?.message?.includes('CORS') || 
                                  err?.message?.includes('520') || 
                                  err?.message?.includes('523') || 
                                  err?.message?.includes('Failed to fetch') ||
                                  err?.message?.includes('unreachable') ||
                                  err?.message?.includes('Access-Control-Allow-Origin');
            
            if (isNetworkError) {
              // Silently fail for network errors
              return null;
            }
            
            // If RPC function doesn't exist (error 520/523 or CORS), try direct query
            if (err?.code === 'PGRST204' || err?.message?.includes('CORS') || err?.message?.includes('520') || err?.message?.includes('523')) {
              logger.warn('RPC function not available, trying direct query:', err);
              try {
                const { data: santriData, error: santriError } = await supabase
                  .from('santri')
                  .select('*')
                  .eq('user_id', userId)
                  .limit(1)
                  .maybeSingle();
                
                if (!santriError && santriData) {
                  return santriData;
                }
              } catch (fallbackErr) {
                logger.warn('Fallback query also failed:', fallbackErr);
              }
            } else {
              logger.warn('Error fetching santri data:', err);
            }
            return null;
          }
        })()
      ]);

      const primaryRole = roles.length > 0 ? roles[0] : 'santri';
      
      // Use test override if available (for debugging)
      const effectiveRole = testRoleOverride || primaryRole;

      const userData: User = {
        id: userId,
        email: supabaseUser.email || '',
        role: effectiveRole as UserRole,
        roles: roles,
        name: santriData?.nama_lengkap || profile?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        santriId: santriData?.id,
        idSantri: santriData?.id_santri,
        profile: profile ? {
          full_name: profile.full_name,
          email: profile.email
        } : undefined
      };

      setUser(userData);
      return userData;
    } catch (error) {
      logger.error("Error fetching user role:", error);
      // Fallback to default - always set user even if error
      const fallbackUser: User = {
        id: userId,
        email: supabaseUser.email || '',
        role: (testRoleOverride || 'santri') as UserRole,
        roles: [],
        name: supabaseUser.email?.split('@')[0] || 'User'
      };
      setUser(fallbackUser);
      return fallbackUser;
    }
  }, [testRoleOverride]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let hasSetLoading = false;

    const setLoadingFalse = () => {
      if (mounted && !hasSetLoading) {
        logger.log("✅ [useAuth] Setting loading to false");
        setLoading(false);
        hasSetLoading = true;
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    logger.log("🔐 [useAuth] Initializing auth check...");

    // Safety timeout - ALWAYS set loading to false after 2 seconds max (reduced from 3)
    timeoutId = setTimeout(() => {
      if (mounted && !hasSetLoading) {
        logger.warn("⏰ [useAuth] TIMEOUT: Force setting loading to false after 2 seconds");
        logger.warn("⏰ [useAuth] This usually means getSession() is hanging. Check Supabase connection.");
        setLoading(false);
        hasSetLoading = true;
        // On timeout, assume no session and user needs to login
        // But don't clear session/user if they might exist - let auth state change handle it
        if (!session) {
          setSession(null);
          setUser(null);
        }
      }
    }, 2000);

    // Set up auth state listener FIRST (this might fire immediately)
    // Add a fallback timeout in case onAuthStateChange never fires
    let authStateChangeFired = false;
    const fallbackTimeout = setTimeout(() => {
      if (!authStateChangeFired && mounted && !hasSetLoading) {
        logger.warn("⏰ [useAuth] onAuthStateChange never fired - forcing loading to false");
        setLoadingFalse();
      }
    }, 2500); // Slightly longer than main timeout to allow auth state change to fire
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authStateChangeFired = true;
        clearTimeout(fallbackTimeout);
        if (!mounted) {
          logger.log("🔐 [useAuth] Component unmounted, skipping auth state change");
          return;
        }

        logger.log("🔐 [useAuth] Auth state changed", { event, hasSession: !!session, userId: session?.user?.id });

        try {
          setSession(session);

          if (session?.user) {
            logger.log("🔐 [useAuth] Fetching role for user", session.user.id);
            
            // Add timeout for role fetching to prevent hanging
            // Check localStorage cache first for faster loading
            // NOTE: For santri users, we skip cache because we need santriId which is not cached
            const cacheKey = `user_roles_${session.user.id}`;
            const cachedRoles = localStorage.getItem(cacheKey);
            let cachedRoleData: any = null;
            
            if (cachedRoles) {
              try {
                const roles = JSON.parse(cachedRoles);
                const cacheTime = localStorage.getItem(`${cacheKey}_time`);
                const cachedRole = roles[0] || 'santri';
                
                // Don't use cache for santri users - we need to fetch santriId
                // This prevents Dashboard redirect loop when santriId is missing
                if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000 && roles.length > 0 && cachedRole !== 'santri') {
                  cachedRoleData = {
                    id: session.user.id,
                    email: session.user.email || '',
                    role: cachedRole,
                    roles: roles,
                    name: session.user.email?.split('@')[0] || 'User'
                  };
                  logger.log("⚡ [useAuth] Using cached role data:", cachedRoleData.role);
                } else if (cachedRole === 'santri') {
                  logger.log("⚡ [useAuth] Skipping cache for santri - need to fetch santriId");
                }
              } catch (e) {
                // Invalid cache, continue to fetch
              }
            }
            
            // If we have cached data (and it's not santri), set it immediately but still fetch in background
            if (cachedRoleData) {
              setUser(cachedRoleData);
              setLoadingFalse();
              
              // Fetch in background to refresh (don't wait for it)
              fetchUserRole(session.user.id, session.user)
                .then(() => {
                  logger.log("🔐 [useAuth] Role refreshed in background");
                })
                .catch((roleError) => {
                  logger.warn("⚠️ [useAuth] Background role refresh failed:", roleError);
                });
            } else {
              // No cache, fetch role (must complete to get santriId for santri users)
              // Set loading to false only after fetch completes
              let roleFetchTimedOut = false;
              let fetchCompleted = false; // Track if fetchUserRole has completed
              
              const timeoutId = setTimeout(() => {
                if (!fetchCompleted) {
                  roleFetchTimedOut = true;
                  logger.warn("⏰ [useAuth] Role fetch timeout - using default role");
                  // Set default user if timeout (loading will be set false by fetchUserRole's then/catch)
                  setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    role: 'santri',
                    roles: [],
                    name: session.user.email?.split('@')[0] || 'User'
                  });
                  // Note: loading will be set false by fetchUserRole's then/catch when it completes
                }
              }, 2000); // 2 second timeout (reduced from 3)
              
              fetchUserRole(session.user.id, session.user)
                .then(() => {
                  fetchCompleted = true;
                  clearTimeout(timeoutId);
                  setLoadingFalse(); // Set loading false after fetch completes
                  if (roleFetchTimedOut) {
                    logger.log("🔐 [useAuth] Role fetched after timeout - updating user");
                  } else {
                    logger.log("🔐 [useAuth] Role fetched successfully");
                  }
                })
                .catch((roleError) => {
                  fetchCompleted = true;
                  clearTimeout(timeoutId);
                  setLoadingFalse(); // Set loading false even on error
                  if (!roleFetchTimedOut) {
                    logger.error("❌ [useAuth] Error fetching role:", roleError);
                  }
                  // Default role will be set by timeout handler if needed
                });
            }
          } else {
            logger.log("🔐 [useAuth] No session, setting user to null");
            setUser(null);
            setLoadingFalse();
          }
        } catch (error) {
          logger.error("❌ [useAuth] Error in auth state change:", error);
          setUser(null);
          setLoadingFalse();
        }
        // Note: setLoadingFalse() is called in each branch above, not in finally
        // This ensures loading is set false immediately, not waiting for role fetch
      }
    );

    // Check for existing session - but don't block if it times out
    // onAuthStateChange should fire and handle session detection
    logger.log("🔐 [useAuth] Checking existing session (non-blocking)...");
    
    // Try to get session but don't wait too long - add timeout wrapper
    const sessionPromise = supabase.auth.getSession();
    const sessionTimeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve({ data: { session: null }, error: { message: 'Session check timeout' } }), 2000)
    );
    
    Promise.race([sessionPromise, sessionTimeoutPromise]).then(async (result: any) => {
      if (!mounted) {
        console.log("🔐 [useAuth] Component unmounted, skipping getSession result");
        return;
      }

      try {
        const { data: { session }, error } = result;

        if (error && error.message !== 'Session check timeout') {
          logger.error("❌ [useAuth] Error getting session:", error);
          setLoadingFalse();
          return;
        }

        if (error && error.message === 'Session check timeout') {
          logger.warn("⏰ [useAuth] Session check timed out - using auth state change listener");
          setLoadingFalse();
          return;
        }

        logger.log("🔐 [useAuth] Session check result", { hasSession: !!session, userId: session?.user?.id });

        if (session && !session.user) {
          logger.warn("⚠️ [useAuth] Session exists but no user - clearing");
          setSession(null);
          setUser(null);
          setLoadingFalse();
        } else if (session) {
          // If session exists, onAuthStateChange should have already handled it
          // But set loading false anyway to ensure we don't hang
          setLoadingFalse();
        } else {
          // No session - set loading false
          setLoadingFalse();
        }
      } catch (error) {
        logger.error("❌ [useAuth] Error processing getSession result:", error);
        setLoadingFalse();
      }
    }).catch((error) => {
      logger.error("❌ [useAuth] Error in getSession (non-fatal):", error);
      setLoadingFalse();
    });

    return () => {
      logger.log("🔐 [useAuth] Cleanup - unmounting");
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const login = (userData: User) => {
    // This is kept for backward compatibility
    // In real app, login should be done via Supabase auth
    setUser(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem("test_role_override");
    setTestRoleOverride(null);
  };

  const refreshRole = useCallback(async () => {
    if (session?.user) {
      await fetchUserRole(session.user.id, session.user);
    }
  }, [session, fetchUserRole]);

  const setTestRole = (role: string | null) => {
    if (role) {
      localStorage.setItem("test_role_override", role);
      setTestRoleOverride(role);
      // Update user role immediately
      if (user) {
        setUser({ ...user, role: role as UserRole });
      }
    } else {
      localStorage.removeItem("test_role_override");
      setTestRoleOverride(null);
      // Refresh role from database
      refreshRole();
    }
  };

  const hasPermission = (action: string): boolean => {
    if (!user) return false;
    return canPerformAction(user.role, action);
  };

  const canAccess = (module: string): boolean => {
    if (!user) return false;
    return canAccessModule(user.role, module);
  };

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "admin" || user?.role?.startsWith("admin_") || user?.role === "pengurus";
  const isViewer = user?.role === "pengurus" || user?.role === "santri";

  return {
    user,
    session,
    loading,
    login,
    logout,
    hasPermission,
    canAccess,
    isAdmin,
    isStaff,
    isViewer,
    refreshRole,
    setTestRole, // For role switcher in Settings
    testRoleOverride
  };
}
