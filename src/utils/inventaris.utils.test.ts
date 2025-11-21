import { describe, it, expect } from 'vitest';
import { calculateSubtotal, calculateGrandTotal } from './inventaris.utils';

describe('Multi-Item Sales Calculation Functions', () => {
  describe('calculateSubtotal', () => {
    it('should calculate subtotal correctly with base price and donation', () => {
      const result = calculateSubtotal(2, 10000, 5000);
      expect(result).toBe(25000); // (10000 * 2) + 5000
    });

    it('should calculate subtotal correctly with zero donation', () => {
      const result = calculateSubtotal(3, 15000, 0);
      expect(result).toBe(45000); // (15000 * 3) + 0
    });

    it('should calculate subtotal correctly with quantity of 1', () => {
      const result = calculateSubtotal(1, 20000, 10000);
      expect(result).toBe(30000); // (20000 * 1) + 10000
    });

    it('should handle zero quantity', () => {
      const result = calculateSubtotal(0, 10000, 5000);
      expect(result).toBe(5000); // (10000 * 0) + 5000
    });
  });

  describe('calculateGrandTotal', () => {
    it('should calculate grand total for multiple items', () => {
      const items = [
        { jumlah: 2, harga_dasar: 10000, sumbangan: 5000 },
        { jumlah: 1, harga_dasar: 15000, sumbangan: 0 },
        { jumlah: 3, harga_dasar: 5000, sumbangan: 2000 }
      ];
      
      const result = calculateGrandTotal(items);
      
      expect(result.total_harga_dasar).toBe(50000); // (2*10000) + (1*15000) + (3*5000)
      expect(result.total_sumbangan).toBe(7000); // 5000 + 0 + 2000
      expect(result.grand_total).toBe(57000); // 50000 + 7000
    });

    it('should handle single item', () => {
      const items = [
        { jumlah: 5, harga_dasar: 8000, sumbangan: 2000 }
      ];
      
      const result = calculateGrandTotal(items);
      
      expect(result.total_harga_dasar).toBe(40000); // 5 * 8000
      expect(result.total_sumbangan).toBe(2000);
      expect(result.grand_total).toBe(42000);
    });

    it('should handle empty items array', () => {
      const items: Array<{ jumlah: number; harga_dasar: number; sumbangan: number }> = [];
      
      const result = calculateGrandTotal(items);
      
      expect(result.total_harga_dasar).toBe(0);
      expect(result.total_sumbangan).toBe(0);
      expect(result.grand_total).toBe(0);
    });

    it('should handle items with no donations', () => {
      const items = [
        { jumlah: 2, harga_dasar: 10000, sumbangan: 0 },
        { jumlah: 3, harga_dasar: 5000, sumbangan: 0 }
      ];
      
      const result = calculateGrandTotal(items);
      
      expect(result.total_harga_dasar).toBe(35000); // (2*10000) + (3*5000)
      expect(result.total_sumbangan).toBe(0);
      expect(result.grand_total).toBe(35000);
    });
  });
});
