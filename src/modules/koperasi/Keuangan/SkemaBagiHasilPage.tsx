import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';
import { koperasiService } from '@/services/koperasi.service';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SkemaBagiHasil {
  id: string;
  nama_skema: string;
  kategori_produk_id?: string;
  owner_type?: 'koperasi' | 'yayasan';
  bagi_hasil_yayasan: number;
  bagi_hasil_koperasi: number;
  biaya_pengolahan?: number;
  biaya_pengolahan_persen?: number;
  margin_minimum?: number;
  berlaku_dari?: string;
  berlaku_sampai?: string;
  is_active: boolean;
  deskripsi?: string;
  created_at: string;
}

interface KategoriProduk {
  id: string;
  nama: string;
}

const SkemaBagiHasilPage = () => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSkema, setEditingSkema] = useState<SkemaBagiHasil | null>(null);
  const [formData, setFormData] = useState({
    nama_skema: '',
    kategori_produk_id: '',
    owner_type: '' as '' | 'koperasi' | 'yayasan',
    bagi_hasil_yayasan: 70,
    bagi_hasil_koperasi: 30,
    biaya_pengolahan: '',
    biaya_pengolahan_persen: '',
    margin_minimum: '',
    berlaku_dari: '',
    berlaku_sampai: '',
    deskripsi: '',
  });

  const { data: skemaList, isLoading } = useQuery({
    queryKey: ['skema-bagi-hasil'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_skema_bagi_hasil')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SkemaBagiHasil[];
    },
  });

  const { data: kategoriList } = useQuery({
    queryKey: ['kategori-produk'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_kategori')
        .select('id, nama')
        .order('nama');
      if (error) throw error;
      return (data || []) as KategoriProduk[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('kop_skema_bagi_hasil')
        .insert({ ...data, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Skema bagi hasil berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['skema-bagi-hasil'] });
      resetForm();
      setShowDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal membuat skema bagi hasil');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('kop_skema_bagi_hasil')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Skema bagi hasil berhasil diupdate');
      queryClient.invalidateQueries({ queryKey: ['skema-bagi-hasil'] });
      resetForm();
      setShowDialog(false);
      setEditingSkema(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mengupdate skema bagi hasil');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kop_skema_bagi_hasil')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Skema bagi hasil berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['skema-bagi-hasil'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus skema bagi hasil');
    },
  });

  const resetForm = () => {
    setFormData({
      nama_skema: '',
      kategori_produk_id: '',
      owner_type: '',
      bagi_hasil_yayasan: 70,
      bagi_hasil_koperasi: 30,
      biaya_pengolahan: '',
      biaya_pengolahan_persen: '',
      margin_minimum: '',
      berlaku_dari: '',
      berlaku_sampai: '',
      deskripsi: '',
    });
  };

  const handleEdit = (skema: SkemaBagiHasil) => {
    setEditingSkema(skema);
    setFormData({
      nama_skema: skema.nama_skema,
      kategori_produk_id: skema.kategori_produk_id || '',
      owner_type: skema.owner_type || '',
      bagi_hasil_yayasan: skema.bagi_hasil_yayasan,
      bagi_hasil_koperasi: skema.bagi_hasil_koperasi,
      biaya_pengolahan: skema.biaya_pengolahan?.toString() || '',
      biaya_pengolahan_persen: skema.biaya_pengolahan_persen?.toString() || '',
      margin_minimum: skema.margin_minimum?.toString() || '',
      berlaku_dari: skema.berlaku_dari || '',
      berlaku_sampai: skema.berlaku_sampai || '',
      deskripsi: skema.deskripsi || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate bagi hasil totals
    if (formData.bagi_hasil_yayasan + formData.bagi_hasil_koperasi !== 100) {
      toast.error('Total bagi hasil harus 100%');
      return;
    }

    const submitData: any = {
      nama_skema: formData.nama_skema,
      bagi_hasil_yayasan: formData.bagi_hasil_yayasan,
      bagi_hasil_koperasi: formData.bagi_hasil_koperasi,
      deskripsi: formData.deskripsi,
    };

    if (formData.kategori_produk_id) {
      submitData.kategori_produk_id = formData.kategori_produk_id;
    }

    if (formData.owner_type) {
      submitData.owner_type = formData.owner_type;
    }

    if (formData.biaya_pengolahan) {
      submitData.biaya_pengolahan = parseFloat(formData.biaya_pengolahan);
    }

    if (formData.biaya_pengolahan_persen) {
      submitData.biaya_pengolahan_persen = parseFloat(formData.biaya_pengolahan_persen);
    }

    if (formData.margin_minimum) {
      submitData.margin_minimum = parseFloat(formData.margin_minimum);
    }

    if (formData.berlaku_dari) {
      submitData.berlaku_dari = formData.berlaku_dari;
    }

    if (formData.berlaku_sampai) {
      submitData.berlaku_sampai = formData.berlaku_sampai;
    }

    if (editingSkema) {
      updateMutation.mutate({ id: editingSkema.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Skema Bagi Hasil</h1>
          <p className="text-gray-600 mt-1">Kelola skema bagi hasil custom untuk produk</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setEditingSkema(null);
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Skema Baru
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Skema Bagi Hasil</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : skemaList && skemaList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada skema bagi hasil. Klik "Skema Baru" untuk membuat.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Skema</TableHead>
                  <TableHead>Kategori/Owner</TableHead>
                  <TableHead>Bagi Hasil</TableHead>
                  <TableHead>Biaya Pengolahan</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skemaList?.map((skema: SkemaBagiHasil) => (
                  <TableRow key={skema.id}>
                    <TableCell className="font-medium">{skema.nama_skema}</TableCell>
                    <TableCell>
                      {skema.kategori_produk_id
                        ? kategoriList?.find((k) => k.id === skema.kategori_produk_id)?.nama || '-'
                        : skema.owner_type
                        ? skema.owner_type === 'yayasan' ? 'Item Yayasan' : 'Item Koperasi'
                        : 'Semua'}
                    </TableCell>
                    <TableCell>
                      Yayasan: {skema.bagi_hasil_yayasan}% / Koperasi: {skema.bagi_hasil_koperasi}%
                    </TableCell>
                    <TableCell>
                      {skema.biaya_pengolahan
                        ? formatCurrency(skema.biaya_pengolahan)
                        : skema.biaya_pengolahan_persen
                        ? `${skema.biaya_pengolahan_persen}%`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {skema.berlaku_dari || skema.berlaku_sampai
                        ? `${skema.berlaku_dari || 'Selamanya'} - ${skema.berlaku_sampai || 'Selamanya'}`
                        : 'Selamanya'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={skema.is_active ? 'default' : 'secondary'}>
                        {skema.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(skema)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Yakin ingin menghapus skema ini?')) {
                              deleteMutation.mutate(skema.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSkema ? 'Edit Skema Bagi Hasil' : 'Skema Bagi Hasil Baru'}
            </DialogTitle>
            <DialogDescription>
              Atur skema bagi hasil untuk produk koperasi
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nama_skema">Nama Skema *</Label>
                <Input
                  id="nama_skema"
                  value={formData.nama_skema}
                  onChange={(e) => setFormData({ ...formData, nama_skema: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="kategori_produk_id">Kategori Produk</Label>
                <Select
                  value={formData.kategori_produk_id}
                  onValueChange={(value) => setFormData({ ...formData, kategori_produk_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Semua Kategori</SelectItem>
                    {kategoriList?.map((kat) => (
                      <SelectItem key={kat.id} value={kat.id}>
                        {kat.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="owner_type">Owner Type</Label>
              <Select
                value={formData.owner_type}
                onValueChange={(value: 'koperasi' | 'yayasan' | '') =>
                  setFormData({ ...formData, owner_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih owner type (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Owner</SelectItem>
                  <SelectItem value="koperasi">Item Koperasi</SelectItem>
                  <SelectItem value="yayasan">Item Yayasan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bagi_hasil_yayasan">Bagi Hasil Yayasan (%) *</Label>
                <Input
                  id="bagi_hasil_yayasan"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.bagi_hasil_yayasan}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      bagi_hasil_yayasan: val,
                      bagi_hasil_koperasi: 100 - val,
                    });
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="bagi_hasil_koperasi">Bagi Hasil Koperasi (%) *</Label>
                <Input
                  id="bagi_hasil_koperasi"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.bagi_hasil_koperasi}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      bagi_hasil_koperasi: val,
                      bagi_hasil_yayasan: 100 - val,
                    });
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="biaya_pengolahan">Biaya Pengolahan (Nominal)</Label>
                <Input
                  id="biaya_pengolahan"
                  type="number"
                  min="0"
                  value={formData.biaya_pengolahan}
                  onChange={(e) => setFormData({ ...formData, biaya_pengolahan: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="biaya_pengolahan_persen">Biaya Pengolahan (%)</Label>
                <Input
                  id="biaya_pengolahan_persen"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.biaya_pengolahan_persen}
                  onChange={(e) => setFormData({ ...formData, biaya_pengolahan_persen: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="margin_minimum">Margin Minimum</Label>
                <Input
                  id="margin_minimum"
                  type="number"
                  min="0"
                  value={formData.margin_minimum}
                  onChange={(e) => setFormData({ ...formData, margin_minimum: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="berlaku_dari">Berlaku Dari</Label>
                <Input
                  id="berlaku_dari"
                  type="date"
                  value={formData.berlaku_dari}
                  onChange={(e) => setFormData({ ...formData, berlaku_dari: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="berlaku_sampai">Berlaku Sampai</Label>
                <Input
                  id="berlaku_sampai"
                  type="date"
                  value={formData.berlaku_sampai}
                  onChange={(e) => setFormData({ ...formData, berlaku_sampai: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                  setEditingSkema(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSkema ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkemaBagiHasilPage;




