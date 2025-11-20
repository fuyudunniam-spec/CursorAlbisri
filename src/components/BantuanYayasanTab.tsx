import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Gift, 
  Users, 
  Calendar, 
  DollarSign,
  TrendingUp,
  CheckCircle,
  Info,
  RefreshCw,
  Loader2,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getBantuanSantri, 
  formatRupiah, 
  formatDate,
  getBulanNames,
  getCurrentPeriod,
  BantuanSantri
} from '@/services/alokasiSantriBinaan.service';
import { supabase } from '@/integrations/supabase/client';

interface BantuanYayasanTabProps {
  santriId: string;
  santriName?: string;
  santriNisn?: string;
  santriIdSantri?: string;
}

const BantuanYayasanTab: React.FC<BantuanYayasanTabProps> = ({ santriId }) => {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bantuan, setBantuan] = useState<BantuanSantri | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [allTimeSummary, setAllTimeSummary] = useState({
    totalBantuan: 0,
    totalLangsung: 0,
    totalOverhead: 0,
    countBulanBantuan: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const bulanNames = getBulanNames();

  useEffect(() => {
    loadBantuan();
    loadHistory();
    loadAllTimeSummary();
    loadRecentActivity();
  }, [santriId, bulan, tahun]);

  const loadBantuan = async () => {
    setIsLoading(true);
    try {
      const data = await getBantuanSantri(santriId, bulan, tahun);
      setBantuan(data);
    } catch (error) {
      console.error('Error loading bantuan:', error);
      toast.error('Gagal memuat data bantuan');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      // Load last 6 months of data
      const promises = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        promises.push(
          getBantuanSantri(santriId, date.getMonth() + 1, date.getFullYear())
        );
      }
      
      const results = await Promise.all(promises);
      setHistory(results.filter(Boolean));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadAllTimeSummary = async () => {
    try {
      // Query all alokasi_pengeluaran_santri (langsung)
      const { data: langsungData } = await supabase
        .from('alokasi_pengeluaran_santri')
        .select('nominal_alokasi')
        .eq('santri_id', santriId);
      
      // Query all alokasi_overhead_per_santri (overhead)
      const { data: overheadData } = await supabase
        .from('alokasi_overhead_per_santri')
        .select('spp_pendidikan, asrama_kebutuhan, bulan, tahun')
        .eq('santri_id', santriId);
      
      const totalLangsung = (langsungData || []).reduce(
        (sum, item) => sum + (item.nominal_alokasi || 0), 0
      );
      
      const totalOverhead = (overheadData || []).reduce(
        (sum, item) => sum + (item.spp_pendidikan || 0) + (item.asrama_kebutuhan || 0), 0
      );
      
      // Get unique months that have bantuan
      const uniqueMonths = new Set(
        (overheadData || []).map(item => `${item.tahun}-${item.bulan}`)
      );
      
      setAllTimeSummary({
        totalBantuan: totalLangsung + totalOverhead,
        totalLangsung,
        totalOverhead,
        countBulanBantuan: uniqueMonths.size
      });
    } catch (error) {
      console.error('Error loading all-time summary:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from('alokasi_pengeluaran_santri')
        .select('created_at, nominal_alokasi, jenis_bantuan')
        .eq('santri_id', santriId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadBantuan(),      // Reload period detail
        loadHistory(),      // Reload history
        loadAllTimeSummary(), // Reload all-time summary
        loadRecentActivity()  // Reload recent activity
      ]);
      toast.success('Data berhasil di-refresh');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Gagal refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  const totalLangsung = bantuan?.langsung?.reduce((sum, x) => sum + (x.nominal_alokasi || 0), 0) || 0;
  const totalOverhead = (bantuan?.overhead?.spp_pendidikan || 0) + (bantuan?.overhead?.asrama_kebutuhan || 0);
  const totalBantuan = totalLangsung + totalOverhead;

  const isCurrentPeriod = bulan === new Date().getMonth() + 1 && 
                          tahun === new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* All-Time Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bantuan Sejak Bergabung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatRupiah(allTimeSummary.totalBantuan)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Akumulasi {allTimeSummary.countBulanBantuan} bulan
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bantuan Langsung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRupiah(allTimeSummary.totalLangsung)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Buku, kacamata, SPP formal, dll
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bantuan Operasional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatRupiah(allTimeSummary.totalOverhead)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              SPP pendidikan, asrama, konsumsi
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Recent Activity Alert */}
      {recentActivity.length > 0 && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>Aktivitas Terbaru</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {recentActivity.map((item, idx) => (
                <li key={idx} className="text-sm">
                  • {item.jenis_bantuan}: {formatRupiah(item.nominal_alokasi)}
                  {' '}({new Date(item.created_at).toLocaleDateString('id-ID')})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Period Mismatch Alert */}
      {!isCurrentPeriod && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Anda sedang melihat data <strong>{bulanNames[bulan]} {tahun}</strong>.
            {' '}Untuk melihat data terbaru, pilih bulan <strong>{bulanNames[new Date().getMonth() + 1]} {new Date().getFullYear()}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600" />
            Bantuan yang Kamu Terima
          </CardTitle>
          <div className="flex gap-4 items-center">
            <div className="space-y-1">
              <Label>Periode</Label>
              <Select value={bulan.toString()} onValueChange={(v) => setBulan(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bulanNames.slice(1).map((name, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tahun</Label>
              <Select value={tahun.toString()} onValueChange={(v) => setTahun(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 3 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* A. Biaya Langsung */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              A. Pendidikan Formal (Di Luar Pesantren)
            </h3>
            {bantuan?.langsung && bantuan.langsung.length > 0 ? (
              <div className="space-y-3">
                {bantuan.langsung.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{item.jenis_bantuan || item.deskripsi}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.tanggal)} • {item.kategori}
                        {item.sub_kategori && ` • ${item.sub_kategori}`}
                      </div>
                      {item.keterangan && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.keterangan}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-green-600">
                      {formatRupiah(item.nominal_alokasi || item.jumlah)}
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Subtotal Biaya Langsung</span>
                  <span className="text-green-600">{formatRupiah(totalLangsung)}</span>
                </div>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada biaya langsung untuk periode ini
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* B. Biaya Overhead */}
          {bantuan?.overhead && totalOverhead > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Home className="h-4 w-4" />
                B. Pendidikan Internal & Asrama
              </h3>
              
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                {/* Combined SPP + Asrama */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">• SPP (TPQ/MADIN) dan Asrama</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bagian kamu dari operasional pesantren: pendidikan (TPQ/Madin), 
                      makan, tempat tinggal, listrik, air, dan kebutuhan sehari-hari
                    </p>
                  </div>
                  <span className="font-medium text-blue-600 ml-4">
                    {formatRupiah(totalOverhead)} ✨
                  </span>
                </div>
              </div>
              
              <Separator className="my-3" />
              <div className="flex justify-between font-medium text-lg">
                <span>Subtotal Biaya Operasional</span>
                <span className="text-blue-600">{formatRupiah(totalOverhead)} ✨</span>
              </div>
            </div>
          )}
          
          {/* Total */}
          <div className="border-t-2 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Total Bantuan Bulan Ini
              </span>
              <span className="text-primary">{formatRupiah(totalBantuan)}</span>
            </div>
            
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>100% Ditanggung Yayasan</span>
                <span className="font-semibold">{formatRupiah(totalBantuan)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Kontribusi Kamu/Wali</span>
                <span className="font-semibold">Rp 0</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-3">
              ✨ = Bagian kamu dari biaya operasional yayasan (dihitung dari pengeluaran bulan ini)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <HistoryCard data={history} />
      )}
    </div>
  );
};

// History Card Component
const HistoryCard: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          History Bantuan 6 Bulan Terakhir
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => {
            // Calculate period from index (6 months back)
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - index));
            const periodBulan = date.getMonth() + 1;
            const periodTahun = date.getFullYear();
            const periodLabel = `${getBulanNames()[periodBulan]} ${periodTahun}`;
            
            // Fix calculation to use nominal_alokasi instead of jumlah
            const totalLangsung = item?.langsung?.reduce(
              (sum: number, x: any) => sum + (x.nominal_alokasi || 0), 0
            ) || 0;
            const totalOverhead = (item?.overhead?.spp_pendidikan || 0) + 
                                 (item?.overhead?.asrama_kebutuhan || 0);
            const total = totalLangsung + totalOverhead;
            
            return (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">
                    {periodLabel}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {totalLangsung > 0 && `${formatRupiah(totalLangsung)} langsung`}
                    {totalLangsung > 0 && totalOverhead > 0 && ' + '}
                    {totalOverhead > 0 && `${formatRupiah(totalOverhead)} operasional`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {formatRupiah(total)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {total > 0 ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ada bantuan
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Tidak ada</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BantuanYayasanTab;