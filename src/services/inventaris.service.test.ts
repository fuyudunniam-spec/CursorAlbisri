import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateStockAvailability, 
  getCurrentStock, 
  getCurrentStockBatch,
  calculateSubtotal,
  calculateGrandTotal,
  createMultiItemSale
} from './inventaris.service';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Stock Validation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateStockAvailability', () => {
    it('should return valid when all items have sufficient stock', async () => {
      const mockInventoryData = [
        { id: 'item-1', nama_barang: 'Beras 25kg', jumlah: 100 },
        { id: 'item-2', nama_barang: 'Minyak Goreng 2L', jumlah: 50 }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockResolvedValue({ data: mockInventoryData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        in: mockIn
      });

      mockSelect.mockReturnValue({ in: mockIn });

      const items = [
        { item_id: 'item-1', jumlah: 10 },
        { item_id: 'item-2', jumlah: 5 }
      ];

      const result = await validateStockAvailability(items);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors when items have insufficient stock', async () => {
      const mockInventoryData = [
        { id: 'item-1', nama_barang: 'Beras 25kg', jumlah: 5 },
        { id: 'item-2', nama_barang: 'Minyak Goreng 2L', jumlah: 2 }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockResolvedValue({ data: mockInventoryData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        in: mockIn
      });

      mockSelect.mockReturnValue({ in: mockIn });

      const items = [
        { item_id: 'item-1', jumlah: 10 }, // Requesting more than available
        { item_id: 'item-2', jumlah: 5 }   // Requesting more than available
      ];

      const result = await validateStockAvailability(items);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatchObject({
        item_id: 'item-1',
        nama_barang: 'Beras 25kg',
        requested: 10,
        available: 5
      });
      expect(result.errors[1]).toMatchObject({
        item_id: 'item-2',
        nama_barang: 'Minyak Goreng 2L',
        requested: 5,
        available: 2
      });
    });

    it('should return error when item does not exist', async () => {
      const mockInventoryData = [
        { id: 'item-1', nama_barang: 'Beras 25kg', jumlah: 100 }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockResolvedValue({ data: mockInventoryData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        in: mockIn
      });

      mockSelect.mockReturnValue({ in: mockIn });

      const items = [
        { item_id: 'item-1', jumlah: 10 },
        { item_id: 'item-999', jumlah: 5 } // Non-existent item
      ];

      const result = await validateStockAvailability(items);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        item_id: 'item-999',
        nama_barang: 'Item tidak ditemukan',
        requested: 5,
        available: 0
      });
    });

    it('should return error when quantity is zero or negative', async () => {
      const mockInventoryData = [
        { id: 'item-1', nama_barang: 'Beras 25kg', jumlah: 100 }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockResolvedValue({ data: mockInventoryData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        in: mockIn
      });

      mockSelect.mockReturnValue({ in: mockIn });

      const items = [
        { item_id: 'item-1', jumlah: 0 },
        { item_id: 'item-1', jumlah: -5 }
      ];

      const result = await validateStockAvailability(items);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('harus lebih dari 0');
      expect(result.errors[1].message).toContain('harus lebih dari 0');
    });

    it('should return valid for empty items array', async () => {
      const result = await validateStockAvailability([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle null stock values as zero', async () => {
      const mockInventoryData = [
        { id: 'item-1', nama_barang: 'Beras 25kg', jumlah: null }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockResolvedValue({ data: mockInventoryData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        in: mockIn
      });

      mockSelect.mockReturnValue({ in: mockIn });

      const items = [
        { item_id: 'item-1', jumlah: 5 }
      ];

      const result = await validateStockAvailability(items);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].available).toBe(0);
    });
  });

  describe('getCurrentStock', () => {
    it('should return current stock for an item', async () => {
      const mockData = { jumlah: 50 };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const stock = await getCurrentStock('item-1');

      expect(stock).toBe(50);
    });

    it('should return 0 when stock is null', async () => {
      const mockData = { jumlah: null };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const stock = await getCurrentStock('item-1');

      expect(stock).toBe(0);
    });
  });

  describe('getCurrentStockBatch', () => {
    it('should return stock map for multiple items', async () => {
      const mockData = [
        { id: 'item-1', jumlah: 100 },
        { id: 'item-2', jumlah: 50 },
        { id: 'item-3', jumlah: null }
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      mockSelect.mockReturnValue({ in: mockIn });

      const stockMap = await getCurrentStockBatch(['item-1', 'item-2', 'item-3']);

      expect(stockMap.size).toBe(3);
      expect(stockMap.get('item-1')).toBe(100);
      expect(stockMap.get('item-2')).toBe(50);
      expect(stockMap.get('item-3')).toBe(0); // null should be converted to 0
    });

    it('should return empty map for empty array', async () => {
      const stockMap = await getCurrentStockBatch([]);

      expect(stockMap.size).toBe(0);
    });
  });
});


describe('Calculation Utilities', () => {
  describe('calculateSubtotal', () => {
    it('should calculate subtotal correctly', () => {
      const result = calculateSubtotal(5, 10000, 5000);
      expect(result).toBe(55000); // (10000 * 5) + 5000
    });

    it('should handle zero donation', () => {
      const result = calculateSubtotal(3, 15000, 0);
      expect(result).toBe(45000); // (15000 * 3) + 0
    });

    it('should handle zero quantity', () => {
      const result = calculateSubtotal(0, 10000, 5000);
      expect(result).toBe(5000); // (10000 * 0) + 5000
    });

    it('should handle decimal prices', () => {
      const result = calculateSubtotal(2, 12500.50, 1000);
      expect(result).toBe(26001); // (12500.50 * 2) + 1000
    });
  });

  describe('calculateGrandTotal', () => {
    it('should calculate grand total for multiple items', () => {
      const items = [
        { jumlah: 5, harga_dasar: 10000, sumbangan: 5000 },
        { jumlah: 3, harga_dasar: 15000, sumbangan: 3000 },
        { jumlah: 2, harga_dasar: 20000, sumbangan: 0 }
      ];

      const result = calculateGrandTotal(items);

      expect(result.total_harga_dasar).toBe(135000); // (5*10000) + (3*15000) + (2*20000)
      expect(result.total_sumbangan).toBe(8000); // 5000 + 3000 + 0
      expect(result.grand_total).toBe(143000); // 135000 + 8000
    });

    it('should handle empty items array', () => {
      const result = calculateGrandTotal([]);

      expect(result.total_harga_dasar).toBe(0);
      expect(result.total_sumbangan).toBe(0);
      expect(result.grand_total).toBe(0);
    });

    it('should handle items with zero values', () => {
      const items = [
        { jumlah: 0, harga_dasar: 10000, sumbangan: 0 },
        { jumlah: 5, harga_dasar: 0, sumbangan: 0 }
      ];

      const result = calculateGrandTotal(items);

      expect(result.total_harga_dasar).toBe(0);
      expect(result.total_sumbangan).toBe(0);
      expect(result.grand_total).toBe(0);
    });
  });
});

describe('createMultiItemSale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject empty items array', async () => {
    await expect(
      createMultiItemSale({
        pembeli: 'Test Buyer',
        tanggal: '2025-01-01',
        items: []
      })
    ).rejects.toThrow('Transaksi harus memiliki minimal satu item');
  });

  it('should reject empty buyer name', async () => {
    await expect(
      createMultiItemSale({
        pembeli: '',
        tanggal: '2025-01-01',
        items: [
          { item_id: 'item-1', jumlah: 5, harga_dasar: 10000, sumbangan: 0 }
        ]
      })
    ).rejects.toThrow('Nama pembeli harus diisi');
  });

  it('should reject negative quantity', async () => {
    await expect(
      createMultiItemSale({
        pembeli: 'Test Buyer',
        tanggal: '2025-01-01',
        items: [
          { item_id: 'item-1', jumlah: -5, harga_dasar: 10000, sumbangan: 0 }
        ]
      })
    ).rejects.toThrow('Jumlah harus lebih dari 0');
  });

  it('should reject zero quantity', async () => {
    await expect(
      createMultiItemSale({
        pembeli: 'Test Buyer',
        tanggal: '2025-01-01',
        items: [
          { item_id: 'item-1', jumlah: 0, harga_dasar: 10000, sumbangan: 0 }
        ]
      })
    ).rejects.toThrow('Jumlah harus lebih dari 0');
  });

  it('should reject negative base price', async () => {
    await expect(
      createMultiItemSale({
        pembeli: 'Test Buyer',
        tanggal: '2025-01-01',
        items: [
          { item_id: 'item-1', jumlah: 5, harga_dasar: -10000, sumbangan: 0 }
        ]
      })
    ).rejects.toThrow('Harga dasar tidak boleh negatif');
  });

  it('should reject negative donation', async () => {
    await expect(
      createMultiItemSale({
        pembeli: 'Test Buyer',
        tanggal: '2025-01-01',
        items: [
          { item_id: 'item-1', jumlah: 5, harga_dasar: 10000, sumbangan: -1000 }
        ]
      })
    ).rejects.toThrow('Sumbangan tidak boleh negatif');
  });
});
