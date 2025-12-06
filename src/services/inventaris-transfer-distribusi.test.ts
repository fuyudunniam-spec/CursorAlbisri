/**
 * Integration tests for Distribusi Bank Service
 * 
 * Tests the three main functions:
 * - createBankItemDistribusi (via createTransfer)
 * - getBankItemStock
 * - validatePaketBantuan
 * 
 * Requirements: AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-5.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createTransfer, 
  getBankItemStock, 
  validatePaketBantuan 
} from './inventaris-transfer.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

describe('Distribusi Bank Service', () => {
  const mockUser = { id: 'user-123' };
  const mockItem = {
    id: 'item-123',
    nama_barang: 'Test Item',
    jumlah: 100,
    hpp: 10000,
    satuan: 'pcs',
    kategori: 'Test'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth.getUser
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('createBankItemDistribusi (via createTransfer)', () => {
    it('should create bank item when transfer destination is distribusi', async () => {
      // Mock database operations
      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockSingle = vi.fn();
      const mockUpdate = vi.fn();
      const mockInsert = vi.fn();

      // Setup chain for inventaris query
      mockSingle.mockResolvedValueOnce({ data: mockItem, error: null });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      
      // Setup chain for stock update
      mockEq.mockReturnValueOnce({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });
      
      // Setup chain for transfer insert
      const mockTransfer = {
        id: 'transfer-123',
        item_id: mockItem.id,
        jumlah: 10,
        tujuan: 'distribusi',
        status: 'completed',
        created_by: mockUser.id,
        hpp_yayasan: mockItem.hpp
      };
      mockSelect.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: mockTransfer, error: null });
      mockInsert.mockReturnValue({ select: mockSelect });
      
      // Setup chain for bank_item_distribusi insert
      mockInsert.mockReturnValueOnce({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'inventaris') {
          return { select: mockSelect, update: mockUpdate };
        } else if (table === 'transfer_inventaris') {
          return { insert: mockInsert };
        } else if (table === 'bank_item_distribusi') {
          return { insert: mockInsert };
        }
        return {};
      });

      (supabase.from as any) = mockFrom;

      // Execute
      const result = await createTransfer({
        item_id: mockItem.id,
        jumlah: 10,
        tujuan: 'distribusi' as any
      });

      // Verify transfer created
      expect(result).toBeDefined();
      expect(result.tujuan).toBe('distribusi');
      expect(result.status).toBe('completed');
      
      // Verify bank_item_distribusi was called
      expect(mockFrom).toHaveBeenCalledWith('bank_item_distribusi');
    });
  });

  describe('getBankItemStock', () => {
    it('should return all bank items with available stock', async () => {
      const mockBankItems = [
        {
          id: 'bank-1',
          transfer_id: 'transfer-1',
          item_id: 'item-1',
          jumlah_tersedia: 50,
          jumlah_terpakai: 10,
          created_at: '2024-01-01',
          inventaris: {
            nama_barang: 'Item 1',
            satuan: 'pcs',
            kategori: 'Test'
          }
        },
        {
          id: 'bank-2',
          transfer_id: 'transfer-2',
          item_id: 'item-2',
          jumlah_tersedia: 30,
          jumlah_terpakai: 5,
          created_at: '2024-01-02',
          inventaris: {
            nama_barang: 'Item 2',
            satuan: 'box',
            kategori: 'Test'
          }
        }
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockBankItems,
        error: null
      });
      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute
      const result = await getBankItemStock();

      // Verify
      expect(result).toHaveLength(2);
      expect(result[0].jumlah_tersedia).toBe(50);
      expect(result[0].jumlah_terpakai).toBe(10);
      expect(result[1].jumlah_tersedia).toBe(30);
      expect(result[1].jumlah_terpakai).toBe(5);
      expect(mockFrom).toHaveBeenCalledWith('bank_item_distribusi');
    });

    it('should handle empty bank', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });
      const mockSelect = vi.fn().mockReturnValue({
        order: mockOrder
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute
      const result = await getBankItemStock();

      // Verify
      expect(result).toHaveLength(0);
    });
  });

  describe('validatePaketBantuan', () => {
    it('should validate successfully when stock is sufficient', async () => {
      const mockBankItem = {
        jumlah_tersedia: 50,
        jumlah_terpakai: 10
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockBankItem,
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute - request 30 units (available = 50 - 10 = 40)
      const result = await validatePaketBantuan('item-123', 30);

      // Verify
      expect(result.valid).toBe(true);
      expect(result.available).toBe(40);
      expect(result.message).toBeUndefined();
    });

    it('should fail validation when stock is insufficient', async () => {
      const mockBankItem = {
        jumlah_tersedia: 50,
        jumlah_terpakai: 45
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockBankItem,
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute - request 10 units (available = 50 - 45 = 5)
      const result = await validatePaketBantuan('item-123', 10);

      // Verify
      expect(result.valid).toBe(false);
      expect(result.available).toBe(5);
      expect(result.message).toContain('Stok tidak mencukupi');
      expect(result.message).toContain('Tersedia: 5');
      expect(result.message).toContain('Diminta: 10');
    });

    it('should fail validation when item not found in bank', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute
      const result = await validatePaketBantuan('item-999', 10);

      // Verify
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Item tidak ditemukan di bank distribusi');
    });

    it('should validate exact available quantity', async () => {
      const mockBankItem = {
        jumlah_tersedia: 50,
        jumlah_terpakai: 30
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockBankItem,
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({
        single: mockSingle
      });
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute - request exactly available (20)
      const result = await validatePaketBantuan('item-123', 20);

      // Verify
      expect(result.valid).toBe(true);
      expect(result.available).toBe(20);
    });
  });

  describe('Integration: Complete distribusi flow', () => {
    it('should handle complete flow from transfer to validation', async () => {
      // This test demonstrates the complete flow:
      // 1. Create transfer to distribusi (creates bank item)
      // 2. Query bank stock
      // 3. Validate paket bantuan

      // Mock for createTransfer
      const mockFrom = vi.fn();
      const mockSelect = vi.fn();
      const mockEq = vi.fn();
      const mockSingle = vi.fn();
      const mockUpdate = vi.fn();
      const mockInsert = vi.fn();
      const mockOrder = vi.fn();

      // Setup inventaris query
      mockSingle.mockResolvedValueOnce({ data: mockItem, error: null });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      
      // Setup stock update
      mockEq.mockReturnValueOnce({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });
      
      // Setup transfer insert
      const mockTransfer = {
        id: 'transfer-123',
        item_id: mockItem.id,
        jumlah: 50,
        tujuan: 'distribusi',
        status: 'completed',
        created_by: mockUser.id,
        hpp_yayasan: mockItem.hpp
      };
      mockSelect.mockReturnValueOnce({ single: mockSingle });
      mockSingle.mockResolvedValueOnce({ data: mockTransfer, error: null });
      mockInsert.mockReturnValue({ select: mockSelect });
      
      // Setup bank_item insert
      mockInsert.mockReturnValueOnce({ error: null });

      // Setup getBankItemStock
      const mockBankItems = [{
        id: 'bank-1',
        transfer_id: mockTransfer.id,
        item_id: mockItem.id,
        jumlah_tersedia: 50,
        jumlah_terpakai: 0,
        created_at: '2024-01-01',
        inventaris: mockItem
      }];
      mockOrder.mockResolvedValueOnce({ data: mockBankItems, error: null });
      mockSelect.mockReturnValueOnce({ order: mockOrder });

      // Setup validatePaketBantuan
      mockSingle.mockResolvedValueOnce({
        data: { jumlah_tersedia: 50, jumlah_terpakai: 0 },
        error: null
      });
      mockEq.mockReturnValueOnce({ single: mockSingle });
      mockSelect.mockReturnValueOnce({ eq: mockEq });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'inventaris') {
          return { select: mockSelect, update: mockUpdate };
        } else if (table === 'transfer_inventaris') {
          return { insert: mockInsert };
        } else if (table === 'bank_item_distribusi') {
          return { insert: mockInsert, select: mockSelect };
        }
        return {};
      });

      (supabase.from as any) = mockFrom;

      // Step 1: Create transfer
      const transfer = await createTransfer({
        item_id: mockItem.id,
        jumlah: 50,
        tujuan: 'distribusi' as any
      });
      expect(transfer.tujuan).toBe('distribusi');

      // Step 2: Get bank stock
      const bankStock = await getBankItemStock();
      expect(bankStock).toHaveLength(1);
      expect(bankStock[0].jumlah_tersedia).toBe(50);

      // Step 3: Validate paket
      const validation = await validatePaketBantuan(mockItem.id, 30);
      expect(validation.valid).toBe(true);
      expect(validation.available).toBe(50);
    });
  });
});
