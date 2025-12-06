import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { koperasiService } from "@/services/koperasi.service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, DoorOpen, DoorClosed } from "lucide-react";

interface ShiftControlProps {
  activeShift?: any;
  onShiftChange: () => void;
}

export default function ShiftControl({ activeShift, onShiftChange }: ShiftControlProps) {
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [saldoAwal, setSaldoAwal] = useState(0);
  const [saldoAkhir, setSaldoAkhir] = useState(0);

  const openShiftMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('User not found');
      return koperasiService.openShift(data.user.id, saldoAwal);
    },
    onSuccess: () => {
      toast.success('Shift berhasil dibuka');
      setOpenDialog(false);
      setSaldoAwal(0);
      onShiftChange();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal membuka shift');
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: () => koperasiService.closeShift(activeShift.id, saldoAkhir),
    onSuccess: () => {
      toast.success('Shift berhasil ditutup');
      setCloseDialog(false);
      setSaldoAkhir(0);
      onShiftChange();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menutup shift');
    },
  });

  if (!activeShift) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Shift Kasir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <DoorClosed className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Shift belum dibuka</p>
              <Button onClick={() => setOpenDialog(true)}>
                <DoorOpen className="w-4 h-4 mr-2" />
                Buka Shift
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buka Shift Kasir</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Saldo Awal</Label>
                <Input
                  type="number"
                  value={saldoAwal}
                  onChange={(e) => setSaldoAwal(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Batal
                </Button>
                <Button onClick={() => openShiftMutation.mutate()} disabled={openShiftMutation.isPending}>
                  Buka Shift
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setCloseDialog(true)}>
        <DoorClosed className="w-4 h-4 mr-2" />
        Tutup Shift
      </Button>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Shift Kasir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded space-y-2">
              <div className="flex justify-between">
                <span>Saldo Awal:</span>
                <span className="font-semibold">Rp {activeShift.saldo_awal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Penjualan:</span>
                <span className="font-semibold">Rp {activeShift.total_penjualan.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Transaksi:</span>
                <span className="font-semibold">{activeShift.total_transaksi}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Seharusnya:</span>
                <span>Rp {(activeShift.saldo_awal + activeShift.total_penjualan).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div>
              <Label>Saldo Akhir (Aktual)</Label>
              <Input
                type="number"
                value={saldoAkhir}
                onChange={(e) => setSaldoAkhir(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            {saldoAkhir > 0 && (
              <div className={`p-3 rounded ${
                Math.abs(saldoAkhir - (activeShift.saldo_awal + activeShift.total_penjualan)) < 1000
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                Selisih: Rp {(saldoAkhir - (activeShift.saldo_awal + activeShift.total_penjualan)).toLocaleString('id-ID')}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCloseDialog(false)}>
                Batal
              </Button>
              <Button onClick={() => closeShiftMutation.mutate()} disabled={closeShiftMutation.isPending}>
                Tutup Shift
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
