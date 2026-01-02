import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

export type PeriodFilterType = 
  | 'all'
  | 'bulan-ini'
  | 'bulan-lalu'
  | '3-bulan'
  | '6-bulan'
  | '1-tahun'
  | 'tahun-ini'
  | 'month-year'
  | 'custom';

export interface PeriodFilterSelectProps {
  periodType: PeriodFilterType;
  onPeriodTypeChange: (type: PeriodFilterType) => void;
  selectedMonth?: number;
  selectedYear?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomDateChange?: (start: Date | undefined, end: Date | undefined) => void;
  showAllOption?: boolean;
  showCustomOption?: boolean;
  showMonthYearOption?: boolean;
  yearRange?: { start: number; end: number };
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  labels?: Record<string, string>;
  showPeriodDisplay?: boolean;
  getPeriodRange?: () => { start: Date; end: Date } | null;
  showLabel?: boolean;
}

const defaultLabels = {
  all: 'Semua',
  bulanIni: 'Bulan Ini',
  bulanLalu: 'Bulan Lalu',
  tigaBulan: '3 Bulan Terakhir',
  enamBulan: '6 Bulan Terakhir',
  satuTahun: '1 Tahun Terakhir',
  tahunIni: 'Tahun Ini',
  monthYear: 'Pilih Bulan/Tahun',
  custom: 'Custom',
};

export const PeriodFilterSelect: React.FC<PeriodFilterSelectProps> = ({
  periodType,
  onPeriodTypeChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  showAllOption = true,
  showCustomOption = true,
  showMonthYearOption = false,
  yearRange,
  className,
  triggerClassName,
  size = 'md',
  labels = {},
  showPeriodDisplay = false,
  getPeriodRange,
  showLabel = false,
}) => {
  const finalLabels = { ...defaultLabels, ...labels };
  const now = new Date();
  const currentYear = now.getFullYear();
  const [showCustomPicker, setShowCustomPicker] = React.useState(false);
  
  const defaultYearRange = {
    start: currentYear - 2,
    end: currentYear + 2,
  };
  const finalYearRange = yearRange || defaultYearRange;
  
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1).map(month => ({
    value: month,
    label: format(new Date(2024, month - 1, 1), 'MMMM', { locale: id }),
  }));
  
  const yearOptions = Array.from(
    { length: finalYearRange.end - finalYearRange.start + 1 },
    (_, i) => finalYearRange.start + i
  );
  
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-10 text-base',
  };
  
  const triggerSizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Get period range for display
  const periodRange = getPeriodRange ? getPeriodRange() : null;
  
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      {/* Icon + Label (optional) */}
      {showLabel && (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span>Periode</span>
        </div>
      )}
      
      {/* Period Type Selector */}
      <Select value={periodType} onValueChange={onPeriodTypeChange}>
        <SelectTrigger className={`${triggerSizeClass} ${triggerClassName || 'w-[150px] bg-white border-gray-200'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">{finalLabels.all}</SelectItem>
          )}
          <SelectItem value="bulan-ini">{finalLabels.bulanIni}</SelectItem>
          <SelectItem value="bulan-lalu">{finalLabels.bulanLalu}</SelectItem>
          <SelectItem value="3-bulan">{finalLabels.tigaBulan}</SelectItem>
          <SelectItem value="6-bulan">{finalLabels.enamBulan}</SelectItem>
          <SelectItem value="1-tahun">{finalLabels.satuTahun}</SelectItem>
          <SelectItem value="tahun-ini">{finalLabels.tahunIni}</SelectItem>
          {showMonthYearOption && (
            <SelectItem value="month-year">{finalLabels.monthYear}</SelectItem>
          )}
          {showCustomOption && (
            <SelectItem value="custom">{finalLabels.custom}</SelectItem>
          )}
        </SelectContent>
      </Select>
      
      {/* Month-Year Selectors */}
      {periodType === 'month-year' && (
        <>
          <Select
            value={selectedMonth?.toString() || (now.getMonth() + 1).toString()}
            onValueChange={(value) => onMonthChange?.(parseInt(value))}
          >
            <SelectTrigger className={`${triggerSizeClass} w-[150px] bg-white border-gray-200`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(month => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={selectedYear?.toString() || currentYear.toString()}
            onValueChange={(value) => onYearChange?.(parseInt(value))}
          >
            <SelectTrigger className={`${triggerSizeClass} w-[100px] bg-white border-gray-200`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      
      {/* Custom Date Range Picker */}
      {periodType === 'custom' && (
        <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size={size === 'md' ? 'default' : size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
              className="bg-white border-gray-200"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {customStartDate && customEndDate 
                ? `${format(customStartDate, 'dd MMM yyyy', { locale: id })} - ${format(customEndDate, 'dd MMM yyyy', { locale: id })}`
                : 'Pilih Periode'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tanggal Mulai:</label>
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => onCustomDateChange?.(date, customEndDate)}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tanggal Akhir:</label>
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => onCustomDateChange?.(customStartDate, date)}
                    className="rounded-md border"
                  />
                </div>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setShowCustomPicker(false);
                    if (customStartDate && customEndDate && onCustomDateChange) {
                      onCustomDateChange(customStartDate, customEndDate);
                    }
                  }}
                  disabled={!customStartDate || !customEndDate}
                  className="w-full"
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Period Display (optional) */}
      {showPeriodDisplay && periodRange && (
        <div className="text-sm text-gray-600 font-medium px-2 py-1 bg-white/80 rounded-md border border-gray-200/60">
          {periodType === 'all' 
            ? 'Semua Data'
            : `${format(periodRange.start, 'd MMM yyyy', { locale: id })} - ${format(periodRange.end, 'd MMM yyyy', { locale: id })}`
          }
        </div>
      )}
    </div>
  );
};

