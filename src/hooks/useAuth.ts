import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { getUserRoles, getUserProfile, getUserPrimaryRole } from "@/services/auth.service";
import { canAccessModule, canPerformAction, type AppRole } from "@/utils/permissions";

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
          console.warn("Error fetching roles, using default:", err);
          return [];
        }),
        getUserProfile(userId).catch(err => {
          console.warn("Error fetching profile:", err);
          return null;
        }),
        // Fetch santri data if user is santri
        // Use RPC function to bypass potential RLS issues
        supabase
          .rpc('get_santri_by_user_id', { p_user_id: userId })
          .then(({ data }) => {
            // RPC returns array, get first item
            return Array.isArray(data) && data.length > 0 ? data[0] : null;
          })
          .catch((err) => {
            console.warn('Error fetching santri data:', err);
            return null;
          })
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
      console.error("Error fetching user role:", error);
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
        console.log("✅ [useAuth] Setting loading to false");
        setLoading(false);
        hasSetLoading = true;
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    console.log("🔐 [useAuth] Initializing auth check...");

    // Safety timeout - ALWAYS set loading to false after 3 seconds max
    timeoutId = setTimeout(() => {
      if (mounted && !hasSetLoading) {
        console.warn("⏰ [useAuth] TIMEOUT: Force setting loading to false after 3 seconds");
        console.warn("⏰ [useAuth] This usually means getSession() is hanging. Check Supabase connection.");
        setLoading(false);
        hasSetLoading = true;
        // On timeout, assume no session and user needs to login
        setSession(null);
        setUser(null);
      }
    }, 3000);

    // Set up auth state listener FIRST (this might fire immediately)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) {
          console.log("🔐 [useAuth] Component unmounted, skipping auth state change");
          return;
        }

        console.log("🔐 [useAuth] Auth state changed", { event, hasSession: !!session, userId: session?.user?.id });

        try {
          setSession(session);

          if (session?.user) {
            console.log("🔐 [useAuth] Fetching role for user", session.user.id);
            
            // Add timeout for role fetching to prevent hanging
            // Check localStorage cache first for faster loading
            const cacheKey = `user_roles_${session.user.id}`;
            const cachedRoles = localStorage.getItem(cacheKey);
            let cachedRoleData: any = null;
            
            if (cachedRoles) {
              try {
                const roles = JSON.parse(cachedRoles);
                const cacheTime = localStorage.getItem(`${cacheKey}_time`);
                if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000 && roles.length > 0) {
                  cachedRoleData = {
                    id: session.user.id,
                    email: session.user.email || '',
                    role: roles[0] || 'santri',
                    roles: roles,
                    name: session.user.email?.split('@')[0] || 'User'
                  };
                  console.log("⚡ [useAuth] Using cached role data:", cachedRoleData.role);
                }
              } catch (e) {
                // Invalid cache, continue to fetch
              }
            }
            
            // If we have cached data, set it immediately but still fetch in background
            if (cachedRoleData) {
              setUser(cachedRoleData);
              setLoadingFalse();
            }
            
            let roleFetchTimedOut = false;
            const timeoutId = setTimeout(() => {
              if (!cachedRoleData) {
                roleFetchTimedOut = true;
                console.warn("⏰ [useAuth] Role fetch timeout - using default role");
                // Set default user if timeout
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  role: 'santri',
                  roles: [],
                  name: session.user.email?.split('@')[0] || 'User'
                });
                setLoadingFalse();
              }
            }, 2000); // 2 second timeout (reduced from 3)

            // Fetch role (non-blocking if we have cache)
            if (cachedRoleData) {
              // We already have cached data, fetch in background to refresh
              fetchUserRole(session.user.id, session.user)
                .then(() => {
                  clearTimeout(timeoutId);
                  console.log("🔐 [useAuth] Role refreshed in background");
                })
                .catch((roleError) => {
                  clearTimeout(timeoutId);
                  console.warn("⚠️ [useAuth] Background role refresh failed:", roleError);
                });
            } else {
              // No cache, fetch role (may timeout, that's OK)
              fetchUserRole(session.user.id, session.user)
                .then(() => {
                  clearTimeout(timeoutId);
                  if (roleFetchTimedOut) {
                    console.log("🔐 [useAuth] Role fetched after timeout - updating user");
                  } else {
                    console.log("🔐 [useAuth] Role fetched successfully");
                  }
                })
                .catch((roleError) => {
                  clearTimeout(timeoutId);
                  if (!roleFetchTimedOut) {
                    console.error("❌ [useAuth] Error fetching role:", roleError);
                  }
                  // Default role will be set by timeout handler if needed
                });
            }
          } else {
            console.log("🔐 [useAuth] No session, setting user to null");
            setUser(null);
          }
        } catch (error) {
          console.error("❌ [useAuth] Error in auth state change:", error);
          setUser(null);
        } finally {
          // Always set loading to false, even if role fetch is still pending
          setLoadingFalse();
        }
      }
    );

    // Check for existing session - but don't block if it times out
    // onAuthStateChange should fire and handle session detection
    console.log("🔐 [useAuth] Checking existing session (non-blocking)...");
    
    // Try to get session but don't wait too long
    // The onAuthStateChange listener above will handle session detection
    supabase.auth.getSession().then(async (result) => {
      if (!mounted) {
        console.log("🔐 [useAuth] Component unmounted, skipping getSession result");
        return;
      }

      try {
        const { data: { session }, error } = result;

        if (error) {
          console.error("❌ [useAuth] Error getting session:", error);
          // Don't set loading false here - let onAuthStateChange handle it
          return;
        }

        console.log("🔐 [useAuth] Session check result", { hasSession: !!session, userId: session?.user?.id });

        if (session && !session.user) {
          console.warn("⚠️ [useAuth] Session exists but no user - clearing");
          setSession(null);
          setUser(null);
        }
        // If session exists, onAuthStateChange should have already handled it
        // Only set loading false if we got here quickly (session check completed)
        if (session) {
          setLoadingFalse();
        }
      } catch (error) {
        console.error("❌ [useAuth] Error processing getSession result:", error);
      }
      // Don't set loading false in finally - let timeout or onAuthStateChange handle it
    }).catch((error) => {
      console.error("❌ [useAuth] Error in getSession (non-fatal):", error);
      // This is OK - onAuthStateChange will handle session detection
    });

    return () => {
      console.log("🔐 [useAuth] Cleanup - unmounting");
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
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
