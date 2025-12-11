import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClipboardList, Save } from 'lucide-react';

export default function StockOpnameKoperasi() {
  const [selectedProduk, setSelectedProduk] = useState('');
  const [stokFisik, setStokFisik] = useState('');
  const [catatan, setCatatan] = useState('');
  const queryClient = useQueryClient();

  // Fetch produk list
  const { data: produkList = [] } = useQuery({
    queryKey: ['koperasi-produk-opname'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kop_barang')
        .select('id, kode_barang, nama_barang, stok, satuan_dasar')
        .eq('is_active', true)
        .order('nama_barang');
      if (error) throw error;
      return data || [];
    },
  });

  // Get selected produk detail
  const selectedProdukData = produkList.find((p: any) => p.id === selectedProduk);

  // Update stock mutation - using atomic RPC function
  const updateStockMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduk || !stokFisik) {
        throw new Error('Produk dan stok fisik harus diisi');
      }

      const stokFisikNum = parseInt(stokFisik);
      const { data: { user } } = await supabase.auth.getUser();

      // Use atomic RPC function for stock opname
      const { data: result, error } = await supabase.rpc(
        'rpc_stock_opname_koperasi',
        {
          p_barang_id: selectedProduk,
          p_stok_fisik: stokFisikNum,
          p_catatan: catatan || null,
          p_user_id: user?.id || null,
        }
      );

      if (error) {
        console.error('Error in stock opname:', error);
        throw new Error(error.message || 'Gagal melakukan stock opname');
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Gagal melakukan stock opname');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk-opname'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-stock-alerts'] });
      toast.success('Stock opname berhasil disimpan');
      
      // Reset form
      setSelectedProduk('');
      setStokFisik('');
      setCatatan('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyimpan stock opname');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStockMutation.mutate();
  };

  const selisih = selectedProdukData && stokFisik 
    ? parseInt(stokFisik) - (selectedProdukData.stok || 0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Stock Opname
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Pilih Produk *</Label>
            <Select value={selectedProduk} onValueChange={setSelectedProduk}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih produk" />
              </SelectTrigger>
              <SelectContent>
                {produkList.map((produk: any) => (
                  <SelectItem key={produk.id} value={produk.id}>
                    {produk.kode_barang} - {produk.nama_barang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProdukData && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stok Sistem:</span>
                <span className="font-medium">{selectedProdukData.stok} {selectedProdukData.satuan_dasar}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Stok Fisik *</Label>
            <Input
              type="number"
              value={stokFisik}
              onChange={(e) => setStokFisik(e.target.value)}
              placeholder="Masukkan jumlah stok fisik"
              min="0"
            />
          </div>

          {selectedProdukData && stokFisik && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Selisih:</span>
                <span className={`font-medium ${selisih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selisih >= 0 ? '+' : ''}{selisih} {selectedProdukData.satuan_dasar}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {selisih > 0 && 'Stok fisik lebih banyak dari sistem (koreksi masuk)'}
                {selisih < 0 && 'Stok fisik lebih sedikit dari sistem (koreksi keluar)'}
                {selisih === 0 && 'Stok fisik sama dengan sistem'}
              </p>
            </div>
          )}

          <div>
            <Label>Catatan</Label>
            <Input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan stock opname (opsional)"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!selectedProduk || !stokFisik || updateStockMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateStockMutation.isPending ? 'Menyimpan...' : 'Simpan Stock Opname'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
