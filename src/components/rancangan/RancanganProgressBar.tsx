import React from 'react';
import { cn } from '@/lib/utils';

interface RancanganProgressBarProps {
  persentase: number;
  target: number;
  dukungan: number;
  statusPemenuhan: 'belum_terpenuhi' | 'terlayani' | 'tercukupi';
  className?: string;
  showLabel?: boolean;
}

const RancanganProgressBar: React.FC<RancanganProgressBarProps> = ({
  persentase,
  target,
  dukungan,
  statusPemenuhan,
  className,
  showLabel = true
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusColor = () => {
    switch (statusPemenuhan) {
      case 'tercukupi':
        return 'bg-green-500';
      case 'terlayani':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (statusPemenuhan) {
      case 'tercukupi':
        return 'Tercukupi';
      case 'terlayani':
        return 'Terlayani';
      default:
        return 'Belum Terpenuhi';
    }
  };

  const getStatusBgColor = () => {
    switch (statusPemenuhan) {
      case 'tercukupi':
        return 'bg-green-50 border-green-200';
      case 'terlayani':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress Pemenuhan</span>
          <span className={cn(
            'px-2 py-0.5 rounded text-xs font-medium',
            getStatusBgColor(),
            statusPemenuhan === 'tercukupi' && 'text-green-700',
            statusPemenuhan === 'terlayani' && 'text-blue-700',
            statusPemenuhan === 'belum_terpenuhi' && 'text-gray-700'
          )}>
            {getStatusText()}
          </span>
        </div>
      )}
      
      <div className="relative">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500', getStatusColor())}
            style={{ width: `${Math.min(persentase, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{formatCurrency(dukungan)} dari {formatCurrency(target)}</span>
        <span className="font-medium">{persentase.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default RancanganProgressBar;

