/**
 * USER VALIDATION UTILITIES
 * 
 * Functions untuk validate user data consistency
 * 
 * @version 1.0
 * @date 2025-01-27
 */

import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/services/userManagement.service';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate user data consistency
 */
export async function validateUserData(userId: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return {
      valid: false,
      errors: ['User profile tidak ditemukan'],
      warnings: [],
    };
  }

  // Get user roles
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (rolesError) {
    warnings.push('Gagal mengambil data roles');
  }

  const userRoles = (roles || []).map(r => r.role as AppRole);

  // Check santri data
  const { data: santri, error: santriError } = await supabase
    .from('santri')
    .select('id, id_santri, nama_lengkap, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (santriError && santriError.code !== 'PGRST116') {
    warnings.push('Gagal mengambil data santri');
  }

  // Check pengajar data
  const { data: pengajar, error: pengajarError } = await supabase
    .from('akademik_pengajar')
    .select('id, nama_lengkap, kode_pengajar, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (pengajarError && pengajarError.code !== 'PGRST116') {
    warnings.push('Gagal mengambil data pengajar');
  }

  // Validation rules

  // 1. If user has santri data, must have 'santri' role
  if (santri && !userRoles.includes('santri')) {
    errors.push('User memiliki data santri tapi tidak memiliki role "santri"');
  }

  // 2. If user has pengajar data, must have 'pengajar' role
  if (pengajar && !userRoles.includes('pengajar')) {
    errors.push('User memiliki data pengajar tapi tidak memiliki role "pengajar"');
  }

  // 3. User cannot be both santri and pengajar
  if (santri && pengajar) {
    errors.push('User tidak boleh memiliki data santri dan pengajar sekaligus');
  }

  // 4. Santri must have id_santri
  if (santri && !santri.id_santri) {
    errors.push('Santri tidak memiliki id_santri');
  }

  // 5. Pengajar must have nama_lengkap
  if (pengajar && !pengajar.nama_lengkap) {
    errors.push('Pengajar tidak memiliki nama_lengkap');
  }

  // 6. User must have at least one role
  if (userRoles.length === 0) {
    errors.push('User tidak memiliki role apapun');
  }

  // 7. Profile must have email
  if (!profile.email) {
    warnings.push('Profile tidak memiliki email');
  }

  // 8. Profile must have full_name
  if (!profile.full_name) {
    warnings.push('Profile tidak memiliki full_name');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all users and return summary
 */
export async function validateAllUsers(): Promise<{
  total: number;
  valid: number;
  invalid: number;
  results: Array<{
    userId: string;
    email: string;
    validation: ValidationResult;
  }>;
}> {
  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email');

  if (error || !profiles) {
    throw new Error('Gagal mengambil data profiles');
  }

  const results = await Promise.all(
    profiles.map(async (profile) => {
      const validation = await validateUserData(profile.id);
      return {
        userId: profile.id,
        email: profile.email || '',
        validation,
      };
    })
  );

  const valid = results.filter(r => r.validation.valid).length;
  const invalid = results.length - valid;

  return {
    total: results.length,
    valid,
    invalid,
    results,
  };
}

/**
 * Fix common validation issues
 */
export async function fixUserData(userId: string): Promise<{
  success: boolean;
  fixes: string[];
  errors: string[];
}> {
  const fixes: string[] = [];
  const errors: string[] = [];

  const validation = await validateUserData(userId);

  if (validation.valid) {
    return {
      success: true,
      fixes: [],
      errors: [],
    };
  }

  // Get current data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const { data: santri } = await supabase
    .from('santri')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: pengajar } = await supabase
    .from('akademik_pengajar')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const userRoles = (roles || []).map(r => r.role);

  // Fix: Add missing 'santri' role
  if (santri && !userRoles.includes('santri')) {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'santri' });

    if (error) {
      errors.push(`Gagal menambahkan role 'santri': ${error.message}`);
    } else {
      fixes.push("Menambahkan role 'santri'");
    }
  }

  // Fix: Add missing 'pengajar' role
  if (pengajar && !userRoles.includes('pengajar')) {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'pengajar' });

    if (error) {
      errors.push(`Gagal menambahkan role 'pengajar': ${error.message}`);
    } else {
      fixes.push("Menambahkan role 'pengajar'");
    }
  }

  return {
    success: errors.length === 0,
    fixes,
    errors,
  };
}












