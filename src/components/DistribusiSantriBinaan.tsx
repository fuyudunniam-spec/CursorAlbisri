import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  Zap, 
  Loader2, 
  Users, 
  Calculator,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  generateAlokasiOverhead, 
  getAlokasiSummary, 
  getAlokasiHistory,
  getPreviewAlokasi,
  formatRupiah,
  getBulanNames,
  getCurrentPeriod,
  AlokasiOverheadBulanan
} from '@/services/alokasiSantriBinaan.service';

const DistribusiSantriBinaan: React.FC = () => {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [alokasi, setAlokasi] = useState<AlokasiOverheadBulanan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<AlokasiOverheadBulanan[]>([]);

  const bulanNames = getBulanNames();

  useEffect(() => {
    loadAlokasi();
    loadHistory();
  }, [bulan, tahun]);

  const loadAlokasi = async () => {
    setIsLoading(true);
    try {
      const data = await getAlokasiSummary(bulan, tahun);
      setAlokasi(data);
    } catch (error) {
      console.error('Error loading alokasi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getAlokasiHistory(12);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadPreview = async () => {
    try {
      const data = await getPreviewAlokasi(bulan, tahun);
      setPreview(data);
    } catch (error) {
      console.error('Error loading preview:', error);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateAlokasiOverhead(bulan, tahun);
      
      if (result.success) {
        toast.success(`✅ Alokasi untuk ${result.data?.jumlah_santri || 0} santri berhasil dibuat!`);
        await loadAlokasi();
        await loadHistory();
      } else {
        toast.error(result.error || 'Gagal generate alokasi');
      }
    } catch (error) {
      console.error('Error generating alokasi:', error);
      toast.error('Gagal generate alokasi');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    await loadPreview();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalized':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Finalized</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Otomatis Generate Alokasi</AlertTitle>
        <AlertDescription>
          Alokasi overhead akan otomatis di-generate setiap kali ada pengeluaran 
          dengan jenis alokasi "Overhead". Anda juga bisa generate ulang manual 
          jika diperlukan.
        </AlertDescription>
      </Alert>

      {/* Header - Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribusi Bantuan Santri Binaan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Bulan</Label>
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
            <div className="space-y-2">
              <Label>Tahun</Label>
              <Select value={tahun.toString()} onValueChange={(v) => setTahun(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
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
              onClick={loadAlokasi}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      {alokasi ? (
        <AlokasiSummaryCard 
          data={alokasi} 
          onRegenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Belum Generate</AlertTitle>
              <AlertDescription>
                Alokasi untuk {bulanNames[bulan]} {tahun} belum dibuat.
                Klik tombol di bawah untuk generate.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 space-y-4">
              <Button 
                onClick={handlePreview}
                variant="outline"
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Preview Alokasi
              </Button>
              
              {preview && (
                <PreviewCard data={preview} />
              )}
              
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Generate Alokasi {bulanNames[bulan]} {tahun}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <AlokasiHistoryCard data={history} />
      )}
    </div>
  );
};

// Alokasi Summary Card Component
const AlokasiSummaryCard: React.FC<{
  data: AlokasiOverheadBulanan;
  onRegenerate: () => void;
  isGenerating: boolean;
}> = ({ data, onRegenerate, isGenerating }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Status Alokasi {data.periode}
          </CardTitle>
          {getStatusBadge(data.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatRupiah(data.total_overhead)}
            </div>
            <div className="text-sm text-blue-600">Total Overhead</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {data.jumlah_santri_binaan_mukim}
            </div>
            <div className="text-sm text-green-600">Santri Binaan Mukim</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatRupiah(data.alokasi_total_per_santri)}
            </div>
            <div className="text-sm text-purple-600">Per Santri</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold">Rincian Pengeluaran Overhead</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">SPP Pendidikan (TPQ/Madin)</span>
                <span className="font-bold text-blue-600">
                  {formatRupiah(data.total_spp_pendidikan)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Alokasi per santri: {formatRupiah(data.alokasi_spp_per_santri)}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Asrama & Kebutuhan</span>
                <span className="font-bold text-green-600">
                  {formatRupiah(data.total_asrama_kebutuhan)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Alokasi per santri: {formatRupiah(data.alokasi_asrama_per_santri)}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={onRegenerate}
            disabled={isGenerating}
            variant="outline"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Generate Ulang
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Laporan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Preview Card Component
const PreviewCard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader>
        <CardTitle className="text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Preview Alokasi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">Total Overhead</div>
            <div className="text-lg font-bold text-blue-600">
              {formatRupiah(data.totalOverhead)}
            </div>
          </div>
          <div>
            <div className="font-medium">Jumlah Santri</div>
            <div className="text-lg font-bold text-green-600">
              {data.jumlahSantri} santri
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>SPP Pendidikan:</span>
            <span className="font-medium">{formatRupiah(data.sppPendidikan)}</span>
          </div>
          <div className="flex justify-between">
            <span>Asrama & Kebutuhan:</span>
            <span className="font-medium">{formatRupiah(data.asramaKebutuhan)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Alokasi per Santri:</span>
            <span className="text-blue-600">{formatRupiah(data.alokasiPerSantri)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// History Card Component
const AlokasiHistoryCard: React.FC<{ data: AlokasiOverheadBulanan[] }> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History Alokasi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={`${item.tahun}-${item.bulan}`} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{item.periode}</div>
                <div className="text-sm text-muted-foreground">
                  {item.jumlah_santri_binaan_mukim} santri • {formatRupiah(item.alokasi_total_per_santri)}/santri
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {formatRupiah(item.total_overhead)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DistribusiSantriBinaan;
