import React from 'react';
import { Package } from 'lucide-react';
import ItemRow, { FormItem } from './ItemRow';

/**
 * Props for ItemList component
 */
interface ItemListProps {
  items: FormItem[];
  onUpdateItem: (tempId: string, updates: Partial<FormItem>) => void;
  onRemoveItem: (tempId: string) => void;
}

/**
 * ItemList Component
 * 
 * Displays all items in a sales transaction as a table.
 * Uses ItemRow component for each item.
 * Handles item removal with automatic total recalculation.
 * Shows "No items" message when the list is empty.
 * 
 * Requirements: 1.2, 1.4
 */
const ItemList: React.FC<ItemListProps> = ({ items, onUpdateItem, onRemoveItem }) => {
  // Display empty state when no items
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Belum ada item yang ditambahkan</p>
        <p className="text-sm">Pilih item dari dropdown di atas untuk menambahkan</p>
      </div>
    );
  }

  // Display items table
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Item</th>
              <th className="text-left p-3 font-medium">Jumlah</th>
              <th className="text-left p-3 font-medium">Harga Dasar/Unit</th>
              <th className="text-left p-3 font-medium">Sumbangan</th>
              <th className="text-left p-3 font-medium">Subtotal</th>
              <th className="text-left p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemRow
                key={item.tempId}
                item={item}
                onUpdate={onUpdateItem}
                onRemove={onRemoveItem}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemList;
