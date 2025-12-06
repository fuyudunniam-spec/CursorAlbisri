import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Kategori {
  id: string;
  nama: string;
  slug: string;
  deskripsi?: string;
  created_at: string;
}

export default function KategoriManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKategori, setEditingKategori] = useState<Kategori | null>(null);
  const [formData, setFormData] = useState({ nama: '', deskripsi: '' });
  const queryClient = useQueryClient();

  const { data: kategoriList = [], isLoading } = useQuery({
    queryKey: ['koperasi-kategori-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_kategori')
        .select('*')
        .order('nama');
      if (error) throw error;
      return data as Kategori[];
    },
  });

  const { data: produkCount } = useQuery({
    queryKey: ['koperasi-kategori-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_barang')
        .select('kategori_id')
        .eq('is_active', true);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(item => {
        if (item.kategori_id) {
          counts[item.kategori_id] = (counts[item.kategori_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { nama: string; deskripsi?: string; id?: string }) => {
      const slug = data.nama.toLowerCase().replace(/\s+/g, '-');
      
      if (data.id) {
        const { error } = await supabase
          .from('kop_kategori')
          .update({ nama: data.nama, slug, deskripsi: data.deskripsi })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kop_kategori')
          .insert({ nama: data.nama, slug, deskripsi: data.deskripsi });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-kategori-management'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-kategori'] });
      toast.success(editingKategori ? 'Kategori berhasil diupdate' : 'Kategori berhasil ditambahkan');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan kategori');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kop_kategori')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-kategori-management'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-kategori'] });
      toast.success('Kategori berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus kategori');
    },
  });

  const handleEdit = (kategori: Kategori) => {
    setEditingKategori(kategori);
    setFormData({ nama: kategori.nama, deskripsi: kategori.deskripsi || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = (kategori: Kategori) => {
    const count = produkCount?.[kategori.id] || 0;
    if (count > 0) {
      toast.error(`Tidak dapat menghapus kategori "${kategori.nama}" karena masih digunakan oleh ${count} produk`);
      return;
    }
    
    if (confirm(`Hapus kategori "${kategori.nama}"?`)) {
      deleteMutation.mutate(kategori.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingKategori(null);
    setFormData({ nama: '', deskripsi: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      toast.error('Nama kategori harus diisi');
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingKategori?.id,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Manajemen Kategori
            </CardTitle>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : kategoriList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada kategori. Klik "Tambah Kategori" untuk memulai.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {kategoriList.map((kategori) => (
                <div
                  key={kategori.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{kategori.nama}</h3>
                      {kategori.deskripsi && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {kategori.deskripsi}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {produkCount?.[kategori.id] || 0} produk
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(kategori)}
                      className="flex-1"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(kategori)}
                      disabled={(produkCount?.[kategori.id] || 0) > 0}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKategori ? 'Edit Kategori' : 'Tambah Kategori'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nama Kategori *</Label>
              <Input
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Contoh: Sembako, Minuman, dll"
                required
              />
            </div>
            <div>
              <Label>Deskripsi (Opsional)</Label>
              <Input
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                placeholder="Deskripsi kategori"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingKategori ? 'Update' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
