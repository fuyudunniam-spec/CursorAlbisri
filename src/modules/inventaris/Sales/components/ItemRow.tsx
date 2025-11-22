import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

/**
 * FormItem type for ItemRow
 * Represents a single item in the sales transaction
 */
export type FormItem = {
  tempId: string;
  item_id: string;
  nama_barang: string;
  jumlah: number;
  harga_dasar: number;
  sumbangan: number;
  stok_tersedia: number;
};

/**
 * Props for ItemRow component
 */
interface ItemRowProps {
  item: FormItem;
  onUpdate: (tempId: string, updates: Partial<FormItem>) => void;
  onRemove: (tempId: string) => void;
}

/**
 * ItemRow Component
 * 
 * Displays a single item in the sales transaction with editable fields.
 * Provides real-time subtotal calculation and stock validation.
 * 
 * Requirements: 1.2, 2.1, 2.2, 2.3, 2.5, 3.2
 */
const ItemRow: React.FC<ItemRowProps> = ({ item, onUpdate, onRemove }) => {
  /**
   * Calculate subtotal for this item
   * Subtotal = (harga_dasar × jumlah) + sumbangan
   */
  const calculateSubtotal = () => {
    return (item.harga_dasar * item.jumlah) + item.sumbangan;
  };

  /**
   * Handle quantity change with validation
   * Prevents negative values and zero quantity
   */
  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    // Enforce minimum of 1 for quantity (no zero or negative)
    if (numValue >= 1) {
      onUpdate(item.tempId, { jumlah: numValue });
    }
  };

  /**
   * Handle price change with validation
   * Prevents negative values
   */
  const handlePriceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    // Enforce minimum of 0 for price (no negative)
    if (numValue >= 0) {
      onUpdate(item.tempId, { harga_dasar: numValue });
    }
  };

  /**
   * Handle donation change with validation
   * Prevents negative values
   */
  const handleDonationChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    // Enforce minimum of 0 for donation (no negative)
    if (numValue >= 0) {
      onUpdate(item.tempId, { sumbangan: numValue });
    }
  };

  const subtotal = calculateSubtotal();
  const hasStockIssue = item.jumlah > item.stok_tersedia;
  const hasInvalidQuantity = item.jumlah <= 0;

  return (
    <tr className="border-t">
      {/* Item Name and Stock Info */}
      <td className="p-3">
        <div className="font-medium">{item.nama_barang}</div>
        <div className="text-sm text-muted-foreground">
          Stok: {item.stok_tersedia}
        </div>
      </td>

      {/* Quantity Input */}
      <td className="p-3">
        <Input
          type="number"
          min="1"
          value={item.jumlah}
          onChange={(e) => handleQuantityChange(e.target.value)}
          className={`w-24 ${hasStockIssue || hasInvalidQuantity ? 'border-red-500' : ''}`}
        />
        {hasStockIssue && (
          <p className="text-xs text-red-600 mt-1">Melebihi stok</p>
        )}
        {hasInvalidQuantity && (
          <p className="text-xs text-red-600 mt-1">Minimal 1</p>
        )}
      </td>

      {/* Base Price Input */}
      <td className="p-3">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.harga_dasar}
          onChange={(e) => handlePriceChange(e.target.value)}
          className="w-32"
        />
      </td>

      {/* Donation Input */}
      <td className="p-3">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.sumbangan}
          onChange={(e) => handleDonationChange(e.target.value)}
          className="w-32"
        />
      </td>

      {/* Subtotal Display */}
      <td className="p-3 font-medium">
        Rp {Math.round(subtotal).toLocaleString('id-ID')}
      </td>

      {/* Remove Button */}
      <td className="p-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-red-600"
          onClick={() => onRemove(item.tempId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};

export default ItemRow;
