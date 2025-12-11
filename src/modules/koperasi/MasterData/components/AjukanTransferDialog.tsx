import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AjukanTransferDialogProps {
  open: boolean;
  onClose: () => void;
  item: {
    id: string;
    nama_barang: string;
    jumlah: number;
    satuan: string;
    harga_perolehan: number | null;
  } | null;
}

export default function AjukanTransferDialog({
  open,
  onClose,
  item,
}: AjukanTransferDialogProps) {
  const queryClient = useQueryClient();
  const [qty, setQty] = useState<string>('');
  const [usulanHpp, setUsulanHpp] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open && item) {
      setQty('');
      setUsulanHpp(item.harga_perolehan?.toString() || '0');
      setCatatan('');
    }
  }, [open, item]);

  const createPengajuanMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('Item tidak dipilih');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User tidak terautentikasi');

      const qtyNum = parseInt(qty);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new Error('Qty harus lebih besar dari 0');
      }

      if (qtyNum > (item.jumlah || 0)) {
        throw new Error(`Stok tidak mencukupi. Tersedia: ${item.jumlah || 0}`);
      }

      const usulanHppNum = parseFloat(usulanHpp) || 0;
      const nilaiPerolehan = item.harga_perolehan || 0;

      // Check if there's already a pending pengajuan for this item
      const { data: existingPengajuan, error: checkError } = await supabase
        .from('pengajuan_item_yayasan')
        .select('id, status')
        .eq('inventaris_item_id', item.id)
        .eq('status', 'pending_koperasi')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingPengajuan) {
        // Update existing pending pengajuan instead of creating new one
        const { error } = await supabase
          .from('pengajuan_item_yayasan')
          .update({
            qty: qtyNum,
            nilai_perolehan: nilaiPerolehan,
            usulan_hpp: usulanHppNum,
            status: 'pending_koperasi', // Reset to pending if it was rejected
            created_by: user.id,
          })
          .eq('id', existingPengajuan.id);

        if (error) throw error;
      } else {
        // Create new pengajuan_item_yayasan
        // Note: catatan field tidak ada di tabel, hanya ada catatan_approval (untuk admin saat approve)
        const { error } = await supabase
          .from('pengajuan_item_yayasan')
          .insert({
            inventaris_item_id: item.id,
            nama: item.nama_barang,
            qty: qtyNum,
            nilai_perolehan: nilaiPerolehan,
            usulan_hpp: usulanHppNum,
            status: 'pending_koperasi',
            created_by: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan-item-yayasan-pending'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
      toast.success('Pengajuan berhasil dibuat. Menunggu approval dari admin koperasi.');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal membuat pengajuan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPengajuanMutation.mutate();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajukan Transfer ke Koperasi</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="font-semibold">{item.nama_barang}</div>
            <div className="text-sm text-muted-foreground">
              Stok tersedia: <span className="font-medium">{item.jumlah || 0} {item.satuan}</span>
            </div>
            {item.harga_perolehan && (
              <div className="text-sm text-muted-foreground">
                Nilai perolehan: <span className="font-medium">Rp {item.harga_perolehan.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Qty */}
          <div>
            <Label>Qty yang Diajukan *</Label>
            <Input
              type="number"
              min="1"
              max={item.jumlah || 0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Masukkan jumlah"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maksimal: {item.jumlah || 0} {item.satuan}
            </p>
          </div>

          {/* Usulan HPP */}
          <div>
            <Label>Usulan HPP Koperasi *</Label>
            <Input
              type="number"
              min="0"
              value={usulanHpp}
              onChange={(e) => setUsulanHpp(e.target.value)}
              placeholder="0"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Boleh 0 jika item hibah/donasi. Admin koperasi bisa mengubah saat approval.
            </p>
          </div>

          {/* Catatan */}
          <div>
            <Label>Catatan (Opsional)</Label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Catatan tambahan..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createPengajuanMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createPengajuanMutation.isPending || !qty || !usulanHpp}
            >
              {createPengajuanMutation.isPending ? 'Mengajukan...' : 'Ajukan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

