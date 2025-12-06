import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { koperasiService } from "@/services/koperasi.service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { KoperasiProduk, KoperasiProdukInsert } from "@/types/koperasi.types";

interface ProdukFormDialogProps {
  open: boolean;
  onClose: () => void;
  produk?: KoperasiProduk | null;
}

export default function ProdukFormDialog({ open, onClose, produk }: ProdukFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!produk;
  const [showAddKategori, setShowAddKategori] = useState(false);
  const [newKategori, setNewKategori] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<KoperasiProdukInsert>();

  const hargaBeli = watch('harga_beli');
  const hargaJualEcer = watch('harga_jual_ecer');
  const hargaJualGrosir = watch('harga_jual_grosir');
  const namaProduk = watch('nama_produk');

  // Fetch kategori list
  const { data: kategoriList = [] } = useQuery({
    queryKey: ['koperasi-kategori'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_kategori')
        .select('id, nama, slug')
        .order('nama');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Auto-generate kode produk koperasi dengan format KOP-0001, KOP-0002, dst.
  useEffect(() => {
    if (!isEdit && open) {
      const generateKode = async () => {
        try {
          const prefix = 'KOP-';
          const { data, error } = await supabase
            .from('kop_barang')
            .select('kode_barang')
            .like('kode_barang', `${prefix}%`)
            .order('kode_barang', { ascending: false })
            .limit(1);

          if (error) throw error;

          let nextNum = 1;
          if (data && data.length > 0 && data[0].kode_barang) {
            const match = data[0].kode_barang.match(/^KOP-(\d+)$/);
            if (match) {
              nextNum = parseInt(match[1], 10) + 1;
            }
          }

          const generatedKode = `${prefix}${nextNum.toString().padStart(4, '0')}`;
          setValue('kode_produk', generatedKode);
        } catch (error) {
          console.error('Error generating kode KOP:', error);
        }
      };

      generateKode();
    }
  }, [open, isEdit, setValue]);

  useEffect(() => {
    if (open) {
      if (produk) {
        reset({
          kode_produk: produk.kode_produk,
          nama_produk: produk.nama_produk,
          kategori: produk.kategori || '',
          satuan: produk.satuan,
          harga_beli: produk.harga_beli,
          harga_jual_ecer: produk.harga_jual_ecer || produk.harga_jual || 0,
          harga_jual_grosir: produk.harga_jual_grosir || produk.harga_jual || 0,
          barcode: produk.barcode || '',
          deskripsi: produk.deskripsi || '',
        });
        setSelectedKategori(produk.kategori || '');
      } else {
        reset({
          kode_produk: '',
          satuan: 'pcs',
          harga_beli: 0,
          harga_jual_ecer: 0,
          harga_jual_grosir: 0,
        });
        setSelectedKategori('');
      }
      setShowAddKategori(false);
      setNewKategori('');
    }
  }, [open, produk, reset]);

  const addKategoriMutation = useMutation({
    mutationFn: async (namaKategori: string) => {
      const slug = namaKategori.toLowerCase().replace(/\s+/g, '-');
      const { data, error } = await supabase
        .from('kop_kategori')
        .insert({ nama: namaKategori, slug })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-kategori'] });
      setSelectedKategori(data.nama);
      setValue('kategori', data.nama);
      setShowAddKategori(false);
      setNewKategori('');
      toast.success('Kategori berhasil ditambahkan');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menambahkan kategori');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: KoperasiProdukInsert) => {
      // Get kategori_id
      const kategoriObj = kategoriList.find(k => k.nama === selectedKategori);
      
      const { data: result, error } = await supabase
        .from('kop_barang')
        .insert({
          kode_barang: data.kode_produk,
          nama_barang: data.nama_produk,
          kategori_id: kategoriObj?.id,
          satuan_dasar: data.satuan,
          harga_beli: data.harga_beli,
          harga_jual_ecer: data.harga_jual_ecer,
          harga_jual_grosir: data.harga_jual_grosir,
          stok: 0,
          stok_minimum: 5,
          is_active: true,
          sumber_modal_id: (await supabase.from('kop_sumber_modal').select('id').eq('nama', 'Koperasi').single()).data?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      toast.success('Produk berhasil ditambahkan');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menambahkan produk');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<KoperasiProdukInsert> }) => {
      const kategoriObj = kategoriList.find(k => k.nama === selectedKategori);
      
      const { data: result, error } = await supabase
        .from('kop_barang')
        .update({
          nama_barang: data.nama_produk,
          kategori_id: kategoriObj?.id,
          satuan_dasar: data.satuan,
          harga_beli: data.harga_beli,
          harga_jual_ecer: data.harga_jual_ecer,
          harga_jual_grosir: data.harga_jual_grosir,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      toast.success('Produk berhasil diupdate');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mengupdate produk');
    },
  });

  const onSubmit = (data: KoperasiProdukInsert) => {
    if (isEdit && produk) {
      updateMutation.mutate({ id: produk.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const marginEcerPersen = hargaBeli && hargaJualEcer && hargaBeli > 0
    ? ((hargaJualEcer - hargaBeli) / hargaBeli * 100).toFixed(1)
    : '0.0';
  
  const marginGrosirPersen = hargaBeli && hargaJualGrosir && hargaBeli > 0
    ? ((hargaJualGrosir - hargaBeli) / hargaBeli * 100).toFixed(1)
    : '0.0';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kode Produk</Label>
              <Input {...register('kode_produk', { required: true })} readOnly />
            </div>
            <div>
              <Label>Barcode (Opsional)</Label>
              <Input {...register('barcode')} />
            </div>
          </div>

          <div>
            <Label>Nama Produk *</Label>
            <Input {...register('nama_produk', { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategori *</Label>
              {!showAddKategori ? (
                <div className="flex gap-2">
                  <Select
                    value={selectedKategori}
                    onValueChange={(value) => {
                      setSelectedKategori(value);
                      setValue('kategori', value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategoriList.map((kat) => (
                        <SelectItem key={kat.id} value={kat.nama}>
                          {kat.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAddKategori(true)}
                    title="Tambah kategori baru"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newKategori}
                    onChange={(e) => setNewKategori(e.target.value)}
                    placeholder="Nama kategori baru"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newKategori.trim()) {
                          addKategoriMutation.mutate(newKategori.trim());
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newKategori.trim()) {
                        addKategoriMutation.mutate(newKategori.trim());
                      }
                    }}
                    disabled={addKategoriMutation.isPending}
                  >
                    Simpan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddKategori(false);
                      setNewKategori('');
                    }}
                  >
                    Batal
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label>Satuan *</Label>
              <Input {...register('satuan', { required: true })} placeholder="pcs, kg, liter" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Harga Beli *</Label>
              <Input
                type="number"
                {...register('harga_beli', { required: true, valueAsNumber: true })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Harga Jual Ecer *</Label>
                <Input
                  type="number"
                  {...register('harga_jual_ecer', { required: true, valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Margin: {marginEcerPersen}%
                </p>
              </div>
              <div>
                <Label>Harga Jual Grosir *</Label>
                <Input
                  type="number"
                  {...register('harga_jual_grosir', { required: true, valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Margin: {marginGrosirPersen}%
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label>Deskripsi</Label>
            <Textarea {...register('deskripsi')} rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEdit ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
