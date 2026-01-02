import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface MonthYearFilterProps {
  selectedMonth: number; // 1-12
  selectedYear: number; // YYYY
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  yearRange?: { start: number; end: number };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MonthYearFilter: React.FC<MonthYearFilterProps> = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  yearRange,
  className,
  size = 'md',
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
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
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Select
        value={selectedMonth.toString()}
        onValueChange={(value) => onMonthChange(parseInt(value))}
      >
        <SelectTrigger className={`${sizeClass} w-[150px] bg-white border-gray-200`}>
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
        value={selectedYear.toString()}
        onValueChange={(value) => onYearChange(parseInt(value))}
      >
        <SelectTrigger className={`${sizeClass} w-[100px] bg-white border-gray-200`}>
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
    </div>
  );
};


