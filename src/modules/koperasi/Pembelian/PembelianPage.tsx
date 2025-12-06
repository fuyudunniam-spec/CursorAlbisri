import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  CreditCard, 
  PackageCheck, 
  Plus,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PembelianList from './components/PembelianList';
import PembelianFormDialog from './components/PembelianFormDialog';
import HutangList from './components/HutangList';
import PenerimaanBarangList from './components/PenerimaanBarangList';

export default function PembelianPage() {
  const [activeTab, setActiveTab] = useState('pembelian');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch hutang count
  const { data: hutangCount = 0 } = useQuery({
    queryKey: ['koperasi-hutang-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kop_pembelian')
        .select('*', { count: 'exact', head: true })
        .in('status_pembayaran', ['hutang', 'cicilan'])
        .gt('sisa_hutang', 0);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch jatuh tempo count
  const { data: jatuhTempoCount = 0 } = useQuery({
    queryKey: ['koperasi-jatuh-tempo-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kop_pembelian')
        .select('*', { count: 'exact', head: true })
        .in('status_pembayaran', ['hutang', 'cicilan'])
        .lt('jatuh_tempo', new Date().toISOString())
        .gt('sisa_hutang', 0);
      
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pembelian & Kulakan</h1>
          <p className="text-muted-foreground">
            Kelola pembelian barang, hutang supplier, dan penerimaan barang
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Pembelian Baru
        </Button>
      </div>

      {jatuhTempoCount > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  {jatuhTempoCount} Hutang Jatuh Tempo!
                </p>
                <p className="text-sm text-muted-foreground">
                  Segera lakukan pembayaran untuk menghindari denda
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pembelian" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="pembelian" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Pembelian</span>
          </TabsTrigger>
          <TabsTrigger value="hutang" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Hutang</span>
            {hutangCount > 0 && (
              <Badge variant="destructive" className="ml-1">{hutangCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="penerimaan" className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Penerimaan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pembelian" className="mt-6">
          <PembelianList />
        </TabsContent>

        <TabsContent value="hutang" className="mt-6">
          <HutangList />
        </TabsContent>

        <TabsContent value="penerimaan" className="mt-6">
          <PenerimaanBarangList />
        </TabsContent>
      </Tabs>

      <PembelianFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
