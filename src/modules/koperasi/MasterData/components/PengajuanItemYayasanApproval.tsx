import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, Building2 } from 'lucide-react';

interface PengajuanItem {
  id: string;
  inventaris_item_id: string;
  nama: string;
  qty: number;
  nilai_perolehan: number;
  usulan_hpp: number;
  status: string;
  hpp_koperasi: number | null;
  owner_type: 'yayasan' | 'koperasi';
  harga_jual_ecer: number | null;
  harga_jual_grosir: number | null;
  catatan_approval: string | null;
  created_at: string;
  inventaris?: {
    nama_barang: string;
    satuan: string;
    kategori: string;
  };
}

export default function PengajuanItemYayasanApproval() {
  const queryClient = useQueryClient();
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hppKoperasi, setHppKoperasi] = useState<string>('');
  const [ownerType, setOwnerType] = useState<'yayasan' | 'koperasi'>('yayasan');
  const [hargaJualEcer, setHargaJualEcer] = useState<string>('');
  const [hargaJualGrosir, setHargaJualGrosir] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  // Fetch pending pengajuan
  const { data: pengajuanList = [], isLoading } = useQuery({
    queryKey: ['pengajuan-item-yayasan-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pengajuan_item_yayasan')
        .select(`
          *,
          inventaris:inventaris_item_id(nama_barang, satuan, kategori)
        `)
        .eq('status', 'pending_koperasi')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PengajuanItem[];
    },
  });

  // Open approval dialog
  const handleApprove = (pengajuan: PengajuanItem) => {
    setSelectedPengajuan(pengajuan);
    setHppKoperasi(pengajuan.usulan_hpp.toString());
    setOwnerType(pengajuan.owner_type || 'yayasan');
    setHargaJualEcer('');
    setHargaJualGrosir('');
    setCatatan('');
    setIsDialogOpen(true);
  };

  // Handle reject pengajuan
  const handleReject = async (pengajuan: PengajuanItem) => {
    if (!confirm(`Tolak pengajuan "${pengajuan.nama}"?`)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('User tidak terautentikasi');
      return;
    }

    try {
      const { error } = await supabase
        .from('pengajuan_item_yayasan')
        .update({
          status: 'ditolak',
          catatan_approval: 'Ditolak oleh admin koperasi',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', pengajuan.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['pengajuan-item-yayasan-pending'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
      toast.success('Pengajuan berhasil ditolak');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menolak pengajuan');
    }
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPengajuan) throw new Error('Pengajuan tidak dipilih');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User tidak terautentikasi');

      const hppKoperasiNum = parseFloat(hppKoperasi) || 0;
      const hargaEcerNum = parseFloat(hargaJualEcer) || 0;
      const hargaGrosirNum = parseFloat(hargaJualGrosir) || 0;

      // Call RPC function untuk atomic approval
      const { data, error } = await supabase.rpc('approve_pengajuan_item_yayasan', {
        p_pengajuan_id: selectedPengajuan.id,
        p_hpp_koperasi: hppKoperasiNum,
        p_owner_type: ownerType,
        p_harga_jual_ecer: hargaEcerNum,
        p_harga_jual_grosir: hargaGrosirNum || 0,
        p_catatan: catatan || '',
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan-item-yayasan-pending'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventaris'] });
      toast.success('Pengajuan berhasil disetujui');
      setIsDialogOpen(false);
      setSelectedPengajuan(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyetujui pengajuan');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Item Yayasan (Approval)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : pengajuanList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada pengajuan yang menunggu approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Nama Barang</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Nilai Perolehan</th>
                    <th className="text-right p-3">Usulan HPP</th>
                    <th className="text-left p-3">Tanggal</th>
                    <th className="text-center p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pengajuanList.map((pengajuan) => (
                    <tr key={pengajuan.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium">{pengajuan.nama}</div>
                        {pengajuan.inventaris && (
                          <div className="text-sm text-muted-foreground">
                            {pengajuan.inventaris.kategori}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">{pengajuan.qty}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(pengajuan.nilai_perolehan)}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(pengajuan.usulan_hpp)}
                      </td>
                      <td className="p-3">
                        {new Date(pengajuan.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(pengajuan)}
                          >
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(pengajuan)}
                          >
                            Batalkan
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setujui Pengajuan Item Yayasan</DialogTitle>
          </DialogHeader>

          {selectedPengajuan && (
            <div className="space-y-4">
              {/* Item Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="font-semibold">{selectedPengajuan.nama}</div>
                <div className="text-sm text-muted-foreground">
                  Qty: {selectedPengajuan.qty} | Nilai Perolehan: {formatCurrency(selectedPengajuan.nilai_perolehan)} | Usulan HPP: {formatCurrency(selectedPengajuan.usulan_hpp)}
                </div>
              </div>

              {/* HPP Koperasi */}
              <div>
                <Label>HPP Koperasi *</Label>
                <Input
                  type="number"
                  value={hppKoperasi}
                  onChange={(e) => setHppKoperasi(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Boleh 0 jika item hibah/donasi
                </p>
              </div>

              {/* Owner Type */}
              <div>
                <Label>Sumber/Owner Produk *</Label>
                <RadioGroup
                  value={ownerType}
                  onValueChange={(value) => setOwnerType(value as 'yayasan' | 'koperasi')}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yayasan" id="yayasan" />
                    <Label htmlFor="yayasan" className="font-normal cursor-pointer">
                      Milik Yayasan (default)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="koperasi" id="koperasi" />
                    <Label htmlFor="koperasi" className="font-normal cursor-pointer">
                      Milik Koperasi (jika stok tercampur)
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-1">
                  Pilih "Milik Koperasi" jika stok di lapangan sudah tercampur dengan stok koperasi
                </p>
              </div>

              {/* Harga Jual */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Harga Jual Ecer *</Label>
                  <Input
                    type="number"
                    value={hargaJualEcer}
                    onChange={(e) => setHargaJualEcer(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Harga Jual Grosir</Label>
                  <Input
                    type="number"
                    value={hargaJualGrosir}
                    onChange={(e) => setHargaJualGrosir(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <Label>Catatan (Opsional)</Label>
                <Textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={approveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || !hppKoperasi || !hargaJualEcer}
            >
              {approveMutation.isPending ? 'Memproses...' : 'Setujui & Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

