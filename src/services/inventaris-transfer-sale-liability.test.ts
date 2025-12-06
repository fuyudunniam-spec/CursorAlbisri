/**
 * Property-Based Tests for Sale Liability Recording
 * 
 * Tests the integration between transfer system and keuangan system
 * for recording liabilities when yayasan products are sold.
 * 
 * Feature: transfer-inventaris-yayasan
 * Property 25: Sale Liability Recording Accuracy
 * Validates: Requirements AC-5.4
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { calculateProfitSharing } from './inventaris-transfer.service';
import { ItemCondition } from '@/types/transfer.types';

describe('Property 25: Sale Liability Recording Accuracy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any sale amount and damaged condition, the yayasan share
   * should be exactly 70% of the sale amount
   */
  test('yayasan share is 70% for damaged goods', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000000 }), // sale amount
        (saleAmount) => {
          // Calculate profit sharing for damaged goods
          const result = calculateProfitSharing(saleAmount, ItemCondition.RUSAK);

          // Property: Yayasan gets 70%
          const expectedYayasan = Math.floor(saleAmount * 0.7);
          expect(result.yayasan_share).toBe(expectedYayasan);
          expect(result.yayasan_percentage).toBe(70);

          // Property: Koperasi gets 30%
          const expectedKoperasi = Math.floor(saleAmount * 0.3);
          expect(result.koperasi_share).toBe(expectedKoperasi);
          expect(result.koperasi_percentage).toBe(30);

          // Property: Total should not exceed sale amount
          expect(result.yayasan_share + result.koperasi_share).toBeLessThanOrEqual(saleAmount);

          // Property: Total sale matches input
          expect(result.total_sale).toBe(saleAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sale amount and good condition, the yayasan share
   * should be 100% of the sale amount
   */
  test('yayasan share is 100% for good condition goods', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000000 }), // sale amount
        (saleAmount) => {
          // Calculate profit sharing for good condition goods
          const result = calculateProfitSharing(saleAmount, ItemCondition.BAIK);

          // Property: Yayasan gets 100%
          expect(result.yayasan_share).toBe(saleAmount);
          expect(result.yayasan_percentage).toBe(100);

          // Property: Koperasi gets 0%
          expect(result.koperasi_share).toBe(0);
          expect(result.koperasi_percentage).toBe(0);

          // Property: Total equals sale amount
          expect(result.yayasan_share + result.koperasi_share).toBe(saleAmount);

          // Property: Total sale matches input
          expect(result.total_sale).toBe(saleAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any two different sale amounts with same condition,
   * the ratio of yayasan shares should equal the ratio of sale amounts
   */
  test('profit sharing scales proportionally', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 1000000 }),
        fc.integer({ min: 1000, max: 1000000 }),
        fc.constantFrom(ItemCondition.BAIK, ItemCondition.RUSAK),
        (amount1, amount2, condition) => {
          // Skip if amounts are the same
          if (amount1 === amount2) return true;

          const result1 = calculateProfitSharing(amount1, condition);
          const result2 = calculateProfitSharing(amount2, condition);

          // Property: Yayasan share scales proportionally
          const ratio1 = result1.yayasan_share / amount1;
          const ratio2 = result2.yayasan_share / amount2;

          // Allow small floating point differences
          expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.01);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sale amount, the sum of yayasan and koperasi shares
   * should not exceed the total sale amount
   */
  test('profit shares do not exceed total sale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }),
        fc.constantFrom(ItemCondition.BAIK, ItemCondition.RUSAK),
        (saleAmount, condition) => {
          const result = calculateProfitSharing(saleAmount, condition);

          // Property: Sum of shares <= total sale
          expect(result.yayasan_share + result.koperasi_share).toBeLessThanOrEqual(saleAmount);

          // Property: Individual shares are non-negative
          expect(result.yayasan_share).toBeGreaterThanOrEqual(0);
          expect(result.koperasi_share).toBeGreaterThanOrEqual(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any condition, the percentages should sum to 100
   */
  test('profit sharing percentages sum to 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000000 }),
        fc.constantFrom(ItemCondition.BAIK, ItemCondition.RUSAK),
        (saleAmount, condition) => {
          const result = calculateProfitSharing(saleAmount, condition);

          // Property: Percentages sum to 100
          expect(result.yayasan_percentage + result.koperasi_percentage).toBe(100);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Profit sharing calculation is deterministic
   * (same inputs always produce same outputs)
   */
  test('profit sharing is deterministic', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000000 }),
        fc.constantFrom(ItemCondition.BAIK, ItemCondition.RUSAK),
        (saleAmount, condition) => {
          // Calculate twice with same inputs
          const result1 = calculateProfitSharing(saleAmount, condition);
          const result2 = calculateProfitSharing(saleAmount, condition);

          // Property: Results are identical
          expect(result1.yayasan_share).toBe(result2.yayasan_share);
          expect(result1.koperasi_share).toBe(result2.koperasi_share);
          expect(result1.yayasan_percentage).toBe(result2.yayasan_percentage);
          expect(result1.koperasi_percentage).toBe(result2.koperasi_percentage);
          expect(result1.total_sale).toBe(result2.total_sale);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

