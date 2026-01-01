import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface PembayaranHutangPenjualanDialogProps {
  open: boolean;
  onClose: () => void;
  penjualan: any;
}

export default function PembayaranHutangPenjualanDialog({ 
  open, 
  onClose, 
  penjualan 
}: PembayaranHutangPenjualanDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    tanggal_bayar: new Date().toISOString().split('T')[0],
    jumlah_bayar: 0,
    metode_pembayaran: 'cash',
    catatan: '',
  });

  // Fetch payment history
  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['koperasi-payment-history-penjualan', penjualan?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_pembayaran_hutang_penjualan')
        .select('*')
        .eq('penjualan_id', penjualan.id)
        .order('tanggal_bayar', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!penjualan?.id,
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const jumlahBayar = Number(data.jumlah_bayar);
      const sisaHutangSebelum = Number(penjualan.sisa_hutang || penjualan.jumlah_hutang || 0);

      if (jumlahBayar <= 0) {
        throw new Error('Jumlah pembayaran harus lebih dari 0');
      }

      if (jumlahBayar > sisaHutangSebelum) {
        throw new Error('Jumlah pembayaran melebihi sisa hutang');
      }

      const sisaHutangSetelah = sisaHutangSebelum - jumlahBayar;
      const totalBayarBaru = Number(penjualan.total_bayar || 0) + jumlahBayar;

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('kop_pembayaran_hutang_penjualan')
        .insert({
          penjualan_id: penjualan.id,
          tanggal_bayar: data.tanggal_bayar,
          jumlah_bayar: jumlahBayar,
          metode_pembayaran: data.metode_pembayaran,
          sisa_hutang_setelah: sisaHutangSetelah,
          catatan: data.catatan,
          created_by: user?.id,
        });

      if (paymentError) throw paymentError;

      // Update penjualan (trigger akan handle status_pembayaran dan sisa_hutang)
      const { error: updateError } = await supabase
        .from('kop_penjualan')
        .update({
          total_bayar: totalBayarBaru,
          sisa_hutang: sisaHutangSetelah,
          jumlah_hutang: sisaHutangSetelah,
          updated_at: new Date().toISOString(),
        })
        .eq('id', penjualan.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan-list'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-payment-history-penjualan'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan-summary'] });
      toast.success('Pembayaran berhasil dicatat');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mencatat pembayaran');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    paymentMutation.mutate(formData);
  };

  const handleBayarPenuh = () => {
    const sisaHutang = Number(penjualan.sisa_hutang || penjualan.jumlah_hutang || 0);
    setFormData({ ...formData, jumlah_bayar: sisaHutang });
  };

  useEffect(() => {
    if (open) {
      setFormData({
        tanggal_bayar: new Date().toISOString().split('T')[0],
        jumlah_bayar: 0,
        metode_pembayaran: 'cash',
        catatan: '',
      });
    }
  }, [open]);

  if (!penjualan) return null;

  const sisaHutang = Number(penjualan.sisa_hutang || penjualan.jumlah_hutang || 0);
  const totalBayar = Number(penjualan.total_bayar || 0);
  const totalTransaksi = Number(penjualan.total_transaksi || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pembayaran Hutang Penjualan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Penjualan */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">No. Struk:</span>
              <span className="font-mono">{penjualan.nomor_struk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tanggal:</span>
              <span>{format(new Date(penjualan.tanggal), 'dd MMM yyyy', { locale: localeId })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Transaksi:</span>
              <span>Rp {totalTransaksi.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sudah Dibayar:</span>
              <span className="text-green-600">Rp {totalBayar.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Sisa Hutang:</span>
              <span className="font-bold text-destructive">
                Rp {sisaHutang.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <div>
              <Label className="mb-2 block">Riwayat Pembayaran</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {paymentHistory.map((payment: any) => (
                  <div key={payment.id} className="text-sm p-2 border rounded flex justify-between">
                    <span>{format(new Date(payment.tanggal_bayar), 'dd MMM yyyy', { locale: localeId })}</span>
                    <span className="font-semibold">Rp {Number(payment.jumlah_bayar).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tanggal Bayar *</Label>
              <Input
                type="date"
                value={formData.tanggal_bayar}
                onChange={(e) => setFormData({ ...formData, tanggal_bayar: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Jumlah Bayar *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.jumlah_bayar}
                  onChange={(e) => setFormData({ ...formData, jumlah_bayar: Number(e.target.value) })}
                  min="0"
                  max={sisaHutang}
                  required
                />
                <Button type="button" variant="outline" onClick={handleBayarPenuh}>
                  Bayar Penuh
                </Button>
              </div>
            </div>

            <div>
              <Label>Metode Pembayaran *</Label>
              <Select
                value={formData.metode_pembayaran}
                onValueChange={(value) => setFormData({ ...formData, metode_pembayaran: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Catatan</Label>
              <Textarea
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? 'Menyimpan...' : 'Simpan Pembayaran'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

















