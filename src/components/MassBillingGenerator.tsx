import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Save, 
  Users, 
  DollarSign, 
  Calendar, 
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatRupiah } from '@/utils/inventaris.utils';

interface SantriBilling {
  id: string;
  nama_lengkap: string;
  kategori: string;
  id_santri: string;
  jenjang_sekolah?: string;
  nama_sekolah?: string;
  alamat_sekolah?: string;
  kelas_sekolah?: string;
  nomor_wali_kelas?: string;
  selected: boolean;
}

interface TarifSPP {
  id: string;
  nama_tarif: string;
  jenjang: string;
  kelas?: string;
  nominal_bulanan: number;
}

const MassBillingGenerator: React.FC = () => {
  const [santriList, setSantriList] = useState<SantriBilling[]>([]);
  const [tarifList, setTarifList] = useState<TarifSPP[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [billingData, setBillingData] = useState({
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),
    komponen: 'SPP',
    catatan: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load santri - semua kategori untuk billing
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select(`
          id, nama_lengkap, kategori, id_santri,
          jenjang_sekolah, nama_sekolah, alamat_sekolah, kelas_sekolah, nomor_wali_kelas
        `)
        .eq('status_santri', 'Aktif')
        .order('nama_lengkap');

      if (santriError) throw santriError;

      // Load tarif SPP
      const { data: tarifData, error: tarifError } = await supabase
        .from('tarif_spp')
        .select('*')
        .eq('status', 'aktif')
        .order('jenjang, kelas');

      if (tarifError) throw tarifError;

      // Process santri data
      const processedSantri = santriData?.map(santri => ({
        id: santri.id,
        nama_lengkap: santri.nama_lengkap,
        kategori: santri.kategori,
        id_santri: santri.id_santri,
        jenjang_sekolah: santri.jenjang_sekolah,
        nama_sekolah: santri.nama_sekolah,
        alamat_sekolah: santri.alamat_sekolah,
        kelas_sekolah: santri.kelas_sekolah,
        nomor_wali_kelas: santri.nomor_wali_kelas,
        selected: false
      })) || [];

      setSantriList(processedSantri);
      setTarifList(tarifData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBillingData(prev => ({ 
      ...prev, 
      [name]: name === 'bulan' || name === 'tahun' ? parseInt(value) : value 
    }));
  };

  const handleSantriToggle = (santriId: string) => {
    setSantriList(prev => prev.map(santri => 
      santri.id === santriId 
        ? { ...santri, selected: !santri.selected }
        : santri
    ));
  };

  const handleSelectAll = () => {
    setSantriList(prev => prev.map(santri => ({ ...santri, selected: true })));
  };

  const handleDeselectAll = () => {
    setSantriList(prev => prev.map(santri => ({ ...santri, selected: false })));
  };

  const handleSelectByKategori = (kategori: string) => {
    setSantriList(prev => prev.map(santri => 
      santri.kategori === kategori 
        ? { ...santri, selected: true }
        : santri
    ));
  };

  const getTarifForSantri = (santri: SantriBilling) => {
    // Binaan: Custom bantuan (tidak auto-generate, manual via distribusi bantuan)
    if (santri.kategori.includes('Binaan')) {
      return 0; // Binaan tidak auto-generate, manual via distribusi bantuan
    }

    // Reguler: Auto-generate berdasarkan rumpun kelas (TPQ/Madin)
    if (santri.kategori === 'Reguler') {
      // Find matching tarif by jenjang sekolah (simplified)
      const matchingTarif = tarifList.find(tarif => 
        tarif.jenjang === santri.jenjang_sekolah
      );
      return matchingTarif?.nominal_bulanan || 0;
    }

    // Mahasiswa: Custom tarif (manual input)
    if (santri.kategori === 'Mahasiswa') {
      return 0; // Mahasiswa custom tarif, tidak auto-generate
    }

    return 0;
  };

  const handleGenerateBilling = async () => {
    try {
      setIsGenerating(true);
      
      const selectedSantri = santriList.filter(s => s.selected);
      if (selectedSantri.length === 0) {
        toast.error('Pilih minimal satu santri.');
        return;
      }

      // Prepare billing records - filter out santri without valid tarif
      const validSantri = selectedSantri.filter(santri => {
        const nominal = getTarifForSantri(santri);
        return nominal > 0;
      });

      if (validSantri.length === 0) {
        toast.error('Tidak ada santri dengan tarif SPP yang valid. Pastikan santri memiliki jenjang formal atau tarif khusus.');
        return;
      }

      if (validSantri.length < selectedSantri.length) {
        const invalidCount = selectedSantri.length - validSantri.length;
        toast.warning(`${invalidCount} santri dilewati karena tidak memiliki tarif SPP yang valid.`);
      }

      const billingRecords = validSantri.map(santri => {
        const nominal = getTarifForSantri(santri);

        return {
          santri_id: santri.id,
          periode: `${billingData.tahun}-${billingData.bulan.toString().padStart(2, '0')}`,
          komponen: billingData.komponen,
          nominal: nominal,
          status: 'belum_lunas',
          catatan: billingData.catatan || `SPP ${billingData.bulan}/${billingData.tahun}`,
          created_at: new Date().toISOString()
        };
      });

      // Insert billing records
      const { error } = await supabase
        .from('tagihan_santri')
        .insert(billingRecords);

      if (error) throw error;

      toast.success(`Berhasil generate tagihan untuk ${validSantri.length} santri!`);
      
      // Reset selections
      setSantriList(prev => prev.map(santri => ({ ...santri, selected: false })));
    } catch (error) {
      console.error('Error generating billing:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal generate tagihan');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedSantri = santriList.filter(s => s.selected);
  const totalAmount = selectedSantri.reduce((sum, santri) => sum + getTarifForSantri(santri), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data santri...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Generator Tagihan Massal
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate tagihan SPP untuk santri Reguler dan Mahasiswa
          </p>
        </CardHeader>
      </Card>

      {/* Billing Configuration */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Konfigurasi Tagihan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulan">Bulan</Label>
              <Select 
                name="bulan" 
                value={billingData.bulan.toString()} 
                onValueChange={(value) => setBillingData(prev => ({ ...prev, bulan: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tahun">Tahun</Label>
              <Input
                id="tahun"
                name="tahun"
                type="number"
                value={billingData.tahun}
                onChange={handleInputChange}
                min="2020"
                max="2030"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="komponen">Komponen</Label>
              <Input
                id="komponen"
                name="komponen"
                value={billingData.komponen}
                onChange={handleInputChange}
                placeholder="SPP"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catatan">Catatan (Opsional)</Label>
              <Input
                id="catatan"
                name="catatan"
                value={billingData.catatan}
                onChange={handleInputChange}
                placeholder="Catatan tambahan"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Santri Selection */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pilih Santri</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Pilih Semua
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Batal Semua
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSelectByKategori('Reguler')}>
                Pilih Reguler
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSelectByKategori('Mahasiswa')}>
                Pilih Mahasiswa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">Total Santri Terpilih</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {selectedSantri.length} santri
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-700">Total Tagihan</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatRupiah(totalAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Santri List */}
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pilih</TableHead>
                    <TableHead>Nama Santri</TableHead>
                    <TableHead>ID Santri</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Rumpun/Jenjang</TableHead>
                    <TableHead>Sekolah</TableHead>
                    <TableHead className="text-right">Tarif SPP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {santriList.map(santri => {
                    const tarif = getTarifForSantri(santri);
                    return (
                      <TableRow key={santri.id}>
                        <TableCell>
                          <Checkbox
                            checked={santri.selected}
                            onCheckedChange={() => handleSantriToggle(santri.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{santri.nama_lengkap}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{santri.id_santri}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{santri.kategori}</Badge>
                        </TableCell>
                        <TableCell>
                          {santri.kategori === 'Reguler' ? (
                            <Badge variant="outline">{santri.jenjang_sekolah || '-'}</Badge>
                          ) : santri.kategori === 'Binaan Mukim' ? (
                            <Badge variant="secondary">{santri.jenjang_sekolah || '-'}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {santri.kategori === 'Binaan Mukim' && santri.nama_sekolah ? (
                            <div className="text-sm">
                              <div className="font-medium">{santri.nama_sekolah}</div>
                              <div className="text-muted-foreground">Kelas: {santri.kelas_sekolah || '-'}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {tarif > 0 ? formatRupiah(tarif) : (
                            <span className="text-red-500 text-sm">
                              {santri.kategori.includes('Binaan') ? 'Manual bantuan' : 'Tidak ada tarif'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total tagihan untuk {selectedSantri.length} santri
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatRupiah(totalAmount)}
              </p>
            </div>
            <Button 
              onClick={handleGenerateBilling} 
              disabled={isGenerating || selectedSantri.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Tagihan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Catatan:</strong> 
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>Reguler:</strong> Auto-generate tagihan SPP berdasarkan rumpun kelas (TPQ/Madin)</li>
            <li>• <strong>Mahasiswa:</strong> Custom tarif (manual input)</li>
            <li>• <strong>Binaan:</strong> Manual via distribusi bantuan (tidak auto-generate)</li>
            <li>• <strong>Binaan Mukim:</strong> Memerlukan data sekolah untuk bantuan pendidikan formal</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MassBillingGenerator;
