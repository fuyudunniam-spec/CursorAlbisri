/**
 * Permission utilities for role-based access control
 * Defines which roles can access which modules
 */

export type AppRole = 
  | 'admin' 
  | 'admin_keuangan' 
  | 'admin_inventaris' 
  | 'admin_akademik' 
  | 'pengurus' 
  | 'santri';

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
  | 'monitoring'
  | 'plotting'
  | 'settings';

/**
 * Permission matrix: Maps roles to accessible modules
 * '*' means access to all modules
 */
const PERMISSION_MATRIX: Record<AppRole, string[] | '*' > = {
  admin: '*', // Full access to all modules
  admin_keuangan: ['dashboard', 'keuangan', 'pembayaran', 'tabungan', 'donasi', 'settings'],
  admin_inventaris: ['dashboard', 'inventaris', 'distribusi', 'penjualan', 'settings'],
  admin_akademik: ['dashboard', 'santri', 'monitoring', 'plotting', 'settings'],
  pengurus: ['dashboard', 'santri', 'keuangan', 'donasi', 'inventaris', 'monitoring', 'settings'], // Read-only access
  santri: ['dashboard', 'tabungan', 'settings'], // Limited access
};

/**
 * Module path mapping: Maps route paths to module names
 */
const MODULE_PATH_MAP: Record<string, ModuleName> = {
  '/': 'dashboard',
  '/santri': 'santri',
  '/santri-dashboard': 'santri',
  '/keuangan-v3': 'keuangan',
  '/keuangan-dashboard': 'keuangan',
  '/tagihan-santri': 'pembayaran',
  '/tabungan': 'tabungan',
  '/donasi': 'donasi',
  '/inventaris': 'inventaris',
  '/inventaris/master': 'inventaris',
  '/inventaris/sales': 'penjualan',
  '/inventaris/distribution': 'distribusi',
  '/inventaris/transactions': 'inventaris',
  '/monitoring': 'monitoring',
  '/ploating-kelas': 'plotting',
  '/akademik/master': 'plotting',
  '/akademik/absensi': 'monitoring',
  '/akademik/setoran': 'monitoring',
  '/settings': 'settings',
  '/admin/santri-accounts': 'settings', // Admin only - managed via page-level check
  '/change-password': 'settings', // All authenticated users can access
};

/**
 * Check if a role can access a specific module
 * @param role - User role
 * @param module - Module name to check access for
 * @returns true if role can access module, false otherwise
 */
export function canAccessModule(role: AppRole | string, module: ModuleName | string): boolean {
  // Normalize role to AppRole type
  const normalizedRole = role as AppRole;
  
  // Check if role exists in permission matrix
  if (!PERMISSION_MATRIX[normalizedRole]) {
    console.warn(`Unknown role: ${normalizedRole}`);
    return false;
  }

  const allowedModules = PERMISSION_MATRIX[normalizedRole];

  // Admin has access to everything
  if (allowedModules === '*') {
    return true;
  }

  // Check if module is in allowed list
  return allowedModules.includes(module as ModuleName);
}

/**
 * Check if a role can access a route path
 * @param role - User role
 * @param path - Route path to check
 * @returns true if role can access path, false otherwise
 */
export function canAccessPath(role: AppRole | string, path: string): boolean {
  // Normalize path (remove query params, hash, trailing slash)
  const normalizedPath = path.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  
  // Get module name from path
  const module = MODULE_PATH_MAP[normalizedPath];
  
  if (!module) {
    // If path is not in map, default to dashboard access check
    // This allows access to paths not explicitly defined
    return canAccessModule(role, 'dashboard');
  }

  return canAccessModule(role, module);
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

