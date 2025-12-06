import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { KoperasiProduk, KoperasiProdukInsert } from "@/types/koperasi.types";

interface ProdukFormDialogMVPProps {
  open: boolean;
  onClose: () => void;
  produk?: KoperasiProduk | null;
}

export default function ProdukFormDialogMVP({ open, onClose, produk }: ProdukFormDialogMVPProps) {
  const queryClient = useQueryClient();
  const isEdit = !!produk;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<KoperasiProdukInsert>({
    defaultValues: {
      owner_type: 'koperasi',
      satuan: 'pcs',
      harga_beli: 0,
      harga_jual: 0,
      bagi_hasil_yayasan: 0,
    }
  });

  const ownerType = watch('owner_type');
  const hargaBeli = watch('harga_beli');
  const hargaJual = watch('harga_jual');

  // Auto-generate kode produk
  useEffect(() => {
    if (!isEdit && open) {
      const generateKode = async () => {
        try {
          const { data } = await supabase
            .from('kop_barang')
            .select('kode_barang')
            .order('kode_barang', { ascending: false })
            .limit(1);

          let nextNum = 1;
          if (data && data.length > 0) {
            const lastKode = data[0].kode_barang;
            const match = lastKode.match(/PRD-(\d+)/);
            if (match) {
              nextNum = parseInt(match[1]) + 1;
            }
          }

          const generatedKode = `PRD-${nextNum.toString().padStart(4, '0')}`;
          setValue('kode_produk', generatedKode);
        } catch (err) {
          console.error('Error generating kode:', err);
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
          satuan: produk.satuan,
          harga_beli: produk.harga_beli,
          harga_jual: produk.harga_jual,
          owner_type: produk.owner_type || 'koperasi',
          bagi_hasil_yayasan: produk.bagi_hasil_yayasan || 0,
        });
      } else {
        reset({
          kode_produk: '',
          satuan: 'pcs',
          harga_beli: 0,
          harga_jual: 0,
          owner_type: 'koperasi',
          bagi_hasil_yayasan: 0,
        });
      }
    }
  }, [open, produk, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: KoperasiProdukInsert) => {
      // Validate owner_type and bagi_hasil_yayasan consistency
      const bagiHasil = data.owner_type === 'yayasan' ? 70 : 0;
      
      // Get sumber modal
      const { data: sumberModal } = await supabase
        .from('kop_sumber_modal')
        .select('id')
        .eq('nama', data.owner_type === 'yayasan' ? 'Yayasan' : 'Koperasi')
        .single();
      
      const { data: result, error } = await supabase
        .from('kop_barang')
        .insert({
          kode_barang: data.kode_produk,
          nama_barang: data.nama_produk,
          satuan_dasar: data.satuan,
          harga_beli: data.harga_beli,
          harga_jual_ecer: data.harga_jual,
          harga_jual_grosir: data.harga_jual * 0.95,
          owner_type: data.owner_type,
          bagi_hasil_yayasan: bagiHasil,
          stok: 0,
          stok_minimum: 5,
          sumber_modal_id: sumberModal?.id || '',
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      // Stock is already in kop_barang.stok field, no need for separate stock table
      
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
      // Validate owner_type and bagi_hasil_yayasan consistency
      const bagiHasil = data.owner_type === 'yayasan' ? 70 : 0;
      
      const { data: result, error } = await supabase
        .from('kop_barang')
        .update({
          nama_barang: data.nama_produk,
          satuan_dasar: data.satuan,
          harga_beli: data.harga_beli,
          harga_jual_ecer: data.harga_jual,
          harga_jual_grosir: data.harga_jual * 0.95,
          owner_type: data.owner_type,
          bagi_hasil_yayasan: bagiHasil,
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

  // Calculate margin and bagi hasil
  const bagiHasilYayasan = ownerType === 'yayasan' ? 70 : 0;
  const bagiHasilKoperasi = ownerType === 'yayasan' ? 30 : 100;
  
  const marginPersen = ownerType === 'koperasi'
    ? (hargaBeli && hargaJual && hargaBeli > 0
        ? ((hargaJual - hargaBeli) / hargaBeli * 100).toFixed(1)
        : '0.0')
    : (hargaJual > 0
        ? ((hargaJual * bagiHasilKoperasi / 100) / hargaJual * 100).toFixed(1)
        : '0.0');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Kode Produk */}
          <div>
            <Label>Kode Produk</Label>
            <Input {...register('kode_produk', { required: true })} readOnly className="bg-muted" />
          </div>

          {/* Nama Produk */}
          <div>
            <Label>Nama Produk *</Label>
            <Input {...register('nama_produk', { required: true })} placeholder="Contoh: Aqua 600ml" />
            {errors.nama_produk && <p className="text-sm text-red-500 mt-1">Nama produk wajib diisi</p>}
          </div>

          {/* Owner Type */}
          <div>
            <Label>Kepemilikan Produk *</Label>
            <RadioGroup
              value={ownerType}
              onValueChange={(value) => setValue('owner_type', value as 'koperasi' | 'yayasan')}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="koperasi" id="koperasi" />
                <Label htmlFor="koperasi" className="font-normal cursor-pointer">
                  Barang Koperasi
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yayasan" id="yayasan" />
                <Label htmlFor="yayasan" className="font-normal cursor-pointer">
                  Barang Yayasan
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Bagi Hasil Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900">Bagi Hasil Yayasan:</span>
              <span className="text-lg font-bold text-blue-700">{bagiHasilYayasan}%</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm font-medium text-blue-900">Bagi Hasil Koperasi:</span>
              <span className="text-lg font-bold text-blue-700">{bagiHasilKoperasi}%</span>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {ownerType === 'yayasan' 
                ? 'Produk yayasan: 70% untuk yayasan, 30% untuk koperasi'
                : 'Produk koperasi: 100% untuk koperasi'}
            </p>
          </div>

          {/* Satuan */}
          <div>
            <Label>Satuan *</Label>
            <Input {...register('satuan', { required: true })} placeholder="pcs, kg, liter, dll" />
          </div>

          {/* Harga */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Harga Beli (HPP) *</Label>
              <Input
                type="number"
                {...register('harga_beli', { required: true, valueAsNumber: true, min: 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {ownerType === 'koperasi' ? 'Harga pembelian produk' : 'Harga transfer dari yayasan'}
              </p>
            </div>
            <div>
              <Label>Harga Jual *</Label>
              <Input
                type="number"
                {...register('harga_jual', { required: true, valueAsNumber: true, min: 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Harga jual ke konsumen
              </p>
            </div>
          </div>

          {/* Margin Info */}
          <div className="bg-muted p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Margin Koperasi:</span>
              <span className="text-lg font-bold text-primary">{marginPersen}%</span>
            </div>
            {ownerType === 'koperasi' && (
              <p className="text-xs text-muted-foreground mt-1">
                Margin = (Harga Jual - HPP) / HPP × 100%
              </p>
            )}
            {ownerType === 'yayasan' && (
              <p className="text-xs text-muted-foreground mt-1">
                Margin = 30% dari harga jual (bagian koperasi)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
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
