import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Trash2, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function PembelianList() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: pembelianList = [], isLoading } = useQuery({
    queryKey: ['koperasi-pembelian', search],
    queryFn: async () => {
      let query = supabase
        .from('kop_pembelian')
        .select(`
          *,
          supplier:kop_supplier(nama)
        `)
        .order('tanggal', { ascending: false });

      if (search) {
        query = query.or(`nomor_faktur.ilike.%${search}%,supplier_nama.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kop_pembelian')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['koperasi-pembelian'] });
      toast.success('Pembelian berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus pembelian');
    },
  });

  const handleDelete = (id: string, nomor: string) => {
    if (confirm(`Hapus pembelian ${nomor}? Data detail dan pembayaran juga akan terhapus.`)) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      lunas: 'default',
      hutang: 'destructive',
      cicilan: 'secondary',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari nomor faktur atau supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : pembelianList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada data pembelian</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Tanggal</th>
                  <th className="text-left p-3">No. Faktur</th>
                  <th className="text-left p-3">Supplier</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Dibayar</th>
                  <th className="text-right p-3">Sisa</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pembelianList.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="p-3 font-mono text-sm">{item.nomor_faktur}</td>
                    <td className="p-3">{item.supplier?.nama || item.supplier_nama || '-'}</td>
                    <td className="p-3 text-right">
                      Rp {Number(item.total_pembelian || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right">
                      Rp {Number(item.total_bayar || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      Rp {Number(item.sisa_hutang || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(item.status_pembayaran || 'lunas')}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id, item.nomor_faktur)}
                        >
                          <Trash2 className="w-4 h-4" />
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
  );
}
