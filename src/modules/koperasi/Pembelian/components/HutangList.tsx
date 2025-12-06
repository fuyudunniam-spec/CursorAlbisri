import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertTriangle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import PembayaranHutangDialog from './PembayaranHutangDialog';

export default function HutangList() {
  const [selectedPembelian, setSelectedPembelian] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: hutangList = [], isLoading } = useQuery({
    queryKey: ['koperasi-hutang-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_kop_hutang_summary')
        .select('*')
        .order('jatuh_tempo', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleBayar = (item: any) => {
    setSelectedPembelian(item);
    setIsPaymentDialogOpen(true);
  };

  const getStatusBadge = (statusHutang: string) => {
    const config: Record<string, { variant: any; label: string; icon: any }> = {
      jatuh_tempo: { variant: 'destructive', label: 'Jatuh Tempo', icon: AlertTriangle },
      mendekati_jatuh_tempo: { variant: 'secondary', label: 'Segera Jatuh Tempo', icon: Clock },
      aktif: { variant: 'default', label: 'Aktif', icon: CreditCard },
      lunas: { variant: 'outline', label: 'Lunas', icon: CreditCard },
    };

    const { variant, label, icon: Icon } = config[statusHutang] || config.aktif;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getDaysRemaining = (jatuhTempo: string) => {
    if (!jatuhTempo) return null;
    const days = differenceInDays(new Date(jatuhTempo), new Date());
    if (days < 0) return `Terlambat ${Math.abs(days)} hari`;
    if (days === 0) return 'Jatuh tempo hari ini';
    return `${days} hari lagi`;
  };

  return (
    <>
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">Loading...</CardContent>
          </Card>
        ) : hutangList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada hutang aktif</p>
            </CardContent>
          </Card>
        ) : (
          hutangList.map((item: any) => (
            <Card key={item.id} className={item.status_hutang === 'jatuh_tempo' ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.supplier_nama}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Faktur: {item.nomor_faktur} • {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: localeId })}
                    </p>
                  </div>
                  {getStatusBadge(item.status_hutang)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pembelian</p>
                    <p className="font-semibold">
                      Rp {Number(item.total_pembelian || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                    <p className="font-semibold text-green-600">
                      Rp {Number(item.total_bayar || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sisa Hutang</p>
                    <p className="font-semibold text-destructive">
                      Rp {Number(item.sisa_hutang || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
                    <p className="font-semibold">
                      {item.jatuh_tempo ? format(new Date(item.jatuh_tempo), 'dd MMM yyyy', { locale: localeId }) : '-'}
                    </p>
                    {item.jatuh_tempo && (
                      <p className="text-xs text-muted-foreground">
                        {getDaysRemaining(item.jatuh_tempo)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {item.jumlah_cicilan > 0 && (
                      <span>{item.jumlah_cicilan} kali cicilan</span>
                    )}
                  </div>
                  <Button onClick={() => handleBayar(item)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Bayar Hutang
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedPembelian && (
        <PembayaranHutangDialog
          open={isPaymentDialogOpen}
          onClose={() => {
            setIsPaymentDialogOpen(false);
            setSelectedPembelian(null);
          }}
          pembelian={selectedPembelian}
        />
      )}
    </>
  );
}
