/**
 * Utility functions for safe URL handling
 */

/**
 * Check if URL is safe to use (not a blob URL)
 */
export const isSafeUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return !url.startsWith('blob:');
};

/**
 * Get safe URL for display, fallback to empty string if unsafe
 */
export const getSafeUrl = (url: string | null | undefined): string => {
  return isSafeUrl(url) ? url : '';
};

/**
 * Check if URL is a valid data URL (base64 encoded image)
 */
export const isDataUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('data:image/');
};

/**
 * Get safe avatar URL for display
 * Handles both full URLs and relative paths from Supabase storage
 */
export const getSafeAvatarUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Allow data URLs (base64 encoded images) and regular URLs
  if (isDataUrl(url) || (url.startsWith('http') && !url.startsWith('blob:'))) {
    return url;
  }
  
  // Handle relative paths from Supabase storage
  // Path format: "santri/{santriId}/photos/{filename}" or "{santriId}/{filename}"
  if (url.includes('/') && !url.startsWith('http')) {
    // This is a relative path, will be handled by component that has access to supabase
    // Return empty string here, component should generate public URL
    return '';
  }
  
  return '';
};
