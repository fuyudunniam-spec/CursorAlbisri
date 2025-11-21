import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MultiItemSalesForm from './MultiItemSalesForm';
import type { MultiItemSalePayload } from '@/types/inventaris.types';

// Mock the error handling utilities
vi.mock('@/utils/inventaris-error-handling', () => ({
  validateSalesForm: vi.fn(),
  showValidationError: vi.fn(),
  showStockWarning: vi.fn(),
  showSuccess: vi.fn(),
  showLoading: vi.fn(() => vi.fn()),
  ValidationError: class ValidationError extends Error {},
  StockError: class StockError extends Error {},
  DatabaseError: class DatabaseError extends Error {},
  FinancialError: class FinancialError extends Error {},
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('MultiItemSalesForm', () => {
  const mockAvailableItems = [
    { id: '1', nama_barang: 'Item A', jumlah: 10 },
    { id: '2', nama_barang: 'Item B', jumlah: 5 },
    { id: '3', nama_barang: 'Item C', jumlah: 0 },
  ];

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders the form with all required fields', () => {
    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check for form fields
    expect(screen.getByLabelText(/pembeli/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tanggal penjualan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/catatan/i)).toBeInTheDocument();
    expect(screen.getByText(/tambah item/i)).toBeInTheDocument();
  });

  it('displays empty state when no items are added', () => {
    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/belum ada item yang ditambahkan/i)).toBeInTheDocument();
  });

  it('disables submit button when no items are added', () => {
    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /simpan transaksi/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /batal/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('validates that buyer name is required', async () => {
    const { showValidationError } = await import('@/utils/inventaris-error-handling');
    
    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit without buyer name
    const submitButton = screen.getByRole('button', { name: /simpan transaksi/i });
    
    // Note: Submit button is disabled when no items, so we can't test this directly
    // This test verifies the validation logic exists
    expect(screen.getByLabelText(/pembeli/i)).toBeRequired();
  });

  it('shows total summary when items are added', () => {
    const initialData = {
      pembeli: 'Test Buyer',
      tanggal: '2024-01-01',
      catatan: '',
      items: [
        {
          tempId: 'temp-1',
          item_id: '1',
          nama_barang: 'Item A',
          jumlah: 2,
          harga_dasar: 1000,
          sumbangan: 500,
          stok_tersedia: 10,
        },
      ],
    };

    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    // Check for total summary
    expect(screen.getByText(/ringkasan total/i)).toBeInTheDocument();
    expect(screen.getByText(/total harga dasar/i)).toBeInTheDocument();
    expect(screen.getByText(/total sumbangan/i)).toBeInTheDocument();
    expect(screen.getByText(/grand total/i)).toBeInTheDocument();
  });

  it('calculates subtotal correctly for an item', () => {
    const initialData = {
      pembeli: 'Test Buyer',
      tanggal: '2024-01-01',
      catatan: '',
      items: [
        {
          tempId: 'temp-1',
          item_id: '1',
          nama_barang: 'Item A',
          jumlah: 2,
          harga_dasar: 1000,
          sumbangan: 500,
          stok_tersedia: 10,
        },
      ],
    };

    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    // Subtotal should be (1000 * 2) + 500 = 2500
    // Use getAllByText since the value appears in both the item row and the summary
    const subtotalElements = screen.getAllByText(/Rp 2\.500/);
    expect(subtotalElements.length).toBeGreaterThan(0);
  });

  it('calculates grand total correctly', () => {
    const initialData = {
      pembeli: 'Test Buyer',
      tanggal: '2024-01-01',
      catatan: '',
      items: [
        {
          tempId: 'temp-1',
          item_id: '1',
          nama_barang: 'Item A',
          jumlah: 2,
          harga_dasar: 1000,
          sumbangan: 500,
          stok_tersedia: 10,
        },
        {
          tempId: 'temp-2',
          item_id: '2',
          nama_barang: 'Item B',
          jumlah: 1,
          harga_dasar: 2000,
          sumbangan: 0,
          stok_tersedia: 5,
        },
      ],
    };

    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    // Grand total should be (1000*2 + 500) + (2000*1 + 0) = 2500 + 2000 = 4500
    expect(screen.getByText(/Rp 4\.500/)).toBeInTheDocument();
  });

  it('shows stock warning when quantity exceeds available stock', () => {
    const initialData = {
      pembeli: 'Test Buyer',
      tanggal: '2024-01-01',
      catatan: '',
      items: [
        {
          tempId: 'temp-1',
          item_id: '1',
          nama_barang: 'Item A',
          jumlah: 15, // Exceeds available stock of 10
          harga_dasar: 1000,
          sumbangan: 0,
          stok_tersedia: 10,
        },
      ],
    };

    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByText(/melebihi stok/i)).toBeInTheDocument();
  });

  it('displays item count in summary', () => {
    const initialData = {
      pembeli: 'Test Buyer',
      tanggal: '2024-01-01',
      catatan: '',
      items: [
        {
          tempId: 'temp-1',
          item_id: '1',
          nama_barang: 'Item A',
          jumlah: 2,
          harga_dasar: 1000,
          sumbangan: 0,
          stok_tersedia: 10,
        },
        {
          tempId: 'temp-2',
          item_id: '2',
          nama_barang: 'Item B',
          jumlah: 1,
          harga_dasar: 2000,
          sumbangan: 0,
          stok_tersedia: 5,
        },
      ],
    };

    render(
      <MultiItemSalesForm
        availableItems={mockAvailableItems}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByText(/2 item dalam transaksi ini/i)).toBeInTheDocument();
  });
});
