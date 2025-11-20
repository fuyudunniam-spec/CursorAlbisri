import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listPermohonanAdmin, approvePermohonan } from '@/services/tabunganSantriClient';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PermohonanPenarikan() {
  const [status, setStatus] = useState<'all'|'pending'|'approved'|'rejected'>('pending');
  const [q, setQ] = useState('');

  const rq = useQuery({
    queryKey: ['withdraw-requests', status, q],
    queryFn: () => listPermohonanAdmin(status, q)
  });

  const mApprove = useMutation({
    mutationFn: ({ id, ok, reason }: { id: string; ok: boolean; reason?: string }) => approvePermohonan(id, ok, reason),
    onSuccess: () => { toast.success('Permohonan diproses'); rq.refetch(); },
    onError: (e: any) => toast.error(e.message || 'Gagal memproses')
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Permohonan Penarikan Tabungan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Cari nama santri..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            <Button variant="outline" onClick={() => rq.refetch()}>Refresh</Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 p-3 text-xs font-semibold bg-muted/50">
              <div className="col-span-3">Santri</div>
              <div className="col-span-2">Nominal</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Catatan</div>
              <div className="col-span-2 text-right">Aksi</div>
            </div>
            {rq.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Memuat...</div>
            ) : rq.data?.length ? rq.data.map((r: any) => (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 border-t text-sm">
                <div className="md:col-span-3">
                  <div className="font-medium">{r.santri?.nama_lengkap}</div>
                  <div className="text-xs text-muted-foreground">{r.santri?.id_santri}</div>
                </div>
                <div className="md:col-span-2">Rp {Number(r.nominal).toLocaleString('id-ID')}</div>
                <div className="md:col-span-2 capitalize">{r.status}</div>
                <div className="md:col-span-3">
                  <div className="text-xs">Santri: {r.catatan_santri || '-'}</div>
                  {r.alasan_admin && <div className="text-xs">Admin: {r.alasan_admin}</div>}
                </div>
                <div className="md:col-span-2 flex items-center justify-start md:justify-end gap-2">
                  {r.status === 'pending' ? (
                    <>
                      <Button size="sm" onClick={() => mApprove.mutate({ id: r.id, ok: true })}>Approve</Button>
                      <Button variant="destructive" size="sm" onClick={() => {
                        const reason = window.prompt('Alasan penolakan (opsional)?') || undefined;
                        mApprove.mutate({ id: r.id, ok: false, reason });
                      }}>Reject</Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Diproses</span>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-4 text-sm text-muted-foreground">Belum ada data.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


