import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import type { MultiItemSalePayload } from '@/types/inventaris.types';
import {
  showValidationError,
  showSuccess,
  showLoading,
  ValidationError,
  StockError,
  DatabaseError,
  FinancialError
} from '@/utils/inventaris-error-handling';
import TotalSummary from './TotalSummary';
import ItemList from './ItemList';
import ItemSelector from './ItemSelector';
import type { FormItem } from './ItemRow';
import { Select } from '@radix-ui/react-select';
import { SelectContent } from '@radix-ui/react-select';
import { SelectItem } from '@radix-ui/react-select';
import { SelectItem } from '@radix-ui/react-select';
import { SelectContent } from '@radix-ui/react-select';
import { SelectTrigger } from '@radix-ui/react-select';
import { SelectValue } from '@radix-ui/react-select';
import { SelectTrigger } from '@radix-ui/react-select';
import { Select } from '@radix-ui/react-select';

type FormData = {
  pembeli: string;
  tanggal: string;
  catatan: string;
  items: FormItem[];
};

// Props interface
interface MultiItemSalesFormProps {
  availableItems: Array<{
    id: string;
    nama_barang: string;
    jumlah: number | null;
  }>;
  onSubmit: (payload: MultiItemSalePayload) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<FormData>;
  isEditing?: boolean;
}

/**
 * MultiItemSalesForm Component
 * 
 * A form component for creating/editing multi-item sales transactions.
 * Integrates item selection, item list management, and total calculation.
 * 
 * Requirements: 1.1, 1.5, 2.5
 */
const MultiItemSalesForm: React.FC<MultiItemSalesFormProps> = ({
  availableItems,
  onSubmit,
  onCancel,
  initialData,
  isEditing = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    pembeli: initialData?.pembeli || '',
    tanggal: initialData?.tanggal || new Date().toISOString().split('T')[0],
    catatan: initialData?.catatan || '',
    items: initialData?.items || []
  });

  // ============================================================================
  // Item Management Functions
  // ============================================================================

  /**
   * Add an item to the transaction
   * Validates that item exists and is not already added
   */
  const addItem = (itemId: string) => {
    const selectedItem = availableItems.find(i => i.id === itemId);
    if (!selectedItem) return;

    // Check if item already exists
    if (formData.items.some(i => i.item_id === itemId)) {
      toast.warning('Item sudah ditambahkan', {
        description: 'Item ini sudah ada dalam daftar penjualan'
      });
      return;
    }

    const newItem: FormItem = {
      tempId: `temp-${Date.now()}`,
      item_id: itemId,
      nama_barang: selectedItem.nama_barang,
      jumlah: 1,
      harga_dasar: 0,
      sumbangan: 0,
      stok_tersedia: selectedItem.jumlah || 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  /**
   * Remove an item from the transaction
   */
  const removeItem = (tempId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.tempId !== tempId)
    }));
  };

  /**
   * Update an item's properties
   */
  const updateItem = (tempId: string, updates: Partial<FormItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i => 
        i.tempId === tempId ? { ...i, ...updates } : i
      )
    }));
  };

  // ============================================================================
  // Calculation Functions
  // ============================================================================

  /**
   * Calculate totals for the entire transaction
   * Returns total_harga_dasar, total_sumbangan, and grand_total
   */
  const calculateTotals = () => {
    const total_harga_dasar = formData.items.reduce(
      (sum, item) => sum + (item.harga_dasar * item.jumlah),
      0
    );
    const total_sumbangan = formData.items.reduce(
      (sum, item) => sum + item.sumbangan,
      0
    );
    const grand_total = total_harga_dasar + total_sumbangan;
    
    return { total_harga_dasar, total_sumbangan, grand_total };
  };



  // ============================================================================
  // Form Validation and Submission
  // ============================================================================

  /**
   * Validate form before submission
   * Checks buyer name, items presence, and individual item validity
   */
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate buyer name
    if (!formData.pembeli.trim()) {
      errors.push('Nama pembeli harus diisi');
    }

    // Validate items presence
    if (formData.items.length === 0) {
      errors.push('Minimal harus ada 1 item dalam transaksi');
    }

    // Validate each item
    formData.items.forEach((item, index) => {
      if (item.jumlah <= 0) {
        errors.push(`Item ${index + 1}: Jumlah harus lebih dari 0`);
      }
      if (item.harga_dasar < 0) {
        errors.push(`Item ${index + 1}: Harga dasar tidak boleh negatif`);
      }
      if (item.sumbangan < 0) {
        errors.push(`Item ${index + 1}: Sumbangan tidak boleh negatif`);
      }
      if (item.jumlah > item.stok_tersedia) {
        errors.push(`Item ${index + 1} (${item.nama_barang}): Stok tidak mencukupi`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  /**
   * Handle form submission
   * Validates form and calls onSubmit callback
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      const validation = validateForm();
      if (!validation.valid) {
        showValidationError(validation.errors);
        return;
      }

      // Prepare payload
      const payload: MultiItemSalePayload = {
        pembeli: formData.pembeli,
        tanggal: formData.tanggal,
        catatan: formData.catatan,
        items: formData.items.map(item => ({
          item_id: item.item_id,
          jumlah: item.jumlah,
          harga_dasar: item.harga_dasar,
          sumbangan: item.sumbangan
        }))
      };

      const dismissLoading = showLoading(
        isEditing ? 'Memperbarui transaksi multi-item...' : 'Menyimpan transaksi multi-item...'
      );

      try {
        await onSubmit(payload);
        dismissLoading();
        showSuccess('Transaksi multi-item berhasil disimpan!');
      } catch (transactionError: any) {
        dismissLoading();
        throw transactionError;
      }

    } catch (error: any) {
      console.error('Error submitting multi-item sales transaction:', error);
      
      if (error instanceof ValidationError) {
        showValidationError([error.message]);
      } else if (error instanceof StockError) {
        if (error.details?.errors) {
          toast.error('Stok tidak mencukupi', {
            description: error.details.errors.join(', ')
          });
        } else {
          toast.error(error.message);
        }
      } else if (error instanceof FinancialError) {
        toast.error('Gagal mencatat ke keuangan', {
          description: error.message
        });
      } else if (error instanceof DatabaseError) {
        toast.error('Gagal menyimpan ke database', {
          description: error.message
        });
      } else {
        toast.error('Gagal menyimpan transaksi multi-item', {
          description: error.message || 'Terjadi kesalahan yang tidak diketahui'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {isEditing ? 'Edit Penjualan Multi-Item' : 'Form Penjualan Multi-Item'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pembeli">Pembeli *</Label>
              <Input
                id="pembeli"
                value={formData.pembeli}
                onChange={(e) => setFormData(prev => ({ ...prev, pembeli: e.target.value }))}
                placeholder="Nama pembeli"
                required
              />
            </div>

            <div>
              <Label htmlFor="tanggal">Tanggal Penjualan *</Label>
              <Input
                id="tanggal"
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="catatan">Catatan</Label>
              <Input
                id="catatan"
                value={formData.catatan}
                onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                placeholder="Catatan (opsional)"
              />
            </div>
          </div>

          {/* Item Selector */}
          <div>
            <Label htmlFor="item-selector">Tambah Item</Label>
            <div className="flex gap-2">
              <Select onValueChange={(value) => {
                addItem(value);
              }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih item untuk ditambahkan" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map(item => {
                    const stockLevel = item.jumlah || 0;
                    const isOutOfStock = stockLevel === 0;
                    const isAlreadyAdded = formData.items.some(i => i.item_id === item.id);
                    
                    return (
                      <SelectItem 
                        key={item.id} 
                        value={item.id}
                        disabled={isOutOfStock || isAlreadyAdded}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{item.nama_barang}</span>
                          <span className={`ml-2 text-sm ${
                            isOutOfStock ? 'text-red-600 font-medium' :
                            isAlreadyAdded ? 'text-muted-foreground' :
                            'text-muted-foreground'
                          }`}>
                            {isAlreadyAdded ? '(Sudah ditambahkan)' : `Stok: ${stockLevel}`}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items List */}
          <ItemList
            items={formData.items}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
          />

          {/* Total Summary */}
          {formData.items.length > 0 && (
            <TotalSummary 
              totals={{
                ...totals,
                itemCount: formData.items.length
              }}
            />
          )}

          {/* Form Actions */}
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isSubmitting || formData.items.length === 0}
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {isSubmitting ? 'Menyimpan...' : (isEditing ? 'Update Transaksi' : 'Simpan Transaksi')}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MultiItemSalesForm;
