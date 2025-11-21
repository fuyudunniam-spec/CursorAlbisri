/**
 * Error Handling and User Feedback Utilities for Inventaris Module
 * 
 * This module provides comprehensive error handling, validation, and user feedback
 * for inventory sales transactions, including multi-item sales.
 * 
 * Requirements: 2.5, 3.2, 3.3, 4.4
 */

import { toast } from 'sonner';
import type { StockValidationError } from '@/types/inventaris.types';

// ============================================================================
// Error Types and Classes
// ============================================================================

export class InventoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'InventoryError';
  }
}

export class ValidationError extends InventoryError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class StockError extends InventoryError {
  constructor(message: string, details?: any) {
    super(message, 'STOCK_ERROR', details);
    this.name = 'StockError';
  }
}

export class DatabaseError extends InventoryError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class FinancialError extends InventoryError {
  constructor(message: string, details?: any) {
    super(message, 'FINANCIAL_ERROR', details);
    this.name = 'FinancialError';
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate form input for sales transaction
 * Requirements: 2.5
 */
export function validateSalesForm(formData: {
  item?: string;
  jumlah?: string;
  harga_dasar?: string;
  sumbangan?: string;
  pembeli?: string;
  tanggal?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!formData.item || formData.item.trim() === '') {
    errors.push('Item harus dipilih');
  }
  
  if (!formData.jumlah || formData.jumlah.trim() === '') {
    errors.push('Jumlah harus diisi');
  }
  
  if (!formData.harga_dasar || formData.harga_dasar.trim() === '') {
    errors.push('Harga dasar harus diisi');
  }
  
  if (!formData.pembeli || formData.pembeli.trim() === '') {
    errors.push('Nama pembeli harus diisi');
  }
  
  if (!formData.tanggal || formData.tanggal.trim() === '') {
    errors.push('Tanggal harus diisi');
  }
  
  // Validate numeric values
  if (formData.jumlah) {
    const jumlah = parseInt(formData.jumlah);
    if (isNaN(jumlah) || jumlah <= 0) {
      errors.push('Jumlah harus berupa angka positif');
    }
  }
  
  if (formData.harga_dasar) {
    const hargaDasar = parseFloat(formData.harga_dasar);
    if (isNaN(hargaDasar) || hargaDasar < 0) {
      errors.push('Harga dasar harus berupa angka non-negatif');
    }
  }
  
  if (formData.sumbangan) {
    const sumbangan = parseFloat(formData.sumbangan);
    if (isNaN(sumbangan) || sumbangan < 0) {
      errors.push('Sumbangan harus berupa angka non-negatif');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate multi-item sales form
 * Requirements: 1.5, 2.5
 */
export function validateMultiItemSalesForm(formData: {
  pembeli?: string;
  tanggal?: string;
  items?: Array<{
    item_id: string;
    jumlah: number;
    harga_dasar: number;
    sumbangan: number;
  }>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!formData.pembeli || formData.pembeli.trim() === '') {
    errors.push('Nama pembeli harus diisi');
  }
  
  if (!formData.tanggal || formData.tanggal.trim() === '') {
    errors.push('Tanggal harus diisi');
  }
  
  // Check items
  if (!formData.items || formData.items.length === 0) {
    errors.push('Transaksi harus memiliki minimal satu item');
  } else {
    // Validate each item
    formData.items.forEach((item, index) => {
      if (!item.item_id || item.item_id.trim() === '') {
        errors.push(`Item #${index + 1}: ID item tidak valid`);
      }
      
      if (item.jumlah <= 0) {
        errors.push(`Item #${index + 1}: Jumlah harus lebih dari 0`);
      }
      
      if (item.harga_dasar < 0) {
        errors.push(`Item #${index + 1}: Harga dasar tidak boleh negatif`);
      }
      
      if (item.sumbangan < 0) {
        errors.push(`Item #${index + 1}: Sumbangan tidak boleh negatif`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Stock Warning Functions
// ============================================================================

/**
 * Check if stock is low and return warning message
 * Requirements: 3.2
 */
export function getStockWarning(
  requested: number,
  available: number,
  itemName: string
): string | null {
  if (requested > available) {
    return `⚠️ Stok tidak mencukupi untuk ${itemName}. Tersedia: ${available}, Diminta: ${requested}`;
  }
  
  // Warning if requesting more than 80% of available stock
  if (requested > available * 0.8) {
    return `⚠️ Peringatan: Anda akan menggunakan ${Math.round((requested / available) * 100)}% dari stok ${itemName}`;
  }
  
  return null;
}

/**
 * Format stock validation errors for display
 * Requirements: 3.2, 3.3
 */
export function formatStockValidationErrors(
  errors: StockValidationError[]
): string {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0].message;
  }
  
  return `Ditemukan ${errors.length} masalah stok:\n` + 
    errors.map((e, i) => `${i + 1}. ${e.message}`).join('\n');
}

// ============================================================================
// Error Message Formatting
// ============================================================================

/**
 * Format database error for user display
 * Requirements: 4.4
 */
export function formatDatabaseError(error: any): string {
  // Handle specific PostgreSQL error codes
  if (error.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return 'Data duplikat terdeteksi. Transaksi ini mungkin sudah ada.';
      case '23503': // foreign_key_violation
        return 'Referensi data tidak valid. Item mungkin sudah dihapus.';
      case '23502': // not_null_violation
        return 'Data wajib tidak lengkap. Pastikan semua field terisi.';
      case 'PGRST116': // no rows returned
        return 'Data tidak ditemukan.';
      case '42P01': // undefined_table
        return 'Tabel database tidak ditemukan. Hubungi administrator.';
      default:
        break;
    }
  }
  
  // Handle CORS errors
  if (error.message?.includes('CORS') || 
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('520') ||
      error.message?.includes('523')) {
    return 'Koneksi ke server gagal. Periksa koneksi internet Anda atau hubungi administrator.';
  }
  
  // Handle timeout errors
  if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
    return 'Operasi memakan waktu terlalu lama. Silakan coba lagi.';
  }
  
  // Generic database error
  if (error.message) {
    return `Kesalahan database: ${error.message}`;
  }
  
  return 'Terjadi kesalahan database yang tidak diketahui.';
}

/**
 * Format financial error for user display
 * Requirements: 4.4
 */
export function formatFinancialError(error: any): string {
  if (error.message?.includes('akun kas')) {
    return 'Gagal mencatat ke akun kas. Pastikan akun kas tersedia.';
  }
  
  if (error.message?.includes('keuangan')) {
    return 'Gagal mencatat transaksi keuangan. Transaksi inventaris dibatalkan.';
  }
  
  return `Kesalahan pencatatan keuangan: ${error.message || 'Tidak diketahui'}`;
}

// ============================================================================
// Toast Notification Helpers
// ============================================================================

/**
 * Show validation error toast
 * Requirements: 2.5
 */
export function showValidationError(errors: string[]): void {
  if (errors.length === 0) return;
  
  if (errors.length === 1) {
    toast.error(errors[0], {
      duration: 4000,
      description: 'Perbaiki kesalahan dan coba lagi'
    });
  } else {
    toast.error('Validasi gagal', {
      duration: 5000,
      description: errors.join('\n')
    });
  }
}

/**
 * Show stock warning toast
 * Requirements: 3.2
 */
export function showStockWarning(message: string): void {
  toast.warning(message, {
    duration: 5000,
    icon: '⚠️'
  });
}

/**
 * Show stock error toast
 * Requirements: 3.3
 */
export function showStockError(errors: StockValidationError[]): void {
  const message = formatStockValidationErrors(errors);
  toast.error('Stok tidak mencukupi', {
    duration: 6000,
    description: message
  });
}

/**
 * Show database error toast
 * Requirements: 4.4
 */
export function showDatabaseError(error: any): void {
  const message = formatDatabaseError(error);
  toast.error('Kesalahan Database', {
    duration: 5000,
    description: message
  });
}

/**
 * Show financial error toast
 * Requirements: 4.4
 */
export function showFinancialError(error: any): void {
  const message = formatFinancialError(error);
  toast.error('Kesalahan Keuangan', {
    duration: 5000,
    description: message
  });
}

/**
 * Show success toast
 */
export function showSuccess(message: string, description?: string): void {
  toast.success(message, {
    duration: 3000,
    description
  });
}

/**
 * Show loading toast and return dismiss function
 */
export function showLoading(message: string): () => void {
  const toastId = toast.loading(message);
  return () => toast.dismiss(toastId);
}

// ============================================================================
// Error Handler Wrapper
// ============================================================================

/**
 * Wrap async function with comprehensive error handling
 * Requirements: 2.5, 3.2, 3.3, 4.4
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    loadingMessage?: string;
    successMessage?: string;
    errorContext?: string;
  } = {}
): Promise<T | null> {
  const dismissLoading = options.loadingMessage 
    ? showLoading(options.loadingMessage)
    : null;
  
  try {
    const result = await operation();
    
    if (dismissLoading) {
      dismissLoading();
    }
    
    if (options.successMessage) {
      showSuccess(options.successMessage);
    }
    
    return result;
  } catch (error: any) {
    if (dismissLoading) {
      dismissLoading();
    }
    
    console.error(`Error in ${options.errorContext || 'operation'}:`, error);
    
    // Handle specific error types
    if (error instanceof ValidationError) {
      showValidationError([error.message]);
    } else if (error instanceof StockError) {
      if (error.details?.errors) {
        showStockError(error.details.errors);
      } else {
        toast.error(error.message);
      }
    } else if (error instanceof FinancialError) {
      showFinancialError(error);
    } else if (error instanceof DatabaseError) {
      showDatabaseError(error);
    } else {
      // Generic error
      const context = options.errorContext ? ` (${options.errorContext})` : '';
      toast.error(`Operasi gagal${context}`, {
        duration: 5000,
        description: error.message || 'Terjadi kesalahan yang tidak diketahui'
      });
    }
    
    return null;
  }
}
