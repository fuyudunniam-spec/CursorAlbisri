import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TotalSummary, { TotalSummaryData } from './TotalSummary';

describe('TotalSummary Component', () => {
  it('should display total base price correctly', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 100000,
      total_sumbangan: 0,
      grand_total: 100000,
      itemCount: 2
    };

    render(<TotalSummary totals={totals} />);
    
    expect(screen.getByText('Total Harga Dasar:')).toBeInTheDocument();
    const allPrices = screen.getAllByText('Rp 100.000');
    expect(allPrices.length).toBeGreaterThan(0);
  });

  it('should display total donations correctly', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 100000,
      total_sumbangan: 25000,
      grand_total: 125000,
      itemCount: 2
    };

    render(<TotalSummary totals={totals} />);
    
    expect(screen.getByText('Total Sumbangan:')).toBeInTheDocument();
    expect(screen.getByText('Rp 25.000')).toBeInTheDocument();
  });

  it('should display grand total correctly', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 100000,
      total_sumbangan: 25000,
      grand_total: 125000,
      itemCount: 2
    };

    render(<TotalSummary totals={totals} />);
    
    expect(screen.getByText('Grand Total:')).toBeInTheDocument();
    expect(screen.getByText('Rp 125.000')).toBeInTheDocument();
  });

  it('should display item count correctly', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 100000,
      total_sumbangan: 25000,
      grand_total: 125000,
      itemCount: 3
    };

    render(<TotalSummary totals={totals} />);
    
    expect(screen.getByText('3 item dalam transaksi ini')).toBeInTheDocument();
  });

  it('should handle zero values correctly', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 0,
      total_sumbangan: 0,
      grand_total: 0,
      itemCount: 0
    };

    render(<TotalSummary totals={totals} />);
    
    const allZeros = screen.getAllByText('Rp 0');
    expect(allZeros.length).toBe(3); // base price, donation, and grand total
    expect(screen.getByText('0 item dalam transaksi ini')).toBeInTheDocument();
  });

  it('should format large numbers with Indonesian locale', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 1500000,
      total_sumbangan: 500000,
      grand_total: 2000000,
      itemCount: 5
    };

    render(<TotalSummary totals={totals} />);
    
    // Check for formatted numbers with dots as thousand separators
    expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 500.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 2.000.000')).toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 100000,
      total_sumbangan: 0,
      grand_total: 100000,
      itemCount: 1
    };

    const { container } = render(<TotalSummary totals={totals} className="custom-class" />);
    
    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('should round decimal values correctly', () => {
    const totals: TotalSummaryData = {
      total_harga_dasar: 100000.75,
      total_sumbangan: 25000.25,
      grand_total: 125001,
      itemCount: 2
    };

    render(<TotalSummary totals={totals} />);
    
    // Math.round should be applied to all values
    expect(screen.getByText('Rp 100.001')).toBeInTheDocument();
    expect(screen.getByText('Rp 25.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 125.001')).toBeInTheDocument();
  });
});
