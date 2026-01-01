import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditStatusPembayaranDialogProps {
  open: boolean;
  onClose: () => void;
  penjualan: {
    id: string;
    total_transaksi: number;
    status_pembayaran: string;
    total_bayar?: number;
    sisa_hutang?: number;
    jumlah_hutang?: number;
    metode_pembayaran: 'cash' | 'transfer';
    tanggal_jatuh_tempo?: string;
  };
}

export default function EditStatusPembayaranDialog({
  open,
  onClose,
  penjualan,
}: EditStatusPembayaranDialogProps) {
  const [statusPembayaran, setStatusPembayaran] = useState<'lunas' | 'hutang' | 'cicilan'>('lunas');
  const [metodeBayar, setMetodeBayar] = useState<'cash' | 'transfer'>('cash');
  const [jumlahBayar, setJumlahBayar] = useState(0);
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState('');
  const queryClient = useQueryClient();

  // Initialize form dengan data penjualan
  useEffect(() => {
    if (open && penjualan) {
      setStatusPembayaran((penjualan.status_pembayaran as 'lunas' | 'hutang' | 'cicilan') || 'lunas');
      setMetodeBayar(penjualan.metode_pembayaran || 'cash');
      setJumlahBayar(penjualan.total_bayar || 0);
      setTanggalJatuhTempo(penjualan.tanggal_jatuh_tempo || '');
    }
  }, [open, penjualan]);

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const total = penjualan.total_transaksi || 0;
      const updateData: any = {
        status_pembayaran: statusPembayaran,
        metode_pembayaran: metodeBayar,
        updated_at: new Date().toISOString(),
      };

      if (statusPembayaran === 'lunas') {
        // Jika lunas, set semua pembayaran ke total
        updateData.total_bayar = total;
        updateData.jumlah_hutang = 0;
        updateData.sisa_hutang = 0;
        updateData.tanggal_jatuh_tempo = null;
      } else if (statusPembayaran === 'hutang') {
        // Jika hutang, validasi jumlah bayar
        if (jumlahBayar < 0) {
          throw new Error('Jumlah bayar tidak boleh negatif');
        }
        if (jumlahBayar >= total) {
          throw new Error('Untuk pembayaran penuh, pilih status "Lunas"');
        }
        
        const sisaHutang = total - jumlahBayar;
        updateData.total_bayar = jumlahBayar;
        updateData.jumlah_hutang = sisaHutang;
        updateData.sisa_hutang = sisaHutang;
        updateData.tanggal_jatuh_tempo = tanggalJatuhTempo || null;
      } else if (statusPembayaran === 'cicilan') {
        // Jika cicilan, jumlah bayar harus > 0 dan < total
        if (jumlahBayar <= 0) {
          throw new Error('Jumlah bayar harus lebih dari 0 untuk cicilan');
        }
        if (jumlahBayar >= total) {
          throw new Error('Untuk pembayaran penuh, pilih status "Lunas"');
        }
        
        const sisaHutang = total - jumlahBayar;
        updateData.total_bayar = jumlahBayar;
        updateData.jumlah_hutang = sisaHutang;
        updateData.sisa_hutang = sisaHutang;
        updateData.tanggal_jatuh_tempo = tanggalJatuhTempo || null;
      }

      const { error } = await supabase
        .from('kop_penjualan')
        .update(updateData)
        .eq('id', penjualan.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan-list'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan-stats'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan-chart'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan-hutang-summary'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan-cicilan-summary'] });
      toast.success('Status pembayaran berhasil diperbarui');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal memperbarui status pembayaran');
    },
  });

  const handleSubmit = () => {
    if (statusPembayaran === 'hutang' || statusPembayaran === 'cicilan') {
      if (jumlahBayar < 0) {
        toast.error('Jumlah bayar tidak boleh negatif');
        return;
      }
      if (jumlahBayar >= penjualan.total_transaksi) {
        toast.error('Untuk pembayaran penuh, pilih status "Lunas"');
        return;
      }
    }
    updateStatusMutation.mutate();
  };

  const total = penjualan.total_transaksi || 0;
  const sisaHutang = statusPembayaran === 'lunas' ? 0 : total - jumlahBayar;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Status Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded space-y-2">
            <div className="flex justify-between">
              <span>Total Transaksi:</span>
              <span className="font-semibold">Rp {total.toLocaleString('id-ID')}</span>
            </div>
            {penjualan.total_bayar !== undefined && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Sudah Dibayar:</span>
                <span>Rp {(penjualan.total_bayar || 0).toLocaleString('id-ID')}</span>
              </div>
            )}
            {(penjualan.sisa_hutang || penjualan.jumlah_hutang) && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Sisa Hutang:</span>
                <span>Rp {(penjualan.sisa_hutang || penjualan.jumlah_hutang || 0).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          <div>
            <Label>Status Pembayaran</Label>
            <RadioGroup value={statusPembayaran} onValueChange={(v: any) => {
              setStatusPembayaran(v);
              if (v === 'lunas') {
                setJumlahBayar(total);
              } else if (v === 'hutang') {
                setJumlahBayar(0);
              } else {
                // cicilan - keep current payment
                setJumlahBayar(penjualan.total_bayar || 0);
              }
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lunas" id="lunas" />
                <Label htmlFor="lunas">Lunas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hutang" id="hutang" />
                <Label htmlFor="hutang">Hutang</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cicilan" id="cicilan" />
                <Label htmlFor="cicilan">Cicilan</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Metode Pembayaran</Label>
            <RadioGroup value={metodeBayar} onValueChange={(v: any) => setMetodeBayar(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash">Cash</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer">Transfer</Label>
              </div>
            </RadioGroup>
          </div>

          {(statusPembayaran === 'hutang' || statusPembayaran === 'cicilan') && (
            <>
              <div>
                <Label>Jumlah Bayar {statusPembayaran === 'hutang' ? '(Opsional)' : ''}</Label>
                <Input
                  type="number"
                  value={jumlahBayar}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setJumlahBayar(Math.min(Math.max(0, value), total));
                  }}
                  placeholder="0"
                  min="0"
                  max={total}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sisa hutang: Rp {sisaHutang.toLocaleString('id-ID')}
                  {statusPembayaran === 'hutang' && jumlahBayar === 0 && ' (Belum ada pembayaran)'}
                </p>
              </div>
              <div>
                <Label>Tanggal Jatuh Tempo (Opsional)</Label>
                <Input
                  type="date"
                  value={tanggalJatuhTempo}
                  onChange={(e) => setTanggalJatuhTempo(e.target.value)}
                />
              </div>
            </>
          )}

          {statusPembayaran === 'lunas' && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded">
              <p className="text-sm">Transaksi akan diubah menjadi Lunas (Pembayaran Penuh)</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}






















