import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { koperasiService } from "@/services/koperasi.service";
import { toast } from "sonner";
import type { KasirCartItem } from "@/types/koperasi.types";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  cart: KasirCartItem[];
  subtotal: number;
  totalDiskon: number;
  total: number;
  shiftId: string | null; // Bisa null untuk mode sederhana
  kasirId: string;
  onSuccess: () => void;
}

export default function PaymentDialog({
  open,
  onClose,
  cart,
  subtotal,
  totalDiskon,
  total,
  shiftId,
  kasirId,
  onSuccess,
}: PaymentDialogProps) {
  const [metodeBayar, setMetodeBayar] = useState<'cash' | 'transfer'>('cash');
  const [jumlahBayar, setJumlahBayar] = useState(0);

  const kembalian = jumlahBayar - total;

  const createPenjualanMutation = useMutation({
    mutationFn: async () => {
      const noPenjualan = await koperasiService.generateNoPenjualan();
      
      return koperasiService.createPenjualan({
        no_penjualan: noPenjualan,
        tanggal: new Date().toISOString(),
        shift_id: shiftId || undefined, // Opsional untuk mode sederhana
        kasir_id: kasirId,
        subtotal,
        diskon: totalDiskon,
        total,
        metode_bayar: metodeBayar,
        jumlah_bayar: jumlahBayar,
        kembalian: metodeBayar === 'cash' ? kembalian : 0,
        items: cart.map(item => ({
          produk_id: item.produk_id,
          jumlah: item.jumlah,
          harga_jual: item.harga_jual,
          harga_beli: item.harga_beli,
          diskon: item.diskon || 0,
          sumber_modal_id: item.sumber_modal_id,
          price_type: item.price_type || 'ecer',
        })),
      });
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil');
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan transaksi');
    },
  });

  const resetForm = () => {
    setMetodeBayar('cash');
    setJumlahBayar(0);
  };

  const handleSubmit = () => {
    if (metodeBayar === 'cash' && jumlahBayar < total) {
      toast.error('Jumlah bayar kurang');
      return;
    }
    if (metodeBayar === 'transfer' && jumlahBayar !== total) {
      setJumlahBayar(total);
    }
    createPenjualanMutation.mutate();
  };

  const handleQuickAmount = (amount: number) => {
    setJumlahBayar(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Diskon:</span>
              <span>- Rp {totalDiskon.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>TOTAL:</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
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

          {metodeBayar === 'cash' && (
            <>
              <div>
                <Label>Jumlah Bayar</Label>
                <Input
                  type="number"
                  value={jumlahBayar}
                  onChange={(e) => setJumlahBayar(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleQuickAmount(total)}
                  size="sm"
                >
                  Pas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickAmount(Math.ceil(total / 50000) * 50000)}
                  size="sm"
                >
                  50K
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickAmount(Math.ceil(total / 100000) * 100000)}
                  size="sm"
                >
                  100K
                </Button>
              </div>

              {jumlahBayar > 0 && (
                <div className={`p-3 rounded ${
                  kembalian >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <div className="flex justify-between font-semibold">
                    <span>Kembalian:</span>
                    <span>Rp {kembalian.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {metodeBayar === 'transfer' && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded">
              <p className="text-sm">Transfer: Rp {total.toLocaleString('id-ID')}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPenjualanMutation.isPending || (metodeBayar === 'cash' && jumlahBayar < total)}
            >
              Proses Pembayaran
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



