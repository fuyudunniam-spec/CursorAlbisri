import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

/**
 * ItemSelector Component
 * 
 * A dropdown component for selecting inventory items to add to a sales transaction.
 * Displays current stock for each item and disables items with zero stock.
 * 
 * Requirements: 1.1, 1.2, 3.1
 */

export interface ItemSelectorProps {
  /**
   * List of available inventory items
   */
  availableItems: Array<{
    id: string;
    nama_barang: string;
    jumlah: number | null;
  }>;
  
  /**
   * Callback when an item is selected
   */
  onItemSelect: (itemId: string) => void;
  
  /**
   * List of item IDs that are already added to the transaction
   */
  selectedItemIds?: string[];
  
  /**
   * Optional label for the selector
   */
  label?: string;
  
  /**
   * Optional placeholder text
   */
  placeholder?: string;
  
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  availableItems,
  onItemSelect,
  selectedItemIds = [],
  label = 'Tambah Item',
  placeholder = 'Pilih item untuk ditambahkan',
  disabled = false
}) => {
  // Track the current value to reset after selection
  const [value, setValue] = React.useState<string>('');

  /**
   * Handle item selection
   * Calls the onItemSelect callback and resets the selector
   */
  const handleValueChange = (itemId: string) => {
    if (itemId) {
      onItemSelect(itemId);
      // Reset the selector after adding an item
      setValue('');
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="item-selector">{label}</Label>}
      <Select 
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="item-selector" className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableItems.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Tidak ada item tersedia
            </div>
          ) : (
            availableItems.map(item => {
              const stockLevel = item.jumlah ?? 0;
              const isOutOfStock = stockLevel === 0;
              const isAlreadyAdded = selectedItemIds.includes(item.id);
              const isDisabled = isOutOfStock || isAlreadyAdded;
              
              return (
                <SelectItem 
                  key={item.id} 
                  value={item.id}
                  disabled={isDisabled}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <span className="flex-1 truncate">{item.nama_barang}</span>
                    <div className="flex items-center gap-2">
                      {isAlreadyAdded ? (
                        <Badge variant="secondary" className="text-xs">
                          Sudah ditambahkan
                        </Badge>
                      ) : isOutOfStock ? (
                        <Badge variant="destructive" className="text-xs">
                          Stok habis
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Stok: {stockLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ItemSelector;
