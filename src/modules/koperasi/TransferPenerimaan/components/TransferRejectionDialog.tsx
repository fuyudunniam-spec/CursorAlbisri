import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Package } from 'lucide-react';
import { rejectTransfer } from '@/services/inventaris-transfer.service';
import type { TransferWithItem } from '@/types/transfer.types';

interface TransferRejectionDialogProps {
  transfer: TransferWithItem | null;
  open: boolean;
  onClose: () => void;
}

export default function TransferRejectionDialog({
  transfer,
  open,
  onClose
}: TransferRejectionDialogProps) {
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setReason('');
      setShowConfirmation(false);
    }
  }, [open]);

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!transfer) throw new Error('Transfer tidak ditemukan');
      if (!reason.trim()) throw new Error('Alasan penolakan harus diisi');
      
      await rejectTransfer(transfer.id, reason);
    },
    onSuccess: () => {
      toast.success('Transfer berhasil ditolak. Stok telah dikembalikan ke inventaris yayasan.');
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventaris'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-history'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal menolak transfer');
    }
  });

  const handleClose = () => {
    setReason('');
    setShowConfirmation(false);
    onClose();
  };

  const handleReject = () => {
    if (!reason.trim()) {
      toast.error('Alasan penolakan harus diisi');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmReject = () => {
    rejectMutation.mutate();
  };

  if (!transfer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Tolak Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer yang ditolak akan mengembalikan stok ke inventaris yayasan
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          // Step 1: Input reason
          <div className="space-y-4">
            {/* Transfer Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div className="font-semibold">{transfer.item_name}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                Jumlah: {transfer.jumlah} {transfer.item_satuan || 'unit'}
              </div>
            </div>

            {/* Reason Input */}
            <div>
              <Label htmlFor="reason">Alasan Penolakan *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan transfer ini..."
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alasan ini akan dicatat dalam riwayat transfer
              </p>
            </div>
          </div>
        ) : (
          // Step 2: Confirmation
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
              <div className="font-semibold text-destructive">Konfirmasi Penolakan</div>
              <p className="text-sm">
                Anda akan menolak transfer <strong>{transfer.item_name}</strong> sebanyak{' '}
                <strong>{transfer.jumlah} {transfer.item_satuan || 'unit'}</strong>.
              </p>
              <p className="text-sm">
                Stok akan dikembalikan ke inventaris yayasan.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm font-medium mb-1">Alasan Penolakan:</div>
              <div className="text-sm text-muted-foreground italic">"{reason}"</div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!showConfirmation ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Batal
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!reason.trim()}
              >
                Lanjutkan
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                disabled={rejectMutation.isPending}
              >
                Kembali
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Memproses...' : 'Ya, Tolak Transfer'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
