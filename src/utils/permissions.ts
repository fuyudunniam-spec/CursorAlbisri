/**
 * Permission utilities for role-based access control
 * Defines which roles can access which modules
 */

// Simplified role system - only 4 roles
export type AppRole = 
  | 'admin'      // Full access to all modules
  | 'staff'      // Flexible access - admin can configure allowed modules
  | 'pengajar'   // Access to pengajar profile only
  | 'santri';    // Access to santri profile only

export type ModuleName = 
  | 'dashboard'
  | 'santri'
  | 'keuangan'
  | 'pembayaran'
  | 'tabungan'
  | 'donasi'
  | 'inventaris'
  | 'distribusi'
  | 'penjualan'
  | 'koperasi'
  | 'monitoring'
  | 'plotting'
  | 'settings';

/**
 * Permission matrix: Maps roles to accessible modules
 * '*' means access to all modules
 * Empty array [] means role uses allowedModules field (flexible access configured by admin)
 */
const PERMISSION_MATRIX: Record<AppRole, string[] | '*' > = {
  admin: '*', // Full access to all modules (always - simplified approach)
  staff: [], // Flexible access - uses allowedModules field (must have explicit modules configured)
  pengajar: ['dashboard', 'monitoring', 'settings'], // Access to pengajar profile and monitoring
  santri: ['dashboard', 'santri', 'tabungan', 'settings'], // Access to santri profile (their own), tabungan, and settings
};

/**
 * Module path mapping: Maps route paths to module names
 */
const MODULE_PATH_MAP: Record<string, ModuleName> = {
  // Dashboard
  '/': 'dashboard',
  
  // Santri - Canonical routes
  '/santri': 'santri',
  '/santri/profile': 'santri',
  '/santri/add': 'santri',
  '/santri/onboarding': 'santri',
  '/santri/program-management/:santriId': 'santri',
  // Legacy routes (redirected)
  '/santri-dashboard': 'santri', // Redirects to /santri
  '/santri/profile-enhanced': 'santri', // Redirects to /santri/profile
  '/santri/profile-minimal': 'santri', // Redirects to /santri/profile
  '/santri/profile-master': 'santri', // Redirects to /santri/profile
  '/santri/profile-redesigned': 'santri', // Redirects to /santri/profile
  
  // Keuangan - Canonical routes
  '/keuangan-v3': 'keuangan',
  '/keuangan-v3/penyaluran-bantuan': 'keuangan',
  '/tagihan-santri': 'pembayaran',
  '/tabungan': 'tabungan',
  '/tabungan-santri': 'tabungan',
  '/laporan-tabungan': 'tabungan',
  // Legacy routes (redirected)
  '/keuangan': 'keuangan', // Redirects to /keuangan-v3
  '/keuangan-dashboard': 'keuangan', // Redirects to /keuangan-v3
  
  // Donasi - Canonical routes
  '/donasi': 'donasi',
  '/donasi/master-donatur': 'donasi',
  // Legacy routes (redirected)
  '/donasi-dashboard': 'donasi', // Redirects to /donasi
  
  // Inventaris - Canonical routes
  '/inventaris': 'inventaris',
  '/inventaris/master': 'inventaris',
  '/inventaris/distribution': 'distribusi',
  '/inventaris/distribution/distribusi-paket': 'distribusi',
  '/inventaris/distribution/master-paket': 'distribusi',
  '/inventaris/riwayat': 'inventaris',
  // Legacy routes (redirected)
  '/inventaris-dashboard': 'inventaris', // Redirects to /inventaris
  '/inventaris-test': 'inventaris', // Redirects to /inventaris
  '/inventaris-legacy': 'inventaris', // Redirects to /inventaris
  '/inventaris-old': 'inventaris', // Redirects to /inventaris
  '/inventaris/sales': 'koperasi', // Redirects to /koperasi/kasir
  
  // Koperasi - Canonical routes
  '/koperasi': 'koperasi',
  '/koperasi/master': 'koperasi',
  '/koperasi/master/supplier': 'koperasi',
  '/koperasi/kasir': 'koperasi',
  '/koperasi/inventaris': 'koperasi',
  '/koperasi/transfer': 'koperasi',
  '/koperasi/penjualan': 'koperasi',
  '/koperasi/pembelian': 'koperasi',
  '/koperasi/keuangan': 'koperasi',
  '/koperasi/keuangan/dashboard': 'koperasi',
  '/koperasi/keuangan/pembelian': 'koperasi',
  '/koperasi/keuangan/operasional': 'koperasi',
  '/koperasi/keuangan/kelola-hpp': 'koperasi',
  '/koperasi/laporan': 'koperasi',
  // Legacy routes (redirected)
  '/koperasi-old': 'koperasi', // Redirects to /koperasi
  
  // Akademik - Canonical routes
  '/akademik': 'monitoring',
  '/akademik/kelas': 'plotting',
  '/akademik/semester': 'monitoring',
  '/akademik/pertemuan': 'monitoring',
  '/akademik/setoran': 'monitoring',
  '/akademik/pengajar': 'monitoring',
  '/akademik/pengajar/profil': 'monitoring',
  '/akademik/perizinan': 'monitoring',
  '/akademik/nilai': 'monitoring',
  '/akademik/rapot': 'monitoring',
  // Legacy routes (redirected)
  '/ploating-kelas': 'plotting', // Redirects to /akademik/kelas?tab=plotting
  '/akademik/master': 'plotting', // Redirects to /akademik/kelas
  '/akademik/presensi': 'monitoring', // Redirects to /akademik/pertemuan?tab=presensi
  '/akademik/jurnal': 'monitoring', // Redirects to /akademik/pertemuan?tab=jurnal
  
  // Admin - Canonical routes
  '/admin/users': 'settings',
  '/admin/data-master': 'settings', // Alias for /admin/users
  '/admin/santri-accounts': 'settings',
  '/admin/keuangan-audit': 'settings',
  // Legacy routes (redirected)
  '/administrasi': 'settings', // Redirects to /admin/users
  
  // Other
  '/monitoring': 'monitoring',
  '/change-password': 'settings',
};

/**
 * Check if a role can access a specific module
 * @param role - User role
 * @param module - Module name to check access for
 * @param allowedModules - Optional array of allowed modules (for staff users only)
 * @returns true if role can access module, false otherwise
 */
export function canAccessModule(role: AppRole | string, module: ModuleName | string, allowedModules?: string[] | null): boolean {
  // Normalize role to AppRole type
  const normalizedRole = role as AppRole;
  
  // Check if role exists in permission matrix
  if (!PERMISSION_MATRIX[normalizedRole]) {
    console.warn(`Unknown role: ${normalizedRole}`);
    return false;
  }

  // Admin: Always full access (ignore allowedModules - simplified approach)
  if (normalizedRole === 'admin') {
    return true;
  }

  // Staff: Uses allowedModules field (flexible access configured by admin)
  if (normalizedRole === 'staff') {
    // Staff must have explicit modules configured
    if (!allowedModules || allowedModules.length === 0) {
      return false;
    }
    // Check if module is in the allowedModules list
    return allowedModules.includes(module as string);
  }

  // Other roles (santri, pengajar): Use permission matrix
  const roleAllowedModules = PERMISSION_MATRIX[normalizedRole];
  if (roleAllowedModules === '*') {
    return true;
  }

  // Check if module is in allowed list
  return roleAllowedModules.includes(module as ModuleName);
}

/**
 * Check if a user can access a specific module
 * @param user - User object with role and optional allowedModules
 * @param module - Module name to check access for
 * @returns true if user can access module, false otherwise
 */
export function canAccessModuleWithUser(user: { role: AppRole | string; allowedModules?: string[] | null }, module: ModuleName | string): boolean {
  return canAccessModule(user.role, module, user.allowedModules);
}

/**
 * Check if a role can access a route path
 * @param role - User role
 * @param path - Route path to check
 * @param allowedModules - Optional array of allowed modules (for admin users with restricted access)
 * @returns true if role can access path, false otherwise
 */
export function canAccessPath(role: AppRole | string, path: string, allowedModules?: string[] | null): boolean {
  // Normalize path (remove query params, hash, trailing slash)
  const normalizedPath = path.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  
  // Get module name from path
  const module = MODULE_PATH_MAP[normalizedPath];
  
  if (!module) {
    // If path is not in map, default to dashboard access check
    // This allows access to paths not explicitly defined
    return canAccessModule(role, 'dashboard', allowedModules);
  }

  return canAccessModule(role, module, allowedModules);
}

/**
 * Check if a user can access a route path
 * @param user - User object with role and optional allowedModules
 * @param path - Route path to check
 * @returns true if user can access path, false otherwise
 */
export function canAccessPathWithUser(user: { role: AppRole | string; allowedModules?: string[] | null }, path: string): boolean {
  return canAccessPath(user.role, path, user.allowedModules);
}

/**
 * Get all accessible modules for a role
 * @param role - User role
 * @returns Array of module names the role can access
 */
export function getAccessibleModules(role: AppRole | string): ModuleName[] {
  const normalizedRole = role as AppRole;
  
  if (!PERMISSION_MATRIX[normalizedRole]) {
    return [];
  }

  const allowedModules = PERMISSION_MATRIX[normalizedRole];

  if (allowedModules === '*') {
    // Return all modules if admin
    return Object.values(MODULE_PATH_MAP).filter(
      (value, index, self) => self.indexOf(value) === index
    ) as ModuleName[];
  }

  return allowedModules as ModuleName[];
}

/**
 * Check if a role can perform a specific action
 * @param role - User role
 * @param action - Action to check (e.g., 'create', 'edit', 'delete', 'view')
 * @param module - Optional module context
 * @returns true if role can perform action
 */
export function canPerformAction(
  role: AppRole | string, 
  action: string, 
  module?: ModuleName | string
): boolean {
  // If module is specified, check module access first
  if (module && !canAccessModule(role, module)) {
    return false;
  }

  // Admin can do everything
  if (role === 'admin') {
    return true;
  }

  // Action permissions based on role
  switch (action) {
    case 'view':
      // All authenticated users can view if they have module access
      return true;
    
    case 'create':
    case 'edit':
    case 'delete':
      // Only admins and specific module admins can modify
      if (role === 'admin' || role.startsWith('admin_')) {
        return true;
      }
      return false;
    
    case 'export':
    case 'report':
      // Only admins and pengurus can export/report
      return role === 'admin' || role === 'pengurus';
    
    default:
      return false;
  }
}

/**
 * Get permission matrix for display in UI
 */
export function getPermissionMatrix(): Record<AppRole, string[]> {
  const matrix: Record<string, string[]> = {};
  
  Object.entries(PERMISSION_MATRIX).forEach(([role, modules]) => {
    if (modules === '*') {
      matrix[role] = ['All Modules'];
    } else {
      matrix[role] = modules as string[];
    }
  });
  
  return matrix as Record<AppRole, string[]>;
}

/**
 * Get all available module names (unique list)
 * Used for module checklist in admin user forms
 */
export function getAllModuleNames(): ModuleName[] {
  return Array.from(new Set(Object.values(MODULE_PATH_MAP))) as ModuleName[];
}

/**
 * Get module display label for UI
 */
export function getModuleLabel(module: ModuleName): string {
  const labels: Record<ModuleName, string> = {
    'dashboard': 'Dashboard',
    'santri': 'Santri',
    'keuangan': 'Keuangan',
    'pembayaran': 'Pembayaran',
    'tabungan': 'Tabungan',
    'donasi': 'Donasi',
    'inventaris': 'Inventaris',
    'distribusi': 'Distribusi',
    'penjualan': 'Penjualan',
    'koperasi': 'Koperasi',
    'monitoring': 'Monitoring',
    'plotting': 'Plotting',
    'settings': 'Settings',
  };
  return labels[module] || module;
}

