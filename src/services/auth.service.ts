import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

/**
 * Get all roles for a user from the user_roles table
 * @param userId - The user ID from auth.users
 * @returns Array of role strings
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    console.log('📋 auth.service: Fetching roles for user', userId);
    
    // Check localStorage cache first (faster)
    const cacheKey = `user_roles_${userId}`;
    const cachedRoles = localStorage.getItem(cacheKey);
    if (cachedRoles) {
      try {
        const roles = JSON.parse(cachedRoles);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        // Cache valid for 5 minutes
        if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000) {
          console.log('✅ auth.service: Using cached roles for user', userId, ':', roles);
          return roles;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }
    
    // Try direct query first (faster, no RPC overhead)
    // Reduced timeout to 2 seconds for faster failover
    const directQueryPromise = supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ data: null, error: { message: 'Query timeout' } }), 2000);
    });

    let result: any = await Promise.race([directQueryPromise, timeoutPromise]);
    const { data, error } = result;

    if (error || !data) {
      if (error) {
        console.error('❌ auth.service: Error fetching user roles via direct query:', error);
        console.error('   Error code:', error.code, 'Error message:', error.message);
      }
      
      // Fallback to RPC function if direct query fails
      console.warn('⚠️ auth.service: Direct query failed, trying RPC function...');
      try {
        const rpcPromise = supabase
          .rpc('get_user_roles', { _user_id: userId });
        
        const rpcTimeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ data: null, error: { message: 'RPC timeout' } }), 3000);
        });

        const rpcResult: any = await Promise.race([rpcPromise, rpcTimeoutPromise]);
        const { data: rpcData, error: rpcError } = rpcResult;
        
        if (rpcError || !rpcData) {
          console.error('❌ auth.service: RPC function also failed:', rpcError);
          return [];
        }
        
        if (rpcData.length === 0) {
          console.warn('⚠️ auth.service: No roles found for user', userId, '- using default santri');
          return [];
        }
        
        const roles = rpcData.map((row: any) => row.role);
        console.log('✅ auth.service: Found roles via RPC for user', userId, ':', roles);
        
        // Cache roles in localStorage
        try {
          localStorage.setItem(cacheKey, JSON.stringify(roles));
          localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        } catch (e) {
          // localStorage might be full, ignore
        }
        
        return roles;
      } catch (fallbackError) {
        console.error('❌ auth.service: RPC fallback also failed:', fallbackError);
        return [];
      }
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ auth.service: No roles found for user', userId, '- using default santri');
      return [];
    }

    const roles = data.map((row: any) => row.role);
    console.log('✅ auth.service: Found roles for user', userId, ':', roles);
    
    // Cache roles in localStorage
    try {
      localStorage.setItem(cacheKey, JSON.stringify(roles));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    } catch (e) {
      // localStorage might be full, ignore
    }
    
    return roles;
  } catch (error: any) {
    console.error('❌ auth.service: Error in getUserRoles:', error);
    console.error('   Error type:', error?.constructor?.name);
    // Always return empty array instead of throwing
    return [];
  }
}

/**
 * Get user profile from the profiles table
 * @param userId - The user ID from auth.users
 * @returns UserProfile or null if not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('👤 auth.service: Fetching profile for user', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // Profile might not exist yet - this is OK
      if (error.code === 'PGRST116') {
        console.warn('⚠️ auth.service: Profile not found for user', userId, '- this is OK, will use defaults');
        return null;
      }
      console.error('❌ auth.service: Error fetching user profile:', error);
      // Don't throw, return null instead
      return null;
    }

    console.log('✅ auth.service: Found profile for user', userId);
    return data as UserProfile;
  } catch (error) {
    console.error('❌ auth.service: Error in getUserProfile:', error);
    // Always return null instead of throwing
    return null;
  }
}

/**
 * Get primary role for a user (first role in the array, or 'santri' as default)
 * @param userId - The user ID from auth.users
 * @returns Primary role string
 */
export async function getUserPrimaryRole(userId: string): Promise<string> {
  const roles = await getUserRoles(userId);
  
  if (roles.length === 0) {
    return 'santri'; // Default role
  }

  // If user has 'admin' role, prioritize it
  if (roles.includes('admin')) {
    return 'admin';
  }

  // Return first role as primary
  return roles[0];
}

