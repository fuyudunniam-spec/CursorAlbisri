import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Package } from 'lucide-react';
import type { MultiItemSaleDetail, InventoryTransaction } from '@/types/inventaris.types';

type SaleDetailModalProps = {
  sale: MultiItemSaleDetail | InventoryTransaction | null;
  onClose: () => void;
};

/**
 * Modal component to display detailed information about a sale transaction.
 * Supports both single-item (InventoryTransaction) and multi-item (MultiItemSaleDetail) sales.
 */
const SaleDetailModal: React.FC<SaleDetailModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  // Check if this is a multi-item sale
  const isMultiItem = 'items' in sale && Array.isArray(sale.items);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Detail Transaksi Penjualan</CardTitle>
              {isMultiItem && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {(sale as MultiItemSaleDetail).items.length} items
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isMultiItem ? (
            <MultiItemSaleView sale={sale as MultiItemSaleDetail} />
          ) : (
            <SingleItemSaleView sale={sale as InventoryTransaction} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * View component for multi-item sales
 */
const MultiItemSaleView: React.FC<{ sale: MultiItemSaleDetail }> = ({ sale }) => {
  return (
    <div className="space-y-6">
      {/* Transaction Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Pembeli</Label>
          <p className="font-medium">{sale.pembeli}</p>
        </div>
        <div>
          <Label>Tanggal</Label>
          <p className="font-medium">{sale.tanggal}</p>
        </div>
        {sale.catatan && (
          <div className="col-span-2">
            <Label>Catatan</Label>
            <p className="text-sm text-muted-foreground">{sale.catatan}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div>
        <Label className="mb-2 block">Item yang Dijual</Label>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Harga Dasar</th>
                <th className="text-right p-3 font-medium">Sumbangan</th>
                <th className="text-right p-3 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={item.id || index} className="border-t">
                  <td className="p-3">{item.nama_barang}</td>
                  <td className="p-3 text-right">{item.jumlah}</td>
                  <td className="p-3 text-right">
                    Rp {Math.round(item.harga_dasar).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right">
                    Rp {Math.round(item.sumbangan).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right font-medium">
                    Rp {Math.round(item.subtotal).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Harga Dasar:</span>
              <span>Rp {Math.round(sale.total_harga_dasar).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Sumbangan:</span>
              <span>Rp {Math.round(sale.total_sumbangan).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between font-medium text-lg border-t pt-2">
              <span>Grand Total:</span>
              <span className="text-green-600">
                Rp {Math.round(sale.grand_total).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * View component for single-item sales (backward compatibility)
 */
const SingleItemSaleView: React.FC<{ sale: InventoryTransaction }> = ({ sale }) => {
  const total = sale.total_nilai || ((sale.jumlah || 0) * (sale.harga_satuan || 0));
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Item</Label>
          <p className="font-medium">{sale.nama_barang}</p>
        </div>
        <div>
          <Label>Jumlah</Label>
          <p className="font-medium">{sale.jumlah} unit</p>
        </div>
        <div>
          <Label>Harga Satuan</Label>
          <p className="font-medium">
            Rp {Math.round(sale.harga_satuan || 0).toLocaleString('id-ID')}
          </p>
        </div>
        <div>
          <Label>Sumbangan</Label>
          <p className="font-medium">
            Rp {Math.round(sale.sumbangan || 0).toLocaleString('id-ID')}
          </p>
        </div>
        <div>
          <Label>Total</Label>
          <p className="font-medium text-green-600">
            Rp {Math.round(total).toLocaleString('id-ID')}
          </p>
        </div>
        <div>
          <Label>Pembeli</Label>
          <p className="font-medium">{sale.penerima || '-'}</p>
        </div>
        <div>
          <Label>Tanggal</Label>
          <p className="font-medium">{sale.tanggal}</p>
        </div>
        <div>
          <Label>Catatan</Label>
          <p className="text-sm text-muted-foreground">{sale.catatan || '-'}</p>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;
