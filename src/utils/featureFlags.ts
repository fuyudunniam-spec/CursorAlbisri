/**
 * Feature flags utility for toggling functionality
 * Access environment variables with VITE_ prefix
 */
export const getFeature = (flagName: string): boolean => {
  return import.meta.env[`VITE_${flagName}`] === 'true';
};
