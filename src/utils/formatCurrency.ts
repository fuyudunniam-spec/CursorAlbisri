/**
 * Utility function untuk format currency (Rupiah)
 * Digunakan di seluruh modul koperasi untuk konsistensi
 */
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format currency dari string input (dengan handling separator)
 */
export const formatCurrencyFromString = (amount: string): string => {
  const num = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return '';
  return formatRupiah(num);
};

/**
 * Parse currency string ke number
 */
export const parseCurrencyString = (amount: string): number => {
  return parseFloat(amount.replace(/\./g, '').replace(',', '.'));
};

