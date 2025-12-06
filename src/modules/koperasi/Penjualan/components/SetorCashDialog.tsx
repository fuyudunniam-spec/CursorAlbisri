import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { setoranCashKasirService } from '@/services/koperasi.service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SetorCashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kasirId: string;
  shiftId?: string;
}

const SetorCashDialog: React.FC<SetorCashDialogProps> = ({
  open,
  onOpenChange,
  kasirId,
  shiftId,
}) => {
  const queryClient = useQueryClient();
  const [jumlahSetor, setJumlahSetor] = useState('');
  const [metodeSetor, setMetodeSetor] = useState<'cash' | 'transfer'>('cash');
  const [akunKasId, setAkunKasId] = useState<string>('');
  const [catatan, setCatatan] = useState('');

  // Get total cash sales
  const { data: totalCashSales = 0, isLoading: loadingSales } = useQuery({
    queryKey: ['total-cash-sales', kasirId, shiftId],
    queryFn: () => setoranCashKasirService.getTotalCashSalesForKasir(kasirId, shiftId),
    enabled: open && !!kasirId,
  });

  // Get total setoran sebelumnya
  const { data: totalSetoranSebelumnya = 0, isLoading: loadingSetoran } = useQuery({
    queryKey: ['total-setoran-kasir', kasirId, shiftId],
    queryFn: () => setoranCashKasirService.getTotalSetoranKasir(kasirId, shiftId),
    enabled: open && !!kasirId,
  });

  // Get akun kas list
  const { data: akunKasList = [] } = useQuery({
    queryKey: ['akun-kas-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('akun_kas')
        .select('id, nama, kode, saldo_saat_ini')
        .eq('status', 'aktif')
        .order('nama');
      if (error) throw error;
      return data || [];
    },
  });

  const sisaBelumDisetor = totalCashSales - totalSetoranSebelumnya;
  const selisih = sisaBelumDisetor - parseFloat(jumlahSetor || '0');

  const createSetoranMutation = useMutation({
    mutationFn: async () => {
      if (!jumlahSetor || parseFloat(jumlahSetor) <= 0) {
        throw new Error('Jumlah setor harus lebih dari 0');
      }

      return setoranCashKasirService.createSetoranCashKasir({
        kasir_id: kasirId,
        shift_id: shiftId,
        jumlah_setor: parseFloat(jumlahSetor),
        total_penjualan_tunai_snapshot: totalCashSales,
        total_setoran_sebelumnya: totalSetoranSebelumnya,
        akun_kas_id: akunKasId || undefined,
        metode_setor: metodeSetor,
        catatan: catatan || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Setoran cash berhasil dicatat');
      queryClient.invalidateQueries({ queryKey: ['total-cash-sales'] });
      queryClient.invalidateQueries({ queryKey: ['total-setoran-kasir'] });
      queryClient.invalidateQueries({ queryKey: ['riwayat-setoran-kasir'] });
      onOpenChange(false);
      setJumlahSetor('');
      setCatatan('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mencatat setoran cash');
    },
  });

  useEffect(() => {
    if (open) {
      // Set default jumlah setor = sisa belum disetor
      setJumlahSetor(sisaBelumDisetor.toString());
    }
  }, [open, sisaBelumDisetor]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            Setor Cash Kasir
          </DialogTitle>
          <DialogDescription>
            Catat setoran cash dari kasir ke kas utama
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <p className="text-sm text-green-700 font-medium mb-1">Total Penjualan Tunai</p>
                <p className="text-2xl font-bold text-green-800">
                  {loadingSales ? '...' : formatRupiah(totalCashSales)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-700 font-medium mb-1">Total Setoran Sebelumnya</p>
                <p className="text-2xl font-bold text-blue-800">
                  {loadingSetoran ? '...' : formatRupiah(totalSetoranSebelumnya)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-700 font-medium mb-1">Sisa Belum Disetor</p>
              <p className="text-2xl font-bold text-amber-800">
                {formatRupiah(sisaBelumDisetor)}
              </p>
            </CardContent>
          </Card>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="jumlah-setor">Jumlah Setor *</Label>
              <Input
                id="jumlah-setor"
                type="number"
                value={jumlahSetor}
                onChange={(e) => setJumlahSetor(e.target.value)}
                placeholder="0"
                className="text-lg font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sisa belum disetor: {formatRupiah(sisaBelumDisetor)}
              </p>
            </div>

            {Math.abs(selisih) > 100 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-700">
                  Selisih: {formatRupiah(Math.abs(selisih))} 
                  {selisih > 0 ? ' (kurang)' : ' (lebih)'}
                </p>
              </div>
            )}

            {Math.abs(selisih) <= 100 && selisih !== 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700">
                  Selisih: {formatRupiah(Math.abs(selisih))} (dalam toleransi)
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="metode-setor">Metode Setor</Label>
              <Select value={metodeSetor} onValueChange={(value: 'cash' | 'transfer') => setMetodeSetor(value)}>
                <SelectTrigger id="metode-setor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="akun-kas">Akun Kas Tujuan</Label>
              <Select value={akunKasId} onValueChange={setAkunKasId}>
                <SelectTrigger id="akun-kas">
                  <SelectValue placeholder="Pilih akun kas" />
                </SelectTrigger>
                <SelectContent>
                  {akunKasList.map((akun) => (
                    <SelectItem key={akun.id} value={akun.id}>
                      {akun.nama} {akun.kode && `(${akun.kode})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createSetoranMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => createSetoranMutation.mutate()}
              disabled={createSetoranMutation.isPending || !jumlahSetor || parseFloat(jumlahSetor) <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {createSetoranMutation.isPending ? 'Menyimpan...' : 'Simpan Setoran'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SetorCashDialog;


