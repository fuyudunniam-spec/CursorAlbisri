/**
 * Property-Based Tests for Transfer Aggregation
 * 
 * Tests period aggregation accuracy using property-based testing.
 * 
 * Feature: transfer-inventaris-yayasan
 * Property 21: Period Transfer Aggregation Accuracy
 * Validates: Requirements AC-4.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { getPeriodSummary } from './inventaris-transfer.service';
import { supabase } from '@/integrations/supabase/client';
import type { TransferDestination, TransferStatus } from '@/types/transfer.types';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Transfer Aggregation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 21: Period Transfer Aggregation Accuracy
   * 
   * For any date range query, the total transfer quantity should equal 
   * the sum of all individual transfer quantities in that period.
   * 
   * This property ensures that:
   * 1. Total quantity = sum of all individual quantities
   * 2. Total transfers = count of all transfers
   * 3. By-destination totals sum to overall total
   * 4. By-status totals sum to overall total
   * 
   * Validates: Requirements AC-4.3
   */
  describe('Property 21: Period Transfer Aggregation Accuracy', () => {
    it('should aggregate transfer quantities correctly for any set of transfers', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary transfer data
          fc.array(
            fc.record({
              tujuan: fc.constantFrom<TransferDestination>(
                'koperasi',
                'distribusi',
                'dapur',
                'asrama',
                'kantor',
                'lainnya'
              ),
              status: fc.constantFrom<TransferStatus>(
                'pending',
                'approved',
                'rejected',
                'completed'
              ),
              jumlah: fc.integer({ min: 1, max: 1000 }),
              hpp_yayasan: fc.integer({ min: 1000, max: 100000 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          async (transfers) => {
            // Mock database response
            const mockGte = vi.fn();
            const mockLte = vi.fn();
            const mockSelect = vi.fn();
            const mockFrom = vi.fn();

            mockLte.mockResolvedValue({
              data: transfers,
              error: null
            });
            mockGte.mockReturnValue({
              lte: mockLte
            });
            mockSelect.mockReturnValue({
              gte: mockGte
            });
            mockFrom.mockReturnValue({
              select: mockSelect
            });

            (supabase.from as any) = mockFrom;

            // Execute
            const result = await getPeriodSummary('2024-01-01', '2024-12-31');

            // Calculate expected values manually
            const expectedTotalTransfers = transfers.length;
            const expectedTotalQuantity = transfers.reduce(
              (sum, t) => sum + (t.jumlah || 0),
              0
            );

            // Verify total transfers count
            expect(result.total_transfers).toBe(expectedTotalTransfers);

            // Verify total quantity matches sum of individual quantities
            expect(result.total_quantity).toBe(expectedTotalQuantity);

            // Verify by-destination aggregation
            const destinationTotals = new Map<TransferDestination, number>();
            transfers.forEach(t => {
              const current = destinationTotals.get(t.tujuan) || 0;
              destinationTotals.set(t.tujuan, current + (t.jumlah || 0));
            });

            // Sum of all destination quantities should equal total
            const sumByDestination = result.by_destination.reduce(
              (sum, d) => sum + d.total_quantity,
              0
            );
            expect(sumByDestination).toBe(expectedTotalQuantity);

            // Each destination should have correct quantity
            result.by_destination.forEach(dest => {
              const expected = destinationTotals.get(dest.tujuan) || 0;
              expect(dest.total_quantity).toBe(expected);
            });

            // Verify by-status aggregation
            const statusCounts = new Map<TransferStatus, number>();
            transfers.forEach(t => {
              const current = statusCounts.get(t.status) || 0;
              statusCounts.set(t.status, current + 1);
            });

            // Sum of all status counts should equal total transfers
            const sumByStatus = result.by_status.reduce(
              (sum, s) => sum + s.count,
              0
            );
            expect(sumByStatus).toBe(expectedTotalTransfers);

            // Each status should have correct count
            result.by_status.forEach(status => {
              const expected = statusCounts.get(status.status) || 0;
              expect(status.count).toBe(expected);
            });

            // Verify value calculation for destinations
            const expectedValueByDestination = new Map<TransferDestination, number>();
            transfers.forEach(t => {
              const current = expectedValueByDestination.get(t.tujuan) || 0;
              const value = (t.hpp_yayasan || 0) * (t.jumlah || 0);
              expectedValueByDestination.set(t.tujuan, current + value);
            });

            result.by_destination.forEach(dest => {
              const expected = expectedValueByDestination.get(dest.tujuan) || 0;
              expect(dest.total_value).toBe(expected);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty transfer list correctly', async () => {
      // Mock empty database response
      const mockGte = vi.fn();
      const mockLte = vi.fn();
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();

      mockLte.mockResolvedValue({
        data: [],
        error: null
      });
      mockGte.mockReturnValue({
        lte: mockLte
      });
      mockSelect.mockReturnValue({
        gte: mockGte
      });
      mockFrom.mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute
      const result = await getPeriodSummary('2024-01-01', '2024-12-31');

      // Verify
      expect(result.total_transfers).toBe(0);
      expect(result.total_quantity).toBe(0);
      expect(result.by_destination).toHaveLength(0);
      expect(result.by_status).toHaveLength(0);
    });

    it('should handle single transfer correctly', async () => {
      const singleTransfer = {
        tujuan: 'koperasi' as TransferDestination,
        status: 'pending' as TransferStatus,
        jumlah: 42,
        hpp_yayasan: 5000
      };

      // Mock database response
      const mockGte = vi.fn();
      const mockLte = vi.fn();
      const mockSelect = vi.fn();
      const mockFrom = vi.fn();

      mockLte.mockResolvedValue({
        data: [singleTransfer],
        error: null
      });
      mockGte.mockReturnValue({
        lte: mockLte
      });
      mockSelect.mockReturnValue({
        gte: mockGte
      });
      mockFrom.mockReturnValue({
        select: mockSelect
      });

      (supabase.from as any) = mockFrom;

      // Execute
      const result = await getPeriodSummary('2024-01-01', '2024-12-31');

      // Verify
      expect(result.total_transfers).toBe(1);
      expect(result.total_quantity).toBe(42);
      expect(result.by_destination).toHaveLength(1);
      expect(result.by_destination[0].tujuan).toBe('koperasi');
      expect(result.by_destination[0].total_quantity).toBe(42);
      expect(result.by_destination[0].total_value).toBe(5000 * 42);
      expect(result.by_status).toHaveLength(1);
      expect(result.by_status[0].status).toBe('pending');
      expect(result.by_status[0].count).toBe(1);
    });

    it('should aggregate multiple transfers to same destination correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<TransferDestination>(
            'koperasi',
            'distribusi',
            'dapur',
            'asrama',
            'kantor',
            'lainnya'
          ),
          fc.array(
            fc.record({
              jumlah: fc.integer({ min: 1, max: 100 }),
              hpp_yayasan: fc.integer({ min: 1000, max: 10000 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (destination, transferData) => {
            // Create transfers all with same destination
            const transfers = transferData.map(t => ({
              tujuan: destination,
              status: 'completed' as TransferStatus,
              jumlah: t.jumlah,
              hpp_yayasan: t.hpp_yayasan
            }));

            // Mock database response
            const mockGte = vi.fn();
            const mockLte = vi.fn();
            const mockSelect = vi.fn();
            const mockFrom = vi.fn();

            mockLte.mockResolvedValue({
              data: transfers,
              error: null
            });
            mockGte.mockReturnValue({
              lte: mockLte
            });
            mockSelect.mockReturnValue({
              gte: mockGte
            });
            mockFrom.mockReturnValue({
              select: mockSelect
            });

            (supabase.from as any) = mockFrom;

            // Execute
            const result = await getPeriodSummary('2024-01-01', '2024-12-31');

            // Calculate expected values
            const expectedQuantity = transfers.reduce((sum, t) => sum + t.jumlah, 0);
            const expectedValue = transfers.reduce(
              (sum, t) => sum + (t.hpp_yayasan * t.jumlah),
              0
            );

            // Verify
            expect(result.total_transfers).toBe(transfers.length);
            expect(result.total_quantity).toBe(expectedQuantity);
            expect(result.by_destination).toHaveLength(1);
            expect(result.by_destination[0].tujuan).toBe(destination);
            expect(result.by_destination[0].total_quantity).toBe(expectedQuantity);
            expect(result.by_destination[0].total_transfers).toBe(transfers.length);
            expect(result.by_destination[0].total_value).toBe(expectedValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency when transfers have zero quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              tujuan: fc.constantFrom<TransferDestination>(
                'koperasi',
                'distribusi',
                'dapur'
              ),
              status: fc.constantFrom<TransferStatus>('completed', 'approved'),
              jumlah: fc.integer({ min: 0, max: 100 }), // Allow zero
              hpp_yayasan: fc.integer({ min: 0, max: 10000 }) // Allow zero
            }),
            { minLength: 1, maxLength: 30 }
          ),
          async (transfers) => {
            // Mock database response
            const mockGte = vi.fn();
            const mockLte = vi.fn();
            const mockSelect = vi.fn();
            const mockFrom = vi.fn();

            mockLte.mockResolvedValue({
              data: transfers,
              error: null
            });
            mockGte.mockReturnValue({
              lte: mockLte
            });
            mockSelect.mockReturnValue({
              gte: mockGte
            });
            mockFrom.mockReturnValue({
              select: mockSelect
            });

            (supabase.from as any) = mockFrom;

            // Execute
            const result = await getPeriodSummary('2024-01-01', '2024-12-31');

            // Calculate expected total
            const expectedTotal = transfers.reduce((sum, t) => sum + (t.jumlah || 0), 0);

            // Verify total matches
            expect(result.total_quantity).toBe(expectedTotal);

            // Verify sum of destinations matches total
            const sumByDest = result.by_destination.reduce(
              (sum, d) => sum + d.total_quantity,
              0
            );
            expect(sumByDest).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
