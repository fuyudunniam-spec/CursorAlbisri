import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<KoperasiProdukInsert>({
    defaultValues: {
      owner_type: 'koperasi',
    }
  });

  const hargaBeli = watch('harga_beli');
  const hargaJualEcer = watch('harga_jual_ecer');
  const hargaJualGrosir = watch('harga_jual_grosir');
  const namaProduk = watch('nama_produk');
  const ownerType = watch('owner_type');

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

  // Track initial owner_type saat dialog dibuka (untuk edit mode)
  // Ini digunakan untuk mendeteksi apakah user benar-benar mengubah owner_type
  const initialOwnerTypeRef = useRef<string | undefined>(produk?.owner_type);
  // Track current owner_type untuk detect perubahan
  const prevOwnerTypeRef = useRef<string | undefined>(produk?.owner_type);

  // Auto-generate kode produk berdasarkan owner_type
  // KOP-0001 untuk koperasi, YYS-0001 untuk yayasan
  // Generate saat create mode atau saat owner_type berubah dari nilai sebelumnya
  useEffect(() => {
    if (open && ownerType) {
      const generateKode = async () => {
        try {
          const prefix = ownerType === 'yayasan' ? 'YYS-' : 'KOP-';
          const { data, error } = await supabase
            .from('kop_barang')
            .select('kode_barang, owner_type')
            .eq('owner_type', ownerType)
            .like('kode_barang', `${prefix}%`)
            .order('kode_barang', { ascending: false })
            .limit(1);

          if (error) throw error;

          let nextNum = 1;
          if (data && data.length > 0 && data[0].kode_barang) {
            const match = data[0].kode_barang.match(new RegExp(`^${prefix}(\\d+)$`));
            if (match) {
              nextNum = parseInt(match[1], 10) + 1;
            }
          }

          const generatedKode = `${prefix}${nextNum.toString().padStart(4, '0')}`;
          setValue('kode_produk', generatedKode, { shouldValidate: false });
        } catch (error) {
          console.error(`Error generating kode ${ownerType}:`, error);
        }
      };

      // Generate kode jika:
      // 1. Create mode (selalu generate)
      // 2. Edit mode: JANGAN generate di useEffect, biarkan onValueChange yang handle
      //    Ini mencegah generate saat dialog dibuka atau owner_type tidak berubah
      if (!isEdit) {
        // Create mode: selalu generate
        generateKode();
      }
      // Edit mode: tidak generate di useEffect, biarkan onValueChange handler yang handle
      // saat user benar-benar mengubah owner_type
    }
  }, [open, isEdit, ownerType, setValue]);

  // Update ref when produk changes - set initial owner_type
  useEffect(() => {
    if (produk && produk.owner_type) {
      initialOwnerTypeRef.current = produk.owner_type;
      prevOwnerTypeRef.current = produk.owner_type;
    }
  }, [produk?.id, produk?.owner_type]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      reset();
      setSelectedKategori('');
      setShowAddKategori(false);
      setNewKategori('');
      return;
    }

    // When dialog opens, load data
    if (produk) {
      // Edit mode: load produk data
      const produkOwnerType = produk.owner_type || 'koperasi';
      reset({
        kode_produk: produk.kode_produk || '',
        nama_produk: produk.nama_produk || '',
        kategori: produk.kategori || '',
        satuan: produk.satuan || 'pcs',
        harga_beli: produk.harga_beli || 0,
        harga_jual_ecer: produk.harga_jual_ecer || produk.harga_jual || 0,
        harga_jual_grosir: produk.harga_jual_grosir || produk.harga_jual || 0,
        owner_type: produkOwnerType,
        barcode: produk.barcode || '',
        deskripsi: produk.deskripsi || '',
        stok: produk.stok || produk.stock || 0,
      });
      setSelectedKategori(produk.kategori || '');
      setShowAddKategori(false);
      setNewKategori('');
      // Set initial owner_type ref untuk mencegah auto-generate saat dialog dibuka
      initialOwnerTypeRef.current = produkOwnerType;
      prevOwnerTypeRef.current = produkOwnerType;
    } else {
      // Create mode: reset to defaults
      reset({
        kode_produk: '',
        satuan: 'pcs',
        harga_beli: 0,
        harga_jual_ecer: 0,
        harga_jual_grosir: 0,
        owner_type: 'koperasi',
        stok: 0,
      });
      setSelectedKategori('');
      setShowAddKategori(false);
      setNewKategori('');
      initialOwnerTypeRef.current = 'koperasi';
      prevOwnerTypeRef.current = 'koperasi';
    }
  }, [open, produk?.id, reset]); // Hapus produk?.kode_produk dari dependencies untuk mencegah re-trigger

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
      
      // Get sumber_modal_id based on owner_type
      const sumberModalName = data.owner_type === 'yayasan' ? 'Yayasan' : 'Koperasi';
      const { data: sumberModal } = await supabase
        .from('kop_sumber_modal')
        .select('id')
        .eq('nama', sumberModalName)
        .single();
      
      // Calculate bagi_hasil_yayasan based on owner_type
      const bagiHasil = data.owner_type === 'yayasan' ? 70 : 0;
      
      // If harga_jual_grosir is empty/null (not explicitly set to 0), use harga_jual_ecer (eceran only)
      // If user explicitly sets to 0, save 0 (means eceran only)
      // Ensure we always send a valid number (not null/undefined)
      const hargaEcer = Number(data.harga_jual_ecer) || 0;
      const hargaGrosirValue = data.harga_jual_grosir;
      
      // Check if value is explicitly provided (not undefined/null/empty string)
      // If explicitly 0, save 0. If empty/null/undefined, use harga ecer
      let hargaGrosir: number;
      const isValueEmpty = hargaGrosirValue === undefined || 
                          hargaGrosirValue === null || 
                          (typeof hargaGrosirValue === 'string' && String(hargaGrosirValue).trim() === '');
      
      if (isValueEmpty) {
        // Field is empty - use harga ecer
        hargaGrosir = hargaEcer;
      } else {
        // Field has value - use it (even if 0)
        const hargaGrosirNum = Number(hargaGrosirValue);
        hargaGrosir = !isNaN(hargaGrosirNum) ? hargaGrosirNum : hargaEcer;
      }
      
      const { data: result, error } = await supabase
        .from('kop_barang')
        .insert({
          kode_barang: data.kode_produk,
          nama_barang: data.nama_produk,
          kategori_id: kategoriObj?.id,
          satuan_dasar: data.satuan,
          harga_beli: Number(data.harga_beli) || 0,
          harga_jual_ecer: hargaEcer,
          harga_jual_grosir: hargaGrosir,
          owner_type: data.owner_type || 'koperasi',
          bagi_hasil_yayasan: bagiHasil,
          stok: (data as any).stok || 0,
          stok_minimum: 5,
          is_active: true,
          sumber_modal_id: sumberModal?.id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: async () => {
      // Invalidate all related queries
      // Use exact: false to match all queries that start with these keys
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-total-count'], exact: false }),
      ]);
      
      // Force refetch all matching queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['koperasi-produk-with-stock'], exact: false }),
        queryClient.refetchQueries({ queryKey: ['koperasi-produk'], exact: false }),
      ]);
      
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
      
      // Calculate bagi_hasil_yayasan based on owner_type
      const bagiHasil = data.owner_type === 'yayasan' ? 70 : 0;
      
      // If harga_jual_grosir is empty/null (not explicitly set to 0), use harga_jual_ecer (eceran only)
      // If user explicitly sets to 0, save 0 (means eceran only)
      // Ensure we always send a valid number (not null/undefined)
      const hargaEcer = Number(data.harga_jual_ecer) || 0;
      const hargaGrosirValue = data.harga_jual_grosir;
      
      // Check if value is explicitly provided (not undefined/null/empty string)
      // If explicitly 0, save 0. If empty/null/undefined, use harga ecer
      let hargaGrosir: number;
      const isValueEmpty = hargaGrosirValue === undefined || 
                          hargaGrosirValue === null || 
                          (typeof hargaGrosirValue === 'string' && String(hargaGrosirValue).trim() === '');
      
      if (isValueEmpty) {
        // Field is empty - use harga ecer
        hargaGrosir = hargaEcer;
      } else {
        // Field has value - use it (even if 0)
        const hargaGrosirNum = Number(hargaGrosirValue);
        hargaGrosir = !isNaN(hargaGrosirNum) ? hargaGrosirNum : hargaEcer;
      }
      
      const updateData: any = {
        nama_barang: data.nama_produk,
        kategori_id: kategoriObj?.id,
        satuan_dasar: data.satuan,
        harga_beli: Number(data.harga_beli) || 0,
        harga_jual_ecer: hargaEcer,
        harga_jual_grosir: hargaGrosir,
        owner_type: data.owner_type || 'koperasi',
        bagi_hasil_yayasan: bagiHasil,
      };

      // Always update kode_barang if kode_produk is provided
      // This ensures kode is updated when owner_type changes and new kode is generated
      if (data.kode_produk) {
        updateData.kode_barang = data.kode_produk;
      }

      // Update stok jika ada
      if ((data as any).stok !== undefined) {
        updateData.stok = (data as any).stok;
      }

      const { data: result, error } = await supabase
        .from('kop_barang')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: async (result) => {
      // Invalidate all related queries to refresh the list
      // Use exact: false to match all queries that start with these keys (including with search params)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-total-count'], exact: false }),
      ]);
      
      // Remove queries from cache to force fresh fetch
      queryClient.removeQueries({ queryKey: ['koperasi-produk-with-stock'], exact: false });
      
      // Force refetch all matching queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['koperasi-produk-with-stock'], exact: false }),
        queryClient.refetchQueries({ queryKey: ['koperasi-produk'], exact: false }),
      ]);
      
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Owner Type */}
          <div>
            <Label>Sumber/Owner Produk *</Label>
            <RadioGroup
              value={ownerType || 'koperasi'}
              onValueChange={async (value) => {
                const newOwnerType = value as 'koperasi' | 'yayasan';
                const currentOwnerType = prevOwnerTypeRef.current || ownerType;
                setValue('owner_type', newOwnerType);
                
                // Hanya generate kode baru jika:
                // 1. Edit mode DAN owner_type benar-benar berubah dari nilai awal produk
                // 2. Owner_type berbeda dari nilai sebelumnya (user mengubah, bukan saat dialog dibuka)
                const initialOwnerType = initialOwnerTypeRef.current || (produk?.owner_type || 'koperasi');
                const isOwnerTypeChanged = currentOwnerType !== newOwnerType;
                const isDifferentFromInitial = newOwnerType !== initialOwnerType;
                
                // Generate new kode HANYA jika:
                // - Edit mode
                // - Owner_type berubah dari nilai sebelumnya (user mengubah)
                // - Owner_type berbeda dari initial (bukan nilai awal produk)
                if (isEdit && isOwnerTypeChanged && isDifferentFromInitial) {
                  try {
                    const prefix = newOwnerType === 'yayasan' ? 'YYS-' : 'KOP-';
                    const { data, error } = await supabase
                      .from('kop_barang')
                      .select('kode_barang, owner_type')
                      .eq('owner_type', newOwnerType)
                      .like('kode_barang', `${prefix}%`)
                      .order('kode_barang', { ascending: false })
                      .limit(1);

                    if (error) throw error;

                    let nextNum = 1;
                    if (data && data.length > 0 && data[0].kode_barang) {
                      const match = data[0].kode_barang.match(new RegExp(`^${prefix}(\\d+)$`));
                      if (match) {
                        nextNum = parseInt(match[1], 10) + 1;
                      }
                    }

                    const generatedKode = `${prefix}${nextNum.toString().padStart(4, '0')}`;
                    setValue('kode_produk', generatedKode, { shouldValidate: false });
                    prevOwnerTypeRef.current = newOwnerType;
                  } catch (error) {
                    console.error(`Error generating kode ${newOwnerType}:`, error);
                  }
                } else {
                  // Update ref meskipun tidak generate kode
                  prevOwnerTypeRef.current = newOwnerType;
                }
              }}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="koperasi" id="koperasi" />
                <Label htmlFor="koperasi" className="font-normal cursor-pointer">
                  Milik Koperasi
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yayasan" id="yayasan" />
                <Label htmlFor="yayasan" className="font-normal cursor-pointer">
                  Milik Yayasan
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-1">
              Produk dengan nama sama tapi sumber berbeda akan disimpan sebagai produk terpisah
            </p>
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

          <div>
            <Label>Qty (Stok) *</Label>
            <Input
              type="number"
              {...register('stok', { required: true, valueAsNumber: true, min: 0 })}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Jumlah stok produk saat ini
            </p>
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
                <Label>Harga Jual Grosir (Opsional)</Label>
                <Input
                  type="number"
                  {...register('harga_jual_grosir', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Harga jual untuk pembelian grosir. Jika dikosongkan, akan menggunakan harga eceran.
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
