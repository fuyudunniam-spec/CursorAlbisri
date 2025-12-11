import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransferDestination } from '@/types/transfer.types';
import { Store, Package, Utensils, Home, Building2, MoreHorizontal } from 'lucide-react';

interface TransferDestinationDropdownProps {
  value: TransferDestination | '';
  onChange: (value: TransferDestination) => void;
  disabled?: boolean;
}

const DESTINATION_OPTIONS = [
  {
    value: TransferDestination.DISTRIBUSI,
    label: 'Distribusi Bantuan',
    icon: Package,
    description: 'Transfer ke bank distribusi bantuan'
  },
  {
    value: TransferDestination.DAPUR,
    label: 'Dapur',
    icon: Utensils,
    description: 'Transfer ke dapur yayasan'
  },
  {
    value: TransferDestination.ASRAMA,
    label: 'Asrama',
    icon: Home,
    description: 'Transfer ke asrama santri'
  },
  {
    value: TransferDestination.KANTOR,
    label: 'Kantor',
    icon: Building2,
    description: 'Transfer ke kantor yayasan'
  },
  {
    value: TransferDestination.LAINNYA,
    label: 'Lainnya',
    icon: MoreHorizontal,
    description: 'Transfer ke tujuan lainnya'
  }
];

/**
 * TransferDestinationDropdown Component
 * 
 * Dropdown untuk memilih tujuan transfer inventaris dengan ikon yang jelas.
 * 
 * Requirements: AC-1.1, AC-1.2, AC-6.1
 */
export function TransferDestinationDropdown({
  value,
  onChange,
  disabled = false
}: TransferDestinationDropdownProps) {
  const selectedOption = DESTINATION_OPTIONS.find(opt => opt.value === value);

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as TransferDestination)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih tujuan transfer">
          {selectedOption && (
            <div className="flex items-center gap-2">
              <selectedOption.icon className="h-4 w-4" />
              <span>{selectedOption.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {DESTINATION_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export { DESTINATION_OPTIONS };
