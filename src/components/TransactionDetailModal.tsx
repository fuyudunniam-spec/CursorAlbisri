import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, Eye, Edit, Trash2, Calendar, DollarSign, Building2, User, FileText } from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (transaction: any) => void;
  onDelete?: (transaction: any) => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Posted': { color: 'bg-green-100 text-green-800', label: 'Posted' },
      'Pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'Draft': { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'Cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Draft'];
    return <Badge className={config.color} variant="secondary">{config.label}</Badge>;
  };

  const getTransactionIcon = (jenis: string) => {
    return jenis === 'Pemasukan' ? 
      <DollarSign className="h-5 w-5 text-green-600" /> : 
      <DollarSign className="h-5 w-5 text-red-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTransactionIcon(transaction.jenis_transaksi)}
            Detail Transaksi
            <Badge 
              className={transaction.jenis_transaksi === 'Pemasukan' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'}
            >
              {transaction.jenis_transaksi}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{transaction.kategori}</CardTitle>
                {getStatusBadge(transaction.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tanggal:</span>
                  <span className="font-medium">{formatDate(transaction.tanggal)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Akun:</span>
                  <span className="font-medium">{transaction.akun_kas_nama || 'Kas Utama'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Jumlah:</span>
                  <span className={`font-bold text-lg ${
                    transaction.jenis_transaksi === 'Pemasukan' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(transaction.jumlah)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{transaction.id}</span>
                </div>
              </div>

              {(transaction.deskripsi || transaction.sub_kategori || transaction.penerima_pembayar) && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Deskripsi:</span>
                    <p className="mt-1 text-sm">
                      {transaction.deskripsi || transaction.sub_kategori || transaction.penerima_pembayar || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Rincian Items (if any) - Format Nota */}
          {transaction.rincian_items && transaction.rincian_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Rincian Nota
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Header Nota */}
                  <div className="border-b pb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">No. Transaksi:</span>
                      <span className="font-mono text-sm">{transaction.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tanggal:</span>
                      <span className="text-sm">{formatDate(transaction.tanggal)}</span>
                    </div>
                    {transaction.penerima_pembayar && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Penerima/Pembayar:</span>
                        <span className="text-sm font-medium">{transaction.penerima_pembayar}</span>
                      </div>
                    )}
                  </div>

                  {/* Table Rincian Items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Nama Item</th>
                          <th className="text-center py-2 font-medium">Jumlah</th>
                          <th className="text-center py-2 font-medium">Satuan</th>
                          <th className="text-right py-2 font-medium">Harga Satuan</th>
                          <th className="text-right py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transaction.rincian_items.map((item: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">
                              <div>
                                <p className="font-medium">{item.nama_item || 'Item'}</p>
                                {item.keterangan && (
                                  <p className="text-xs text-muted-foreground">{item.keterangan}</p>
                                )}
                              </div>
                            </td>
                            <td className="text-center py-2">{item.jumlah || 0}</td>
                            <td className="text-center py-2">{item.satuan || 'unit'}</td>
                            <td className="text-right py-2">{formatCurrency(item.harga_satuan || 0)}</td>
                            <td className="text-right py-2 font-semibold">
                              {formatCurrency(item.total || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td colSpan={4} className="text-right py-2">Subtotal:</td>
                          <td className="text-right py-2">
                            {formatCurrency(transaction.jumlah)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alokasi Santri (if any) */}
          {transaction.alokasi_santri && transaction.alokasi_santri.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Alokasi ke Santri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transaction.alokasi_santri.map((alokasi: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium">{alokasi.santri?.nama_lengkap || 'Santri'}</p>
                        <p className="text-sm text-muted-foreground">
                          {alokasi.santri?.id_santri || alokasi.santri?.nisn} • {alokasi.jenis_bantuan}
                        </p>
                        {alokasi.catatan && (
                          <p className="text-xs text-muted-foreground mt-1">{alokasi.catatan}</p>
                        )}
                      </div>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(alokasi.nominal_alokasi)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Sistem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Dibuat:</span>
                  <p className="font-medium">{formatDate(transaction.created_at)}</p>
                </div>
                {transaction.updated_at && (
                  <div>
                    <span className="text-muted-foreground">Diperbarui:</span>
                    <p className="font-medium">{formatDate(transaction.updated_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Tutup
          </Button>
          {onEdit && (
            <Button onClick={() => onEdit(transaction)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="destructive" 
              onClick={() => onDelete(transaction)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailModal;
