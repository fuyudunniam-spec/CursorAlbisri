import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TransferWithItem } from '@/types/transfer.types';
import { CheckCircle2, AlertCircle, Calculator } from 'lucide-react';

interface TransferApprovalDialogProps {
  transfer: TransferWithItem | null;
  open: boolean;
  onClose: () => void;
}

export default function TransferApprovalDialog({
  transfer,
  open,
  onClose
}: TransferApprovalDialogProps) {
  const [kondisiBarang, setKondisiBarang] = useState<'baik' | 'rusak'>('baik');
  const [hargaJual, setHargaJual] = useState<number>(0);
  const [catatan, setCatatan] = useState('');
  const queryClient = useQueryClient();

  // Reset form when dialog opens with new transfer
  useEffect(() => {
    if (transfer && open) {
      setKondisiBarang('baik');
      // Set default harga jual from HPP with 10% margin for good condition
      const hpp = transfer.hpp_yayasan || 0;
      const defaultHarga = hpp > 0 
        ? Math.ceil(hpp * 1.1 / 100) * 100 // Round up to nearest 100
        : 0;
      setHargaJual(defaultHarga);
      setCatatan('');
    }
  }, [transfer, open]);

  // Get HPP from transfer or inventaris
  const hpp = transfer?.hpp_yayasan || transfer?.item_harga_perolehan || 0;
  const jumlah = transfer?.jumlah || 0;
  const totalNilai = hargaJual * jumlah;
  const margin = kondisiBarang === 'baik' && hpp > 0 ? (hargaJual - hpp) * jumlah : 0;
  const marginPersen = kondisiBarang === 'baik' && hpp > 0 && hargaJual > 0 
    ? ((hargaJual - hpp) / hpp * 100).toFixed(1) 
    : '0';

  // Calculate profit sharing for rusak
  const koperasiShare = kondisiBarang === 'rusak' ? totalNilai * 0.30 : 0;
  const yayasanShare = kondisiBarang === 'rusak' ? totalNilai * 0.70 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!transfer) throw new Error('Transfer tidak ditemukan');
      
      // Validation
      if (kondisiBarang === 'baik') {
        if (hargaJual <= 0) {
          throw new Error('Harga jual harus lebih besar dari 0');
        }
        if (hpp > 0 && hargaJual < hpp) {
          throw new Error(`Harga jual harus lebih besar atau sama dengan HPP (${formatCurrency(hpp)}) untuk barang baik`);
        }
      } else {
        // Barang rusak: harga jual wajib diisi
        if (hargaJual <= 0) {
          throw new Error('Harga jual harus diisi untuk barang rusak');
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .rpc('process_transfer_to_koperasi', {
          p_transfer_id: transfer.id,
          p_harga_jual: hargaJual,
          p_kondisi_barang: kondisiBarang,
          p_user_id: userId
        });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Gagal memproses transfer');
      }
    },
    onSuccess: () => {
      toast.success('Transfer berhasil diproses');
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-history'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-summary'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal memproses transfer');
    }
  });

  const handleClose = () => {
    setKondisiBarang('baik');
    setHargaJual(0);
    setCatatan('');
    onClose();
  };

  if (!transfer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Proses Transfer Barang</DialogTitle>
          <DialogDescription>
            Tentukan kondisi barang dan harga jual untuk {transfer.item_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Info */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{transfer.item_name}</span>
                <Badge variant="outline">{transfer.jumlah} {transfer.item_satuan || 'unit'}</Badge>
              </div>
              {hpp > 0 && (
                <div className="text-sm text-muted-foreground">
                  HPP Yayasan: <span className="font-medium">{formatCurrency(hpp)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Kondisi Barang */}
          <div>
            <Label htmlFor="kondisi">Kondisi Barang *</Label>
            <Select value={kondisiBarang} onValueChange={(value: 'baik' | 'rusak') => setKondisiBarang(value)}>
              <SelectTrigger id="kondisi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baik">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Baik</span>
                  </div>
                </SelectItem>
                <SelectItem value="rusak">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span>Rusak</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {kondisiBarang === 'baik' 
                ? 'Barang dalam kondisi baik. HPP akan dibayar saat penjualan, margin masuk ke kas koperasi.'
                : 'Barang rusak. 30% untuk koperasi (biaya operasional), 70% untuk yayasan.'}
            </p>
          </div>

          {/* Harga Jual */}
          <div>
            <Label htmlFor="harga-jual">Harga Jual per Unit *</Label>
            <Input
              id="harga-jual"
              type="number"
              value={hargaJual || ''}
              onChange={(e) => setHargaJual(parseFloat(e.target.value) || 0)}
              placeholder="Masukkan harga jual"
              min={kondisiBarang === 'baik' && hpp > 0 ? hpp : 0}
              step={100}
            />
            {kondisiBarang === 'baik' && hpp > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: {formatCurrency(hpp)}
                {hargaJual > 0 && hargaJual >= hpp && (
                  <span className="ml-2 text-green-600">
                    • Margin: {marginPersen}%
                  </span>
                )}
                {hargaJual > 0 && hargaJual < hpp && (
                  <span className="ml-2 text-red-600">
                    • Harga jual harus ≥ HPP
                  </span>
                )}
              </p>
            )}
            {kondisiBarang === 'rusak' && (
              <p className="text-xs text-muted-foreground mt-1">
                Harga jual wajib diisi untuk barang rusak
              </p>
            )}
          </div>

          {/* Preview Profit Sharing */}
          {hargaJual > 0 && (
            <Card className={`p-4 ${kondisiBarang === 'baik' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4" />
                <span className="font-semibold">Preview Alokasi</span>
              </div>
              
              {kondisiBarang === 'baik' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Penjualan:</span>
                    <span className="font-semibold">{formatCurrency(totalNilai)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">HPP (dibayar ke Yayasan):</span>
                    <span>{formatCurrency(hpp * jumlah)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Margin (Kas Koperasi):</span>
                    <span className="font-medium text-green-700">{formatCurrency(margin)}</span>
                  </div>
                  <div className="pt-2 border-t border-green-200">
                    <p className="text-xs text-green-700">
                      HPP akan dibayar ke yayasan saat barang terjual. Margin (harga jual - HPP) masuk ke kas koperasi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Penjualan:</span>
                    <span className="font-semibold">{formatCurrency(totalNilai)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Koperasi (30% - Biaya Operasional):</span>
                    <span className="font-medium text-orange-700">{formatCurrency(koperasiShare)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Yayasan (70%):</span>
                    <span className="font-medium text-orange-700">{formatCurrency(yayasanShare)}</span>
                  </div>
                  <div className="pt-2 border-t border-orange-200">
                    <p className="text-xs text-orange-700">
                      Alokasi akan dibayar saat barang terjual.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Catatan */}
          <div>
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tambahkan catatan jika diperlukan"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={approveMutation.isPending}>
            Batal
          </Button>
          <Button 
            onClick={() => approveMutation.mutate()} 
            disabled={approveMutation.isPending || hargaJual <= 0 || (kondisiBarang === 'baik' && hpp > 0 && hargaJual < hpp)}
          >
            {approveMutation.isPending ? 'Memproses...' : 'Proses Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}