/**
 * Service Layer untuk Chart Data Keuangan
 * 
 * Phase 3 Refactoring: Extract chart logic dari component ke service layer
 * 
 * IMPORTANT: Data keuangan sangat penting, jadi semua fungsi di sini harus:
 * 1. Tidak mengubah data asli (hanya process & format)
 * 2. Konsisten dengan logic yang sudah ada
 * 3. Return data dalam format yang sama dengan sebelumnya
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  excludeTabunganTransactions, 
  applyTabunganExclusionFilter,
  excludeKoperasiTransactions,
  applyKoperasiExclusionFilter,
  normalizeAkunKas 
} from '@/utils/keuanganFilters';

/**
 * Interface untuk monthly chart data
 */
export interface MonthlyChartData {
  month: string;
  pemasukan: number;
  pengeluaran: number;
}

/**
 * Interface untuk category chart data
 */
export interface CategoryChartData {
  name: string;
  value: number; // percentage
  amount: number; // total amount in rupiah
  color: string;
}

/**
 * Get monthly data untuk chart (last 7 months or custom date range)
 * 
 * @param accountId - Optional account ID untuk filter by account
 * @param startDateFilter - Optional start date filter (YYYY-MM-DD format)
 * @param endDateFilter - Optional end date filter (YYYY-MM-DD format)
 * @returns Array of monthly data dengan pemasukan & pengeluaran
 */
export const getMonthlyData = async (
  accountId?: string,
  startDateFilter?: string,
  endDateFilter?: string
): Promise<MonthlyChartData[]> => {
  try {
    // Use custom date range if provided, otherwise use last 7 months
    let startDate: Date;
    let endDate: Date;
    
    if (startDateFilter && endDateFilter) {
      startDate = new Date(startDateFilter);
      endDate = new Date(endDateFilter);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6); // Last 7 months including current
    }
    
    // IMPORTANT: Include akun_kas join to filter by managed_by
    // This ensures we can exclude transactions from accounts managed by koperasi/tabungan modules
    // CRITICAL: Filter by ledger='UMUM' to ensure only general finance module transactions are included
    let query = supabase
      .from('keuangan')
      .select(`
        tanggal,
        jenis_transaksi,
        jumlah,
        source_module,
        kategori,
        akun_kas_id,
        ledger,
        akun_kas:akun_kas_id(nama, managed_by)
      `)
      .eq('ledger', 'UMUM') // CRITICAL: Only include transactions from general finance module
      .gte('tanggal', startDate.toISOString().split('T')[0])
      .lte('tanggal', endDate.toISOString().split('T')[0]);
    
    // Exclude tabungan santri transactions (using shared utility)
    query = applyTabunganExclusionFilter(query);
    // Exclude koperasi transactions (using shared utility)
    query = applyKoperasiExclusionFilter(query);
      
    if (accountId) {
      query = query.eq('akun_kas_id', accountId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Filter out tabungan and koperasi transactions client-side (backup filtering using shared utility)
    // This is critical because client-side filtering can check akun_kas.managed_by which server-side filter cannot
    const filteredData = excludeKoperasiTransactions(excludeTabunganTransactions(data as any));
    
    // Group by month
    const monthlyStats: { [key: string]: { pemasukan: number; pengeluaran: number } } = {};
    
    // Initialize months in date range
    const current = new Date(startDate);
    current.setDate(1); // Start from first day of month
    while (current <= endDate) {
      const monthKey = current.toISOString().substring(0, 7); // YYYY-MM format
      monthlyStats[monthKey] = { pemasukan: 0, pengeluaran: 0 };
      current.setMonth(current.getMonth() + 1);
    }
    
    // Process transactions
    filteredData.forEach(transaction => {
      const monthKey = transaction.tanggal.substring(0, 7);
      if (monthlyStats[monthKey]) {
        if (transaction.jenis_transaksi === 'Pemasukan') {
          monthlyStats[monthKey].pemasukan += transaction.jumlah || 0;
        } else if (transaction.jenis_transaksi === 'Pengeluaran') {
          monthlyStats[monthKey].pengeluaran += transaction.jumlah || 0;
        }
      }
    });
    
    // Convert to chart format - ensure proper chronological order
    const sortedEntries = Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b)); // Sort by YYYY-MM format
    
    return sortedEntries.map(([monthKey, stats]) => {
      const date = new Date(monthKey + '-01');
      const monthName = date.toLocaleDateString('id-ID', { month: 'short' });
      return {
        month: monthName,
        pemasukan: stats.pemasukan,
        pengeluaran: stats.pengeluaran
      };
    });
      
  } catch (error) {
    console.error('Error loading monthly data:', error);
    return [];
  }
};

/**
 * Get category data untuk chart (current year expenditures or custom date range)
 * 
 * @param accountId - Optional account ID untuk filter by account
 * @param startDateFilter - Optional start date filter (YYYY-MM-DD format)
 * @param endDateFilter - Optional end date filter (YYYY-MM-DD format)
 * @returns Array of category data dengan percentage dan color
 */
export const getCategoryData = async (
  accountId?: string,
  startDateFilter?: string,
  endDateFilter?: string
): Promise<CategoryChartData[]> => {
  try {
    // Use custom date range if provided, otherwise use current year
    let startDate: string;
    let endDate: string;
    
    if (startDateFilter && endDateFilter) {
      startDate = startDateFilter;
      endDate = endDateFilter;
    } else {
      const currentYear = new Date().getFullYear();
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
    }
    
    // BUG B FIX: Explicitly select all required fields for chart
    // Ensure id, kategori, sub_kategori, jumlah, akun_kas_id are included
    // CRITICAL: Filter by ledger='UMUM' to ensure only general finance module transactions are included
    let query = supabase
      .from('keuangan')
      .select(`
        id,
        kategori,
        sub_kategori,
        jumlah,
        akun_kas_id,
        jenis_transaksi,
        tanggal,
        status,
        source_module,
        source_id,
        ledger,
        akun_kas:akun_kas_id(nama, managed_by)
      `)
      .eq('jenis_transaksi', 'Pengeluaran')
      .eq('status', 'posted') // BUG B FIX: Only include posted transactions
      .eq('ledger', 'UMUM') // CRITICAL: Only include transactions from general finance module
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    // Exclude tabungan santri transactions (using shared utility)
    query = applyTabunganExclusionFilter(query);
    // Exclude koperasi transactions (using shared utility)
    query = applyKoperasiExclusionFilter(query);
      
    // BUG B FIX: Ensure filter by accountId is applied correctly
    if (accountId) {
      query = query.eq('akun_kas_id', accountId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Filter out tabungan and koperasi transactions client-side (backup filtering using shared utility)
    // Type assertion needed karena Supabase bisa return akun_kas sebagai array atau object
    const filteredData = excludeKoperasiTransactions(excludeTabunganTransactions(data as any));
    
    // BUG B FIX: Group by category (use kategori as primary grouping)
    // If sub_kategori exists, we can optionally show it, but for chart we group by parent kategori
    const categoryStats: { [key: string]: number } = {};
    let totalExpenditure = 0;
    
    // Initialize main categories to ensure they appear even if amount is 0
    // This ensures "Bantuan Langsung Yayasan" appears in chart as reference
    const mainCategories = [
      'Bantuan Langsung Yayasan',
      'Operasional dan Konsumsi Santri',
      'Pendidikan Formal',
      'Pendidikan Pesantren',
      'Operasional Yayasan',
      'Pembangunan'
    ];
    
    mainCategories.forEach(cat => {
      categoryStats[cat] = 0;
    });
    
    filteredData.forEach(transaction => {
      // BUG B FIX: Ensure amount is numeric (parse if string)
      let amount = transaction.jumlah;
      if (typeof amount === 'string') {
        // Remove currency formatting if present
        amount = parseFloat(amount.replace(/[^\d.-]/g, '')) || 0;
      }
      amount = Number(amount) || 0;
      
      // BUG B FIX: Use kategori for grouping, fallback to "Tidak berkategori" if missing
      const category = transaction.kategori || 'Lain-lain';
      if (!categoryStats[category]) {
        categoryStats[category] = 0;
      }
      categoryStats[category] += amount;
      totalExpenditure += amount;
    });
    
    // BUG B FIX: Only return data if there are expenses
    if (totalExpenditure === 0 || Object.keys(categoryStats).length === 0) {
      return [];
    }
    
    // Convert to chart format with colors
    // Assign specific colors to main categories for consistency
    const categoryColors: { [key: string]: string } = {
      'Bantuan Langsung Yayasan': '#3b82f6', // Blue
      'Operasional dan Konsumsi Santri': '#10b981', // Green
      'Pendidikan Formal': '#f59e0b', // Amber
      'Pendidikan Pesantren': '#8b5cf6', // Purple
      'Operasional Yayasan': '#ef4444', // Red
      'Pembangunan': '#f97316', // Orange
    };
    
    const defaultColors = ['#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'];
    let defaultColorIndex = 0;
    
    const result = Object.entries(categoryStats)
      .filter(([name, total]) => total > 0) // Only include categories with amount > 0
      .map(([name, total]) => ({
        name,
        value: totalExpenditure > 0 ? Math.round((total / totalExpenditure) * 100) : 0,
        amount: total, // BUG B FIX: Include amount for display
        color: categoryColors[name] || defaultColors[defaultColorIndex++ % defaultColors.length]
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount (not percentage)
    
    return result;
      
  } catch (error) {
    console.error('Error loading category data:', error);
    return [];
  }
};

/**
 * Get sub category data for a specific category (drill-down)
 * 
 * @param categoryName - Nama kategori yang akan di-drill-down
 * @param accountId - Optional account ID untuk filter by account
 * @param startDateFilter - Optional start date filter (YYYY-MM-DD format)
 * @param endDateFilter - Optional end date filter (YYYY-MM-DD format)
 * @returns Array of sub category data dengan percentage dan color
 */
export const getSubCategoryDataByCategory = async (
  categoryName: string,
  accountId?: string,
  startDateFilter?: string,
  endDateFilter?: string
): Promise<CategoryChartData[]> => {
  try {
    // Use custom date range if provided, otherwise use current year
    let startDate: string;
    let endDate: string;
    
    if (startDateFilter && endDateFilter) {
      startDate = startDateFilter;
      endDate = endDateFilter;
    } else {
      // Fallback to current year if no date range provided
      const currentYear = new Date().getFullYear();
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
    }
    
    let query = supabase
      .from('keuangan')
      .select(`
        id,
        kategori,
        sub_kategori,
        jumlah,
        akun_kas_id,
        jenis_transaksi,
        tanggal,
        status,
        source_module,
        source_id,
        ledger,
        akun_kas:akun_kas_id(nama, managed_by)
      `)
      .eq('jenis_transaksi', 'Pengeluaran')
      .eq('status', 'posted')
      .eq('ledger', 'UMUM')
      .eq('kategori', categoryName) // Filter by specific category
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    // Exclude tabungan and koperasi
    query = applyTabunganExclusionFilter(query);
    query = applyKoperasiExclusionFilter(query);
      
    if (accountId) {
      query = query.eq('akun_kas_id', accountId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const filteredData = excludeKoperasiTransactions(excludeTabunganTransactions(data as any));
    
    // Group by sub_kategori
    const subCategoryStats: { [key: string]: number } = {};
    let totalExpenditure = 0;
    
    filteredData.forEach(transaction => {
      let amount = transaction.jumlah;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[^\d.-]/g, '')) || 0;
      }
      amount = Number(amount) || 0;
      
      // Use sub_kategori, fallback to "Tidak ada sub kategori" if empty
      const subCategory = transaction.sub_kategori?.trim() || 'Tidak ada sub kategori';
      
      if (!subCategoryStats[subCategory]) {
        subCategoryStats[subCategory] = 0;
      }
      subCategoryStats[subCategory] += amount;
      totalExpenditure += amount;
    });
    
    if (totalExpenditure === 0 || Object.keys(subCategoryStats).length === 0) {
      return [];
    }
    
    // Get parent category color
    const categoryColors: { [key: string]: string } = {
      'Bantuan Langsung Yayasan': '#3b82f6',
      'Operasional dan Konsumsi Santri': '#10b981',
      'Pendidikan Formal': '#f59e0b',
      'Pendidikan Pesantren': '#8b5cf6',
      'Operasional Yayasan': '#ef4444',
      'Pembangunan': '#f97316',
    };
    
    const parentColor = categoryColors[categoryName] || '#6b7280';
    
    // Generate shades of parent color for sub categories
    // Convert hex to RGB, then create variations
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
          ]
        : [107, 114, 128]; // Default gray
    };
    
    const rgbToHex = (r: number, g: number, b: number): string => {
      return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };
    
    const generateColorShades = (baseColor: string, count: number): string[] => {
      const [r, g, b] = hexToRgb(baseColor);
      const shades: string[] = [];
      
      for (let i = 0; i < count; i++) {
        // Create lighter/darker variations
        const factor = 0.7 + (i * 0.1); // Range from 0.7 to 1.0
        const newR = Math.min(255, r * factor);
        const newG = Math.min(255, g * factor);
        const newB = Math.min(255, b * factor);
        shades.push(rgbToHex(newR, newG, newB));
      }
      return shades;
    };
    
    const subCategoryCount = Object.keys(subCategoryStats).length;
    const colorShades = generateColorShades(parentColor, subCategoryCount);
    
    const result = Object.entries(subCategoryStats)
      .filter(([name, total]) => total > 0)
      .map(([name, total], index) => ({
        name,
        value: totalExpenditure > 0 ? Math.round((total / totalExpenditure) * 100) : 0,
        amount: total,
        color: colorShades[index % colorShades.length] || parentColor
      }))
      .sort((a, b) => b.amount - a.amount);
    
    return result;
      
  } catch (error) {
    console.error('Error loading sub category data:', error);
    return [];
  }
};

/**
 * Load both monthly and category data (convenience function)
 * 
 * @param accountId - Optional account ID untuk filter by account
 * @param startDateFilter - Optional start date filter (YYYY-MM-DD format)
 * @param endDateFilter - Optional end date filter (YYYY-MM-DD format)
 * @returns Object dengan monthlyData dan categoryData
 */
export const loadChartData = async (
  accountId?: string,
  startDateFilter?: string,
  endDateFilter?: string
): Promise<{
  monthlyData: MonthlyChartData[];
  categoryData: CategoryChartData[];
}> => {
  const [monthlyData, categoryData] = await Promise.all([
    getMonthlyData(accountId, startDateFilter, endDateFilter),
    getCategoryData(accountId, startDateFilter, endDateFilter)
  ]);
  
  return {
    monthlyData,
    categoryData
  };
};



