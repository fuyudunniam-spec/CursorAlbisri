import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Totals data structure
 */
export type TotalSummaryData = {
  total_harga_dasar: number;
  total_sumbangan: number;
  grand_total: number;
  itemCount: number;
};

/**
 * Props for TotalSummary component
 */
interface TotalSummaryProps {
  totals: TotalSummaryData;
  className?: string;
}

/**
 * TotalSummary Component
 * 
 * Displays a breakdown of transaction totals including:
 * - Total base price (sum of all items)
 * - Total donations (sum of all donations)
 * - Grand total (base + donations)
 * 
 * Updates in real-time when items change through props.
 * 
 * Requirements: 1.3, 8.3
 */
const TotalSummary: React.FC<TotalSummaryProps> = ({ totals, className = '' }) => {
  return (
    <Card className={`bg-muted/50 ${className}`}>
      <CardHeader>
        <CardTitle className="text-sm">Ringkasan Total</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {/* Total Base Price */}
          <div className="flex justify-between">
            <span>Total Harga Dasar:</span>
            <span>Rp {Math.round(totals.total_harga_dasar).toLocaleString('id-ID')}</span>
          </div>
          
          {/* Total Donations */}
          <div className="flex justify-between">
            <span>Total Sumbangan:</span>
            <span>Rp {Math.round(totals.total_sumbangan).toLocaleString('id-ID')}</span>
          </div>
          
          {/* Grand Total */}
          <div className="flex justify-between font-medium border-t pt-2 text-lg">
            <span>Grand Total:</span>
            <span className="text-green-600">
              Rp {Math.round(totals.grand_total).toLocaleString('id-ID')}
            </span>
          </div>
          
          {/* Item Count */}
          <div className="text-xs text-muted-foreground mt-2">
            {totals.itemCount} item dalam transaksi ini
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TotalSummary;
