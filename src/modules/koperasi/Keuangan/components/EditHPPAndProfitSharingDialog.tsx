import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { koperasiService } from '@/services/koperasi.service';
import { updateBulkInventorySaleItemHPPAndProfitSharing } from '@/services/inventaris.service';
import { toast } from 'sonner';
import { Calculator, TrendingUp, Building2, Store } from 'lucide-react';

interface SaleItem {
  id: string;
  nama_barang: string;
  jumlah: number;
  harga_satuan_jual?: number;
  harga_dasar?: number;
  subtotal: number;
  hpp_snapshot?: number;
  sumbangan?: number;
  bagian_yayasan?: number;
  bagian_koperasi?: number;
  margin?: number;
  owner_type?: 'koperasi' | 'yayasan';
  bagi_hasil_yayasan?: number;
}

interface EditHPPAndProfitSharingDialogProps {
  saleId: string;
  saleItems: SaleItem[];
  saleType: 'koperasi' | 'inventaris'; // Type of sale
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EditHPPAndProfitSharingDialog: React.FC<EditHPPAndProfitSharingDialogProps> = ({
  saleId,
  saleItems,
  saleType,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [items, setItems] = useState<Array<SaleItem & { newHPP: number; newSumbangan?: number; newBagiHasil?: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && saleItems.length > 0) {
      if (saleType === 'inventaris') {
        setItems(saleItems.map(item => ({
          ...item,
          newHPP: item.harga_dasar || 0,
          newSumbangan: item.sumbangan || 0,
          newBagiHasil: 70 // Default 70% untuk yayasan
        })));
      } else {
        setItems(saleItems.map(item => ({
          ...item,
          newHPP: item.hpp_snapshot || 0,
          newBagiHasil: item.owner_type === 'yayasan' ? (item.bagi_hasil_yayasan || 70) : undefined
        })));
      }
    }
  }, [isOpen, saleItems, saleType]);

  const calculateProfitSharing = (item: typeof items[0]) => {
    if (saleType === 'inventaris') {
      const hpp = item.newHPP || 0;
      const sumbangan = item.newSumbangan || 0;
      const jumlah = item.jumlah || 1;
      const subtotal = (hpp * jumlah) + sumbangan;
      const bagiHasil = item.newBagiHasil || 70;
      const bagianYayasan = Math.round((subtotal * bagiHasil) / 100 * 100) / 100;
      const bagianKoperasi = subtotal - bagianYayasan;
      const margin = sumbangan; // Laba kotor = sumbangan
      return { bagianYayasan, bagianKoperasi, margin, subtotal };
    } else {
      const subtotal = item.subtotal;
      const hpp = item.newHPP;
      const ownerType = item.owner_type || 'koperasi';
      
      if (ownerType === 'yayasan') {
        const bagiHasil = item.newBagiHasil || 70;
        const bagianYayasan = Math.round((subtotal * bagiHasil) / 100 * 100) / 100;
        const bagianKoperasi = subtotal - bagianYayasan;
        const margin = bagianKoperasi - hpp;
        return { bagianYayasan, bagianKoperasi, margin, subtotal };
      } else {
        const bagianKoperasi = subtotal;
        const margin = subtotal - hpp;
        return { bagianYayasan: 0, bagianKoperasi, margin, subtotal };
      }
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      
      if (saleType === 'inventaris') {
        const updates = items.map(item => ({
          saleItemId: item.id,
          hpp: item.newHPP,
          sumbangan: item.newSumbangan || 0,
          bagiHasilYayasan: item.newBagiHasil
        }));

        await updateBulkInventorySaleItemHPPAndProfitSharing(updates);
      } else {
        const updates = items.map(item => ({
          saleItemId: item.id,
          hpp: item.newHPP,
          bagiHasilYayasan: item.owner_type === 'yayasan' ? item.newBagiHasil : undefined
        }));

        await koperasiService.updateBulkSaleItemHPPAndProfitSharing(updates);
      }
      
      toast.success('HPP dan bagi hasil berhasil diperbarui');
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui';
      toast.error(`Gagal memperbarui: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalRevenue = items.reduce((sum, item) => {
    const calc = calculateProfitSharing(item);
    return sum + calc.subtotal;
  }, 0);
  const totalHPP = items.reduce((sum, item) => sum + (item.newHPP * (item.jumlah || 1)), 0);
  const totalProfit = items.reduce((sum, item) => {
    const calc = calculateProfitSharing(item);
    return sum + calc.margin;
  }, 0);
  const totalBagianYayasan = items.reduce((sum, item) => {
    const calc = calculateProfitSharing(item);
    return sum + calc.bagianYayasan;
  }, 0);
  const totalBagianKoperasi = items.reduce((sum, item) => {
    const calc = calculateProfitSharing(item);
    return sum + calc.bagianKoperasi;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Atur HPP dan Bagi Hasil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-gray-500">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-lg font-semibold">{formatCurrency(totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-gray-500">Total HPP</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-lg font-semibold">{formatCurrency(totalHPP)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-gray-500">Total Profit</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-lg font-semibold text-green-600">{formatCurrency(totalProfit)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-gray-500">Margin %</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-lg font-semibold">
                  {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profit Sharing Summary */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Ringkasan Bagi Hasil</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Bagian Yayasan:</span>
                  <span className="text-sm font-semibold text-blue-600">{formatCurrency(totalBagianYayasan)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Bagian Koperasi:</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(totalBagianKoperasi)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Item</TableHead>
                  <TableHead className="font-semibold text-right">Harga Jual</TableHead>
                  <TableHead className="font-semibold text-right">HPP</TableHead>
                  {saleType === 'inventaris' && (
                    <TableHead className="font-semibold text-right">Sumbangan</TableHead>
                  )}
                  <TableHead className="font-semibold text-right">Bagi Hasil %</TableHead>
                  <TableHead className="font-semibold text-right">Bagian Yayasan</TableHead>
                  <TableHead className="font-semibold text-right">Bagian Koperasi</TableHead>
                  <TableHead className="font-semibold text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const calc = calculateProfitSharing(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.nama_barang}</div>
                          <div className="text-xs text-gray-500">
                            {item.jumlah} unit
                            {saleType === 'inventaris' ? (
                              <span> × {formatCurrency(item.newHPP || 0)}</span>
                            ) : (
                              <span> × {formatCurrency(item.harga_satuan_jual || 0)}</span>
                            )}
                          </div>
                          {item.owner_type && saleType === 'koperasi' && (
                            <Badge variant={item.owner_type === 'yayasan' ? 'default' : 'secondary'} className="mt-1">
                              {item.owner_type === 'yayasan' ? 'Yayasan' : 'Koperasi'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(calc.subtotal)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.newHPP}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].newHPP = parseFloat(e.target.value) || 0;
                            setItems(newItems);
                          }}
                          className="w-32 text-right"
                          min="0"
                          step="100"
                        />
                      </TableCell>
                      {saleType === 'inventaris' && (
                        <TableCell>
                          <Input
                            type="number"
                            value={item.newSumbangan || 0}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].newSumbangan = parseFloat(e.target.value) || 0;
                              setItems(newItems);
                            }}
                            className="w-32 text-right"
                            min="0"
                            step="100"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        {saleType === 'inventaris' || item.owner_type === 'yayasan' ? (
                          <Input
                            type="number"
                            value={item.newBagiHasil || 70}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].newBagiHasil = parseFloat(e.target.value) || 70;
                              setItems(newItems);
                            }}
                            className="w-24 text-right"
                            min="0"
                            max="100"
                            step="1"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-blue-600 font-medium">{formatCurrency(calc.bagianYayasan)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-medium">{formatCurrency(calc.bagianKoperasi)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`${calc.margin >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                          {formatCurrency(calc.margin)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditHPPAndProfitSharingDialog;

