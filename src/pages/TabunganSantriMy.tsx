import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getSaldoDanRingkas, listTransaksi, listPermohonanSaya, ajukanPenarikan } from '@/services/tabunganSantriClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, History, Download } from 'lucide-react';
import { toast } from 'sonner';

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

export default function TabunganSantriMy() {
  const { user } = useAuth();
  const santriId = user?.santriId || '';
  const [showAjukan, setShowAjukan] = useState(false);
  const [nominal, setNominal] = useState<number>(0);
  const [catatan, setCatatan] = useState('');

  const saldoQ = useQuery({ queryKey: ['saldo', santriId], queryFn: () => getSaldoDanRingkas(santriId), enabled: !!santriId });
  const txQ = useQuery({ queryKey: ['tx', santriId], queryFn: () => listTransaksi(santriId, 1, 25), enabled: !!santriId });
  const reqQ = useQuery({ queryKey: ['req', santriId], queryFn: () => listPermohonanSaya(santriId), enabled: !!santriId });

  const mAjukan = useMutation({
    mutationFn: () => ajukanPenarikan(santriId, nominal, catatan),
    onSuccess: () => {
      toast.success('Permohonan penarikan dikirim');
      setShowAjukan(false);
      setNominal(0);
      setCatatan('');
      saldoQ.refetch();
      reqQ.refetch();
    },
    onError: (e: any) => toast.error(e.message || 'Gagal mengirim permohonan')
  });

  const saldo = saldoQ.data?.saldo || 0;
  const canWithdraw = useMemo(() => nominal > 0 && nominal <= saldo, [nominal, saldo]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tabungan Saya</h1>
        <p className="text-muted-foreground">Lihat saldo, riwayat, dan ajukan penarikan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo Saat Ini</CardTitle>
            <Wallet className="w-4 h-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(saldo)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Permohonan Saya</CardTitle>
            <History className="w-4 h-4" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{reqQ.data?.length || 0} permohonan</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Unduh Riwayat</CardTitle>
            <Download className="w-4 h-4" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>Export PDF</Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setShowAjukan(true)} disabled={saldo <= 0}>Ajukan Penarikan</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {txQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Memuat...</div>
          ) : txQ.data?.data?.length ? (
            txQ.data.data.map((t: any) => (
              <div key={t.id} className="flex justify-between border-b py-2 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{t.jenis}</div>
                  <div className="text-muted-foreground text-xs">{t.tanggal}</div>
                </div>
                <div className={t.jenis === 'Setoran' ? 'text-green-600' : 'text-red-600'}>{formatRupiah(Number(t.nominal))}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Belum ada transaksi</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permohonan Penarikan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reqQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Memuat...</div>
          ) : reqQ.data?.length ? (
            reqQ.data.map((r: any) => (
              <div key={r.id} className="grid grid-cols-3 gap-2 border-b py-2 text-sm">
                <div>Rp {Number(r.nominal).toLocaleString('id-ID')}</div>
                <div className="capitalize">{r.status}</div>
                <div className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString('id-ID')}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Belum ada permohonan</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAjukan} onOpenChange={setShowAjukan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Penarikan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nominal</Label>
              <Input type="number" value={nominal} onChange={(e) => setNominal(Number(e.target.value))} min={1} />
              <div className="text-xs text-muted-foreground mt-1">Saldo: {formatRupiah(saldo)}</div>
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAjukan(false)}>Batal</Button>
              <Button onClick={() => mAjukan.mutate()} disabled={!canWithdraw || mAjukan.isLoading}>Kirim</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


