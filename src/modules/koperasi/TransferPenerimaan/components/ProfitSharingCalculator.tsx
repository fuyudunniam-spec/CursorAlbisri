import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Building2, Store } from 'lucide-react';
import { calculateProfitSharing } from '@/services/inventaris-transfer.service';

interface ProfitSharingCalculatorProps {
  hargaJual: number;
  onHargaJualChange: (value: number) => void;
  jumlah: number;
  hppYayasan?: number;
}

export default function ProfitSharingCalculator({
  hargaJual,
  onHargaJualChange,
  jumlah,
  hppYayasan
}: ProfitSharingCalculatorProps) {
  // Calculate profit sharing for damaged goods (70:30)
  const profitSplit = useMemo(() => {
    return calculateProfitSharing(hargaJual, 'rusak');
  }, [hargaJual]);

  // Calculate totals for all units
  const totalSale = hargaJual * jumlah;
  const totalYayasan = profitSplit.yayasan_share * jumlah;
  const totalKoperasi = profitSplit.koperasi_share * jumlah;

  // Calculate profit margin if HPP is available
  const profitMargin = hppYayasan && hargaJual > 0
    ? ((hargaJual - hppYayasan) / hargaJual * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Input Harga Jual */}
      <div>
        <Label htmlFor="harga-jual">Harga Jual per Unit *</Label>
        <Input
          id="harga-jual"
          type="number"
          value={hargaJual || ''}
          onChange={(e) => onHargaJualChange(parseFloat(e.target.value) || 0)}
          placeholder="Masukkan harga jual"
          min={0}
          step={100}
        />
        {hppYayasan && (
          <p className="text-xs text-muted-foreground mt-1">
            HPP Yayasan: Rp {hppYayasan.toLocaleString('id-ID')}
            {profitMargin !== null && (
              <span className="ml-2 text-green-600">
                (Margin: {profitMargin.toFixed(1)}%)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Profit Sharing Preview */}
      {hargaJual > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Pembagian Hasil (70:30)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Per Unit */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Per Unit
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Bagian Yayasan (70%)
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    Rp {profitSplit.yayasan_share.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Bagian Koperasi (30%)
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    Rp {profitSplit.koperasi_share.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Total untuk semua unit */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Total untuk {jumlah} unit
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Penjualan:</span>
                  <span className="font-semibold">
                    Rp {totalSale.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-blue-600">
                  <span className="text-sm">Total Bagian Yayasan:</span>
                  <span className="font-semibold">
                    Rp {totalYayasan.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-sm">Total Bagian Koperasi:</span>
                  <span className="font-semibold">
                    Rp {totalKoperasi.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Catatan:</strong> Untuk barang rusak, pembagian hasil adalah 70% untuk Yayasan 
                dan 30% untuk Koperasi dari setiap penjualan. Koperasi mendapat porsi lebih besar 
                karena biaya olahan/perbaikan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
