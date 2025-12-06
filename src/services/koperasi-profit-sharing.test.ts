/**
 * Tests for Koperasi Profit Sharing Methods
 * Validates: Requirements 2.1-2.5, 3.1-3.6, 5.1-5.5
 */

import { describe, it, expect } from 'vitest';
import { koperasiService } from './koperasi.service';
import type { KoperasiProduk } from '@/types/koperasi.types';

describe('Koperasi Profit Sharing', () => {
  describe('calculateProfitSharing', () => {
    it('should calculate 0% for koperasi products', () => {
      const product: KoperasiProduk = {
        id: '1',
        kode_produk: 'PRD-001',
        nama_produk: 'Test Product',
        kategori: null,
        satuan: 'pcs',
        harga_beli: 5000,
        harga_jual: 10000,
        owner_type: 'koperasi',
        bagi_hasil_yayasan: 0,
        barcode: null,
        deskripsi: null,
        foto_url: null,
        is_active: true,
        inventaris_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      };

      const result = koperasiService.calculateProfitSharing(10000, product);

      expect(result.bagian_yayasan).toBe(0);
      expect(result.bagian_koperasi).toBe(10000);
      expect(result.margin).toBe(10000);
    });

    it('should calculate 70% for yayasan products', () => {
      const product: KoperasiProduk = {
        id: '2',
        kode_produk: 'PRD-002',
        nama_produk: 'Yayasan Product',
        kategori: null,
        satuan: 'pcs',
        harga_beli: 5000,
        harga_jual: 10000,
        owner_type: 'yayasan',
        bagi_hasil_yayasan: 70,
        barcode: null,
        deskripsi: null,
        foto_url: null,
        is_active: true,
        inventaris_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      };

      const result = koperasiService.calculateProfitSharing(10000, product);

      expect(result.bagian_yayasan).toBe(7000);
      expect(result.bagian_koperasi).toBe(3000);
      expect(result.margin).toBe(3000);
    });

    it('should handle decimal amounts correctly', () => {
      const product: KoperasiProduk = {
        id: '3',
        kode_produk: 'PRD-003',
        nama_produk: 'Yayasan Product',
        kategori: null,
        satuan: 'pcs',
        harga_beli: 5000,
        harga_jual: 10000,
        owner_type: 'yayasan',
        bagi_hasil_yayasan: 70,
        barcode: null,
        deskripsi: null,
        foto_url: null,
        is_active: true,
        inventaris_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      };

      const result = koperasiService.calculateProfitSharing(10500, product);

      expect(result.bagian_yayasan).toBe(7350);
      expect(result.bagian_koperasi).toBe(3150);
      expect(result.margin).toBe(3150);
    });

    it('should throw error for negative total', () => {
      const product: KoperasiProduk = {
        id: '4',
        kode_produk: 'PRD-004',
        nama_produk: 'Test Product',
        kategori: null,
        satuan: 'pcs',
        harga_beli: 5000,
        harga_jual: 10000,
        owner_type: 'koperasi',
        bagi_hasil_yayasan: 0,
        barcode: null,
        deskripsi: null,
        foto_url: null,
        is_active: true,
        inventaris_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      };

      expect(() => {
        koperasiService.calculateProfitSharing(-100, product);
      }).toThrow('Total must be greater than or equal to 0');
    });

    it('should throw error for missing owner_type', () => {
      const product = {
        id: '5',
        kode_produk: 'PRD-005',
        nama_produk: 'Test Product',
        kategori: null,
        satuan: 'pcs',
        harga_beli: 5000,
        harga_jual: 10000,
        owner_type: null as any,
        bagi_hasil_yayasan: 0,
        barcode: null,
        deskripsi: null,
        foto_url: null,
        is_active: true,
        inventaris_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      };

      expect(() => {
        koperasiService.calculateProfitSharing(10000, product as KoperasiProduk);
      }).toThrow('Product owner_type is required');
    });

    it('should handle zero total', () => {
      const product: KoperasiProduk = {
        id: '6',
        kode_produk: 'PRD-006',
        nama_produk: 'Test Product',
        kategori: null,
        satuan: 'pcs',
        harga_beli: 5000,
        harga_jual: 10000,
        owner_type: 'koperasi',
        bagi_hasil_yayasan: 0,
        barcode: null,
        deskripsi: null,
        foto_url: null,
        is_active: true,
        inventaris_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      };

      const result = koperasiService.calculateProfitSharing(0, product);

      expect(result.bagian_yayasan).toBe(0);
      expect(result.bagian_koperasi).toBe(0);
      expect(result.margin).toBe(0);
    });

    it('should ensure bagian_yayasan + bagian_koperasi equals total', () => {
      const product: KoperasiProduk = {
        id: '7',
        kode_produk: 'PRD-007',
        nama_produk: 'Yayasan Product',
        kategori: null,
        satuan: 'pcs',
        harga_beli: 5000,
        harga_jual: 10000,
        owner_type: 'yayasan',
        bagi_hasil_yayasan: 70,
        barcode: null,
        deskripsi: null,
        foto_url: null,
        is_active: true,
        inventaris_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        updated_by: null,
      };

      const total = 15750;
      const result = koperasiService.calculateProfitSharing(total, product);

      // Verify the sum equals the original total
      expect(result.bagian_yayasan + result.bagian_koperasi).toBe(total);
    });
  });

  describe('Input validation for getMonthlySummary', () => {
    it('should throw error for invalid month (< 1)', async () => {
      await expect(
        koperasiService.getMonthlySummary(0, 2024)
      ).rejects.toThrow('Month must be between 1 and 12');
    });

    it('should throw error for invalid month (> 12)', async () => {
      await expect(
        koperasiService.getMonthlySummary(13, 2024)
      ).rejects.toThrow('Month must be between 1 and 12');
    });

    it('should throw error for invalid year', async () => {
      await expect(
        koperasiService.getMonthlySummary(1, 1999)
      ).rejects.toThrow('Year must be 2000 or later');
    });
  });

  describe('Input validation for processPayment', () => {
    it('should throw error for invalid month (< 1)', async () => {
      await expect(
        koperasiService.processPayment(0, 2024)
      ).rejects.toThrow('Month must be between 1 and 12');
    });

    it('should throw error for invalid month (> 12)', async () => {
      await expect(
        koperasiService.processPayment(13, 2024)
      ).rejects.toThrow('Month must be between 1 and 12');
    });

    it('should throw error for invalid year', async () => {
      await expect(
        koperasiService.processPayment(1, 1999)
      ).rejects.toThrow('Year must be 2000 or later');
    });
  });
});
