import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';

export default function TransferHistoryList() {
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfer-history'],
    queryFn: async () => {
      // Fetch transfers with inventaris
      const { data: transferData, error: transferError } = await supabase
        .from('asset_transfer_log')
        .select(`
          *,
          inventaris:inventaris(id, nama_barang, satuan, kategori)
        `)
        .order('transfer_date', { ascending: false });

      if (transferError) throw transferError;
      if (!transferData) return [];

      // Fetch user profiles separately
      const userIds = [...new Set(transferData.map(t => t.transferred_by).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      // Combine data
      return transferData.map(transfer => ({
        ...transfer,
        creator_name: profilesMap.get(transfer.transferred_by) || 'Unknown'
      }));
    },
  });

  // Group by transfer_reference
  const groupedTransfers = transfers.reduce((acc, transfer) => {
    const key = transfer.transfer_reference;
    if (!acc[key]) {
      acc[key] = {
        no_transfer: transfer.transfer_reference,
        tanggal: transfer.transfer_date || transfer.created_at,
        status: transfer.status,
        keterangan: transfer.notes,
        created_by: (transfer as any).creator_name || 'Unknown',
        items: [],
        total_nilai: 0,
      };
    }
    acc[key].items.push({
      nama_item: transfer.inventaris?.nama_barang || 'Unknown',
      satuan: transfer.inventaris?.satuan || '',
      jumlah: transfer.quantity_transferred,
      harga: transfer.harga_transfer,
      subtotal: Number(transfer.quantity_transferred || 0) * Number(transfer.harga_transfer || 0),
    });
    acc[key].total_nilai += Number(transfer.quantity_transferred || 0) * Number(transfer.harga_transfer || 0);
    return acc;
  }, {} as Record<string, any>);

  const transferList = Object.values(groupedTransfers);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">Loading...</CardContent>
      </Card>
    );
  }

  if (transferList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transfer</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          <ArrowRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Belum ada riwayat transfer</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Transfer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transferList.map((transfer) => (
            <div key={transfer.no_transfer} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold">{transfer.no_transfer}</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Tujuan: Koperasi
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(transfer.tanggal), 'dd MMMM yyyy HH:mm', { locale: id })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Oleh: {transfer.created_by}
                  </div>
                </div>
                <Badge variant={transfer.status === 'active' ? 'default' : 'secondary'}>
                  {transfer.status === 'active' ? 'Aktif' : transfer.status}
                </Badge>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {transfer.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                    <div>
                      <span className="font-medium">{item.nama_item}</span>
                      <span className="text-muted-foreground ml-2">
                        {item.jumlah} {item.satuan} × Rp {Number(item.harga).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="font-semibold">
                      Rp {Number(item.subtotal).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t font-semibold">
                <span>Total Nilai:</span>
                <span>Rp {Number(transfer.total_nilai).toLocaleString('id-ID')}</span>
              </div>

              {transfer.keterangan && (
                <div className="text-sm text-muted-foreground">
                  <strong>Keterangan:</strong> {transfer.keterangan}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
