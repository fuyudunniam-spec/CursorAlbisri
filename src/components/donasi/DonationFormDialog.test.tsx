import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DonationFormDialog from './DonationFormDialog';
import { supabase } from '@/integrations/supabase/client';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DonationFormDialog - Integration Test: Full Edit Flow', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  
  const mockAkunKasList = [
    { id: 'akun-1', nama: 'Kas Utama', status: 'aktif', is_default: true },
    { id: 'akun-2', nama: 'Bank Pembangunan', status: 'aktif', is_default: false },
    { id: 'akun-3', nama: 'Bank Operasional', status: 'aktif', is_default: false },
  ];

  const mockDonation = {
    id: 'donation-123',
    donation_type: 'cash',
    donor_name: 'Ahmad Yani',
    donor_email: 'ahmad@example.com',
    donor_phone: '081234567890',
    donor_address: 'Jl. Merdeka No. 123',
    donation_date: '2025-01-15',
    received_date: '2025-01-15',
    cash_amount: 1000000,
    payment_method: 'Bank Transfer',
    akun_kas_id: 'akun-1',
    is_restricted: false,
    restricted_tag: null,
    notes: 'Donasi untuk operasional',
    hajat_doa: 'Semoga berkah',
    status: 'received',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock supabase responses with proper chaining
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'akun_kas') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockAkunKasList,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      if (table === 'inventaris') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
      
      if (table === 'donation_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        };
      }
      
      if (table === 'donations') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockDonation, akun_kas_id: 'akun-2' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });

    (supabase.from as any) = mockFrom;
  });

  it('should load donation with akun_kas_id and display it in the form', async () => {
    render(
      <DonationFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        editingDonation={mockDonation}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ahmad Yani')).toBeInTheDocument();
    });

    // Verify akun_kas_id field is visible and populated
    // The Select component renders multiple comboboxes, find by the label text
    expect(screen.getByText('Akun Kas *')).toBeInTheDocument();
    
    // Verify the current akun kas is displayed
    await waitFor(() => {
      expect(screen.getByText(/kas utama/i)).toBeInTheDocument();
    });
  });

  it('should allow changing akun_kas_id and submit the updated donation', async () => {
    const user = userEvent.setup();
    
    render(
      <DonationFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        editingDonation={mockDonation}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ahmad Yani')).toBeInTheDocument();
    });

    // Find and click the akun kas select by finding all comboboxes and selecting the one for akun kas
    // The third combobox is the akun_kas field (after donation_type and payment_method)
    const comboboxes = screen.getAllByRole('combobox');
    const akunKasSelect = comboboxes[2]; // Third combobox is akun_kas
    await user.click(akunKasSelect);

    // Wait for dropdown to appear and select a different account
    await waitFor(() => {
      expect(screen.getByText('Bank Pembangunan')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Bank Pembangunan'));

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /perbarui donasi/i });
    await user.click(submitButton);

    // Verify the update was called with the new akun_kas_id
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('donations');
      const fromCall = (supabase.from as any).mock.results[0].value;
      expect(fromCall.update).toHaveBeenCalled();
      
      // Get the update payload
      const updatePayload = fromCall.update.mock.calls[0][0];
      expect(updatePayload.akun_kas_id).toBe('akun-2');
    });

    // Verify success callback was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should validate that akun_kas_id is required for cash donations', async () => {
    const user = userEvent.setup();
    
    const donationWithoutAkunKas = {
      ...mockDonation,
      akun_kas_id: null,
    };
    
    render(
      <DonationFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        editingDonation={donationWithoutAkunKas}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ahmad Yani')).toBeInTheDocument();
    });

    // Try to submit without selecting akun_kas_id
    const submitButton = screen.getByRole('button', { name: /perbarui donasi/i });
    await user.click(submitButton);

    // Verify validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(/pilih akun kas untuk donasi tunai/i)).toBeInTheDocument();
    });

    // Verify the form was not submitted
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should validate that akun_kas_id is required for mixed donations', async () => {
    const user = userEvent.setup();
    
    const mixedDonationWithoutAkunKas = {
      ...mockDonation,
      donation_type: 'mixed',
      akun_kas_id: null,
    };
    
    render(
      <DonationFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        editingDonation={mixedDonationWithoutAkunKas}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ahmad Yani')).toBeInTheDocument();
    });

    // Try to submit without selecting akun_kas_id
    const submitButton = screen.getByRole('button', { name: /perbarui donasi/i });
    await user.click(submitButton);

    // Verify validation error is displayed
    await waitFor(() => {
      expect(screen.getByText(/pilih akun kas untuk donasi tunai/i)).toBeInTheDocument();
    });

    // Verify the form was not submitted
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should load all active cash accounts when form opens', async () => {
    render(
      <DonationFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        editingDonation={mockDonation}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ahmad Yani')).toBeInTheDocument();
    });

    // Verify supabase was called to fetch akun kas list
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('akun_kas');
      const fromCall = (supabase.from as any).mock.results.find(
        (result: any) => result.value.select
      );
      expect(fromCall).toBeDefined();
    });

    // Open the select to verify all accounts are loaded
    // The third combobox is the akun_kas field
    const comboboxes = screen.getAllByRole('combobox');
    const akunKasSelect = comboboxes[2];
    await userEvent.click(akunKasSelect);

    // Verify all accounts are in the dropdown
    await waitFor(() => {
      expect(screen.getByText('Kas Utama (Default)')).toBeInTheDocument();
      expect(screen.getByText('Bank Pembangunan')).toBeInTheDocument();
      expect(screen.getByText('Bank Operasional')).toBeInTheDocument();
    });
  });

  it('should persist the updated akun_kas_id to the database', async () => {
    const user = userEvent.setup();
    
    // Mock the database update to return the updated donation
    const updatedDonation = {
      ...mockDonation,
      akun_kas_id: 'akun-3',
      updated_at: new Date().toISOString(),
    };

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: updatedDonation,
            error: null,
          }),
        }),
      }),
    });

    (supabase.from as any) = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAkunKasList,
              error: null,
            }),
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      update: mockUpdate,
    });
    
    render(
      <DonationFormDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        editingDonation={mockDonation}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ahmad Yani')).toBeInTheDocument();
    });

    // Change akun_kas_id
    // The third combobox is the akun_kas field
    const comboboxes = screen.getAllByRole('combobox');
    const akunKasSelect = comboboxes[2];
    await user.click(akunKasSelect);

    await waitFor(() => {
      expect(screen.getByText('Bank Operasional')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Bank Operasional'));

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /perbarui donasi/i });
    await user.click(submitButton);

    // Verify the database was updated with the correct payload
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      const updatePayload = mockUpdate.mock.calls[0][0];
      
      // Verify akun_kas_id is in the payload
      expect(updatePayload.akun_kas_id).toBe('akun-3');
      
      // Verify other required fields are present
      expect(updatePayload.donation_type).toBe('cash');
      expect(updatePayload.donor_name).toBe('Ahmad Yani');
      expect(updatePayload.cash_amount).toBe(1000000);
      
      // Verify updated_at is set
      expect(updatePayload.updated_at).toBeDefined();
    });

    // Verify success callback was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });
});
