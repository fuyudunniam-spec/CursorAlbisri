import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DonationFormDialog - Integration Test: Direct Consumption Posting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create donation with direct_consumption items and verify no inventory transactions', async () => {
    // Test data
    const donationId = 'test-donation-dc-1';
    const itemId = 'test-item-dc-1';
    
    const mockDonation = {
      id: donationId,
      donation_type: 'in_kind',
      donor_name: 'Test Donor Direct Consumption',
      donation_date: '2025-01-15',
      status: 'received',
    };

    const mockDirectConsumptionItem = {
      id: itemId,
      donation_id: donationId,
      raw_item_name: 'Nasi Kotak untuk Acara',
      item_type: 'direct_consumption',
      quantity: 50,
      uom: 'kotak',
      estimated_value: 500000,
      is_posted_to_stock: false,
    };

    // Mock supabase responses
    const mockInsertDonation = vi.fn().mockResolvedValue({
      data: mockDonation,
      error: null,
    });

    const mockInsertItem = vi.fn().mockResolvedValue({
      data: mockDirectConsumptionItem,
      error: null,
    });

    const mockRpcProcessItems = vi.fn().mockResolvedValue({
      data: {
        success: true,
        processed_count: 0,
        skipped_count: 1,
        message: 'Processed 0 items, skipped 1 direct consumption items',
      },
      error: null,
    });

    const mockSelectInventoryTransactions = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockSelectUpdatedItem = vi.fn().mockResolvedValue({
      data: {
        ...mockDirectConsumptionItem,
        is_posted_to_stock: true,
      },
      error: null,
    });

    const mockSelectUpdatedDonation = vi.fn().mockResolvedValue({
      data: {
        ...mockDonation,
        status: 'posted',
      },
      error: null,
    });

    // Setup supabase mock
    (supabase.from as any) = vi.fn().mockImplementation((table: string) => {
      if (table === 'donations') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockInsertDonation,
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSelectUpdatedDonation,
            }),
          }),
        };
      }

      if (table === 'donation_items') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockInsertItem,
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSelectUpdatedItem,
            }),
          }),
        };
      }

      if (table === 'transaksi_inventaris') {
        return {
          select: vi.fn().mockReturnValue({
            eq: mockSelectInventoryTransactions,
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
    });

    (supabase.rpc as any) = mockRpcProcessItems;

    // Step 1: Create donation with direct_consumption item
    const { data: createdDonation } = await supabase
      .from('donations')
      .insert(mockDonation)
      .select()
      .single();

    expect(createdDonation).toEqual(mockDonation);

    const { data: createdItem } = await supabase
      .from('donation_items')
      .insert(mockDirectConsumptionItem)
      .select()
      .single();

    expect(createdItem).toEqual(mockDirectConsumptionItem);
    expect(createdItem.item_type).toBe('direct_consumption');

    // Step 2: Post to stock
    const { data: processResult } = await supabase.rpc('process_all_donation_items', {
      p_donation_id: donationId,
    });

    expect(processResult).toBeDefined();
    expect(processResult.success).toBe(true);
    expect(processResult.skipped_count).toBe(1);

    // Step 3: Verify no inventory transactions created
    const { data: inventoryTransactions } = await supabase
      .from('transaksi_inventaris')
      .select('*')
      .eq('referensi_donation_id', donationId);

    expect(inventoryTransactions).toEqual([]);
    expect(inventoryTransactions.length).toBe(0);

    // Step 4: Verify item marked as posted
    const { data: updatedItem } = await supabase
      .from('donation_items')
      .select('*')
      .eq('id', itemId)
      .single();

    expect(updatedItem.is_posted_to_stock).toBe(true);

    // Step 5: Verify donation status updated
    const { data: updatedDonation } = await supabase
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .single();

    expect(updatedDonation.status).toBe('posted');
  });

  it('should handle mixed donation with both inventory and direct_consumption items', async () => {
    // Test data
    const donationId = 'test-donation-mixed-1';
    const inventoryItemId = 'test-item-inventory-1';
    const directConsumptionItemId = 'test-item-dc-2';
    const mappedInventoryId = 'mapped-inventory-1';

    const mockDonation = {
      id: donationId,
      donation_type: 'in_kind',
      donor_name: 'Test Donor Mixed',
      donation_date: '2025-01-15',
      status: 'received',
    };

    const mockInventoryItem = {
      id: inventoryItemId,
      donation_id: donationId,
      raw_item_name: 'Beras 25kg',
      item_type: 'inventory',
      quantity: 25,
      uom: 'kg',
      estimated_value: 300000,
      mapped_item_id: mappedInventoryId,
      mapping_status: 'mapped',
      is_posted_to_stock: false,
    };

    const mockDirectConsumptionItem = {
      id: directConsumptionItemId,
      donation_id: donationId,
      raw_item_name: 'Makanan Matang',
      item_type: 'direct_consumption',
      quantity: 100,
      uom: 'porsi',
      estimated_value: 1000000,
      is_posted_to_stock: false,
    };

    const mockInventoryTransaction = {
      id: 'transaction-1',
      inventaris_id: mappedInventoryId,
      jenis_transaksi: 'masuk',
      jumlah: 25,
      referensi_donation_id: donationId,
    };

    // Mock supabase responses
    const mockRpcProcessItems = vi.fn().mockResolvedValue({
      data: {
        success: true,
        processed_count: 1,
        skipped_count: 1,
        message: 'Processed 1 items, skipped 1 direct consumption items',
      },
      error: null,
    });

    const mockSelectInventoryTransactions = vi.fn().mockResolvedValue({
      data: [mockInventoryTransaction],
      error: null,
    });

    const mockSelectItems = vi.fn().mockResolvedValue({
      data: [
        { ...mockInventoryItem, is_posted_to_stock: true },
        { ...mockDirectConsumptionItem, is_posted_to_stock: true },
      ],
      error: null,
    });

    // Setup supabase mock
    (supabase.from as any) = vi.fn().mockImplementation((table: string) => {
      if (table === 'transaksi_inventaris') {
        return {
          select: vi.fn().mockReturnValue({
            eq: mockSelectInventoryTransactions,
          }),
        };
      }

      if (table === 'donation_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: mockSelectItems,
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
    });

    (supabase.rpc as any) = mockRpcProcessItems;

    // Step 1: Post to stock
    const { data: processResult } = await supabase.rpc('process_all_donation_items', {
      p_donation_id: donationId,
    });

    expect(processResult).toBeDefined();
    expect(processResult.success).toBe(true);
    expect(processResult.processed_count).toBe(1);
    expect(processResult.skipped_count).toBe(1);

    // Step 2: Verify only 1 inventory transaction created (for inventory item)
    const { data: inventoryTransactions } = await supabase
      .from('transaksi_inventaris')
      .select('*')
      .eq('referensi_donation_id', donationId);

    expect(inventoryTransactions).toBeDefined();
    expect(inventoryTransactions.length).toBe(1);
    expect(inventoryTransactions[0].jenis_transaksi).toBe('masuk');

    // Step 3: Verify both items marked as posted
    const { data: items } = await supabase
      .from('donation_items')
      .select('*')
      .eq('donation_id', donationId);

    expect(items).toBeDefined();
    expect(items.length).toBe(2);
    expect(items.every((item: any) => item.is_posted_to_stock === true)).toBe(true);
  });

  it('should handle donation with only direct_consumption items', async () => {
    // Test data
    const donationId = 'test-donation-only-dc-1';
    const item1Id = 'test-item-dc-3';
    const item2Id = 'test-item-dc-4';

    const mockDonation = {
      id: donationId,
      donation_type: 'in_kind',
      donor_name: 'Test Donor Only DC',
      donation_date: '2025-01-15',
      status: 'received',
    };

    const mockItems = [
      {
        id: item1Id,
        donation_id: donationId,
        raw_item_name: 'Snack untuk Santri',
        item_type: 'direct_consumption',
        quantity: 200,
        uom: 'pack',
        estimated_value: 400000,
        is_posted_to_stock: false,
      },
      {
        id: item2Id,
        donation_id: donationId,
        raw_item_name: 'Minuman Kemasan',
        item_type: 'direct_consumption',
        quantity: 150,
        uom: 'botol',
        estimated_value: 300000,
        is_posted_to_stock: false,
      },
    ];

    // Mock supabase responses
    const mockRpcProcessItems = vi.fn().mockResolvedValue({
      data: {
        success: true,
        processed_count: 0,
        skipped_count: 2,
        message: 'Processed 0 items, skipped 2 direct consumption items',
      },
      error: null,
    });

    const mockSelectInventoryTransactions = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockSelectItems = vi.fn().mockResolvedValue({
      data: mockItems.map(item => ({ ...item, is_posted_to_stock: true })),
      error: null,
    });

    const mockSelectDonation = vi.fn().mockResolvedValue({
      data: {
        ...mockDonation,
        status: 'posted',
      },
      error: null,
    });

    // Setup supabase mock
    (supabase.from as any) = vi.fn().mockImplementation((table: string) => {
      if (table === 'transaksi_inventaris') {
        return {
          select: vi.fn().mockReturnValue({
            eq: mockSelectInventoryTransactions,
          }),
        };
      }

      if (table === 'donation_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: mockSelectItems,
          }),
        };
      }

      if (table === 'donations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSelectDonation,
            }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
    });

    (supabase.rpc as any) = mockRpcProcessItems;

    // Step 1: Post to stock
    const { data: processResult } = await supabase.rpc('process_all_donation_items', {
      p_donation_id: donationId,
    });

    expect(processResult).toBeDefined();
    expect(processResult.success).toBe(true);
    expect(processResult.processed_count).toBe(0);
    expect(processResult.skipped_count).toBe(2);

    // Step 2: Verify no inventory transactions created
    const { data: inventoryTransactions } = await supabase
      .from('transaksi_inventaris')
      .select('*')
      .eq('referensi_donation_id', donationId);

    expect(inventoryTransactions).toBeDefined();
    expect(inventoryTransactions.length).toBe(0);

    // Step 3: Verify all items marked as posted
    const { data: items } = await supabase
      .from('donation_items')
      .select('*')
      .eq('donation_id', donationId);

    expect(items).toBeDefined();
    expect(items.length).toBe(2);
    expect(items.every((item: any) => item.is_posted_to_stock === true)).toBe(true);

    // Step 4: Verify donation status updated to posted
    const { data: updatedDonation } = await supabase
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .single();

    expect(updatedDonation).toBeDefined();
    expect(updatedDonation.status).toBe('posted');
  });

  it('should verify inventory stock is not affected by direct_consumption items', async () => {
    // Test data
    const donationId = 'test-donation-stock-check-1';
    const itemId = 'test-item-dc-5';

    const mockDonation = {
      id: donationId,
      donation_type: 'in_kind',
      donor_name: 'Test Donor Stock Check',
      donation_date: '2025-01-15',
      status: 'received',
    };

    const mockDirectConsumptionItem = {
      id: itemId,
      donation_id: donationId,
      raw_item_name: 'Buah-buahan Segar',
      item_type: 'direct_consumption',
      quantity: 50,
      uom: 'kg',
      estimated_value: 250000,
      is_posted_to_stock: false,
    };

    const mockInventoryStockBefore = [
      { id: 'inv-1', nama_barang: 'Beras', jumlah: 100 },
      { id: 'inv-2', nama_barang: 'Gula', jumlah: 50 },
    ];

    const mockInventoryStockAfter = [
      { id: 'inv-1', nama_barang: 'Beras', jumlah: 100 },
      { id: 'inv-2', nama_barang: 'Gula', jumlah: 50 },
    ];

    // Mock supabase responses
    const mockRpcProcessItems = vi.fn().mockResolvedValue({
      data: {
        success: true,
        processed_count: 0,
        skipped_count: 1,
        message: 'Processed 0 items, skipped 1 direct consumption items',
      },
      error: null,
    });

    let callCount = 0;
    const mockSelectInventory = vi.fn().mockImplementation(() => {
      callCount++;
      return {
        data: callCount === 1 ? mockInventoryStockBefore : mockInventoryStockAfter,
        error: null,
      };
    });

    // Setup supabase mock
    (supabase.from as any) = vi.fn().mockImplementation((table: string) => {
      if (table === 'inventaris') {
        return {
          select: vi.fn().mockReturnValue(mockSelectInventory()),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
    });

    (supabase.rpc as any) = mockRpcProcessItems;

    // Step 1: Get inventory stock before processing
    const { data: stockBefore } = await supabase
      .from('inventaris')
      .select('*');

    const totalStockBefore = stockBefore.reduce((sum: number, item: any) => sum + item.jumlah, 0);
    expect(totalStockBefore).toBe(150);

    // Step 2: Post to stock
    const { data: processResult } = await supabase.rpc('process_all_donation_items', {
      p_donation_id: donationId,
    });

    expect(processResult).toBeDefined();
    expect(processResult.success).toBe(true);

    // Step 3: Get inventory stock after processing
    const { data: stockAfter } = await supabase
      .from('inventaris')
      .select('*');

    const totalStockAfter = stockAfter.reduce((sum: number, item: any) => sum + item.jumlah, 0);
    expect(totalStockAfter).toBe(150);

    // Step 4: Verify stock unchanged
    expect(totalStockBefore).toBe(totalStockAfter);
  });
});
