import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Store, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  nama: string;
  kontak?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  created_at: string;
}

export default function SupplierManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kontak: '',
    telepon: '',
    email: '',
    alamat: '',
  });
  const queryClient = useQueryClient();

  const { data: supplierList = [], isLoading } = useQuery({
    queryKey: ['koperasi-supplier'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_supplier')
        .select('*')
        .order('nama');
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('kop_supplier')
          .update(data)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kop_supplier')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-supplier'] });
      toast.success(editingSupplier ? 'Supplier berhasil diupdate' : 'Supplier berhasil ditambahkan');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan supplier');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kop_supplier')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-supplier'] });
      toast.success('Supplier berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus supplier');
    },
  });

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      nama: supplier.nama,
      kontak: supplier.kontak || '',
      telepon: supplier.telepon || '',
      email: supplier.email || '',
      alamat: supplier.alamat || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Hapus supplier "${supplier.nama}"?`)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    setFormData({
      nama: '',
      kontak: '',
      telepon: '',
      email: '',
      alamat: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      toast.error('Nama supplier harus diisi');
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingSupplier?.id,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Manajemen Supplier
            </CardTitle>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Supplier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : supplierList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada supplier. Klik "Tambah Supplier" untuk memulai.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supplierList.map((supplier) => (
                <div
                  key={supplier.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{supplier.nama}</h3>
                      {supplier.kontak && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Kontak: {supplier.kontak}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {supplier.telepon && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {supplier.telepon}
                          </div>
                        )}
                        {supplier.alamat && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {supplier.alamat}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(supplier)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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
              {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nama Supplier *</Label>
              <Input
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Nama toko/supplier"
                required
              />
            </div>
            <div>
              <Label>Nama Kontak</Label>
              <Input
                value={formData.kontak}
                onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                placeholder="Nama contact person"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telepon</Label>
                <Input
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  placeholder="08xx-xxxx-xxxx"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div>
              <Label>Alamat</Label>
              <Textarea
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                placeholder="Alamat lengkap supplier"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingSupplier ? 'Update' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
