/**
 * Tests for Inventaris Error Handling Utilities
 * 
 * Requirements: 2.5, 3.2, 3.3, 4.4
 */

import { describe, it, expect } from 'vitest';
import {
  validateSalesForm,
  validateMultiItemSalesForm,
  getStockWarning,
  formatStockValidationErrors,
  formatDatabaseError,
  formatFinancialError,
  ValidationError,
  StockError,
  DatabaseError,
  FinancialError
} from './inventaris-error-handling';
import type { StockValidationError } from '@/types/inventaris.types';

describe('Error Handling Utilities', () => {
  describe('validateSalesForm', () => {
    it('should validate a complete valid form', () => {
      const result = validateSalesForm({
        item: 'item-123',
        jumlah: '5',
        harga_dasar: '10000',
        sumbangan: '5000',
        pembeli: 'John Doe',
        tanggal: '2024-01-01'
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject form with missing required fields', () => {
      const result = validateSalesForm({
        item: '',
        jumlah: '',
        harga_dasar: '',
        pembeli: '',
        tanggal: ''
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Item harus dipilih');
      expect(result.errors).toContain('Jumlah harus diisi');
      expect(result.errors).toContain('Harga dasar harus diisi');
      expect(result.errors).toContain('Nama pembeli harus diisi');
      expect(result.errors).toContain('Tanggal harus diisi');
    });
    
    it('should reject negative quantity', () => {
      const result = validateSalesForm({
        item: 'item-123',
        jumlah: '-5',
        harga_dasar: '10000',
        pembeli: 'John Doe',
        tanggal: '2024-01-01'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Jumlah harus berupa angka positif');
    });
    
    it('should reject zero quantity', () => {
      const result = validateSalesForm({
        item: 'item-123',
        jumlah: '0',
        harga_dasar: '10000',
        pembeli: 'John Doe',
        tanggal: '2024-01-01'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Jumlah harus berupa angka positif');
    });
    
    it('should reject negative price', () => {
      const result = validateSalesForm({
        item: 'item-123',
        jumlah: '5',
        harga_dasar: '-10000',
        pembeli: 'John Doe',
        tanggal: '2024-01-01'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Harga dasar harus berupa angka non-negatif');
    });
    
    it('should reject negative donation', () => {
      const result = validateSalesForm({
        item: 'item-123',
        jumlah: '5',
        harga_dasar: '10000',
        sumbangan: '-5000',
        pembeli: 'John Doe',
        tanggal: '2024-01-01'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Sumbangan harus berupa angka non-negatif');
    });
  });
  
  describe('validateMultiItemSalesForm', () => {
    it('should validate a complete valid multi-item form', () => {
      const result = validateMultiItemSalesForm({
        pembeli: 'John Doe',
        tanggal: '2024-01-01',
        items: [
          { item_id: 'item-1', jumlah: 5, harga_dasar: 10000, sumbangan: 5000 },
          { item_id: 'item-2', jumlah: 3, harga_dasar: 15000, sumbangan: 0 }
        ]
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject form with no items', () => {
      const result = validateMultiItemSalesForm({
        pembeli: 'John Doe',
        tanggal: '2024-01-01',
        items: []
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transaksi harus memiliki minimal satu item');
    });
    
    it('should reject items with invalid quantity', () => {
      const result = validateMultiItemSalesForm({
        pembeli: 'John Doe',
        tanggal: '2024-01-01',
        items: [
          { item_id: 'item-1', jumlah: 0, harga_dasar: 10000, sumbangan: 0 }
        ]
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Jumlah harus lebih dari 0'))).toBe(true);
    });
    
    it('should reject items with negative price', () => {
      const result = validateMultiItemSalesForm({
        pembeli: 'John Doe',
        tanggal: '2024-01-01',
        items: [
          { item_id: 'item-1', jumlah: 5, harga_dasar: -10000, sumbangan: 0 }
        ]
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Harga dasar tidak boleh negatif'))).toBe(true);
    });
  });
  
  describe('getStockWarning', () => {
    it('should return error when requested exceeds available', () => {
      const warning = getStockWarning(10, 5, 'Test Item');
      expect(warning).toContain('Stok tidak mencukupi');
      expect(warning).toContain('Tersedia: 5');
      expect(warning).toContain('Diminta: 10');
    });
    
    it('should return warning when requesting more than 80% of stock', () => {
      const warning = getStockWarning(9, 10, 'Test Item');
      expect(warning).toContain('Peringatan');
      expect(warning).toContain('90%');
    });
    
    it('should return null when stock is sufficient', () => {
      const warning = getStockWarning(5, 10, 'Test Item');
      expect(warning).toBeNull();
    });
  });
  
  describe('formatStockValidationErrors', () => {
    it('should format single error', () => {
      const errors: StockValidationError[] = [
        {
          item_id: 'item-1',
          nama_barang: 'Test Item',
          requested: 10,
          available: 5,
          message: 'Stok tidak mencukupi'
        }
      ];
      
      const formatted = formatStockValidationErrors(errors);
      expect(formatted).toBe('Stok tidak mencukupi');
    });
    
    it('should format multiple errors', () => {
      const errors: StockValidationError[] = [
        {
          item_id: 'item-1',
          nama_barang: 'Item 1',
          requested: 10,
          available: 5,
          message: 'Error 1'
        },
        {
          item_id: 'item-2',
          nama_barang: 'Item 2',
          requested: 20,
          available: 10,
          message: 'Error 2'
        }
      ];
      
      const formatted = formatStockValidationErrors(errors);
      expect(formatted).toContain('Ditemukan 2 masalah stok');
      expect(formatted).toContain('1. Error 1');
      expect(formatted).toContain('2. Error 2');
    });
    
    it('should return empty string for no errors', () => {
      const formatted = formatStockValidationErrors([]);
      expect(formatted).toBe('');
    });
  });
  
  describe('formatDatabaseError', () => {
    it('should format unique violation error', () => {
      const error = { code: '23505', message: 'duplicate key value' };
      const formatted = formatDatabaseError(error);
      expect(formatted).toContain('Data duplikat');
    });
    
    it('should format foreign key violation error', () => {
      const error = { code: '23503', message: 'foreign key violation' };
      const formatted = formatDatabaseError(error);
      expect(formatted).toContain('Referensi data tidak valid');
    });
    
    it('should format not null violation error', () => {
      const error = { code: '23502', message: 'not null violation' };
      const formatted = formatDatabaseError(error);
      expect(formatted).toContain('Data wajib tidak lengkap');
    });
    
    it('should format CORS error', () => {
      const error = { message: 'CORS policy blocked' };
      const formatted = formatDatabaseError(error);
      expect(formatted).toContain('Koneksi ke server gagal');
    });
    
    it('should format timeout error', () => {
      const error = { message: 'Request timed out' };
      const formatted = formatDatabaseError(error);
      expect(formatted).toContain('terlalu lama');
    });
  });
  
  describe('formatFinancialError', () => {
    it('should format akun kas error', () => {
      const error = { message: 'akun kas not found' };
      const formatted = formatFinancialError(error);
      expect(formatted).toContain('akun kas');
    });
    
    it('should format generic keuangan error', () => {
      const error = { message: 'keuangan insert failed' };
      const formatted = formatFinancialError(error);
      expect(formatted).toContain('keuangan');
    });
  });
  
  describe('Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Test validation error', { field: 'test' });
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Test validation error');
      expect(error.details).toEqual({ field: 'test' });
    });
    
    it('should create StockError with correct properties', () => {
      const error = new StockError('Test stock error', { available: 5 });
      expect(error.name).toBe('StockError');
      expect(error.code).toBe('STOCK_ERROR');
      expect(error.message).toBe('Test stock error');
      expect(error.details).toEqual({ available: 5 });
    });
    
    it('should create DatabaseError with correct properties', () => {
      const error = new DatabaseError('Test database error');
      expect(error.name).toBe('DatabaseError');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.message).toBe('Test database error');
    });
    
    it('should create FinancialError with correct properties', () => {
      const error = new FinancialError('Test financial error');
      expect(error.name).toBe('FinancialError');
      expect(error.code).toBe('FINANCIAL_ERROR');
      expect(error.message).toBe('Test financial error');
    });
  });
});
