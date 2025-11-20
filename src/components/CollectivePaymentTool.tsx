import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Tag, 
  Banknote, 
  FileText, 
  Info,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatRupiah } from '@/utils/inventaris.utils';

interface SantriOption {
  id: string;
  nama_lengkap: string;
  kategori: string;
  id_santri: string;
}

interface CollectivePaymentData {
  tanggal: string;
  jenis_komponen: string;
  nominal_per_santri: number;
  metode: string;
  catatan: string;
  selectedSantri: string[];
}

const CollectivePaymentTool: React.FC = () => {
  const [santriOptions, setSantriOptions] = useState<SantriOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentData, setPaymentData] = useState<CollectivePaymentData>({
    tanggal: new Date().toISOString().split('T')[0],
    jenis_komponen: '',
    nominal_per_santri: 0,
    metode: 'Tunai',
    catatan: '',
    selectedSantri: []
  });

  useEffect(() => {
    loadSantriOptions();
  }, []);

  const loadSantriOptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('santri')
        .select('id, nama_lengkap, kategori, id_santri')
        .eq('status_santri', 'Aktif')
        .order('nama_lengkap');

      if (error) throw error;
      setSantriOptions(data || []);
    } catch (error) {
      console.error('Error loading santri options:', error);
      toast.error('Gagal memuat data santri');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ 
      ...prev, 
      [name]: name === 'nominal_per_santri' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSantriToggle = (santriId: string) => {
    setPaymentData(prev => ({
      ...prev,
      selectedSantri: prev.selectedSantri.includes(santriId)
        ? prev.selectedSantri.filter(id => id !== santriId)
        : [...prev.selectedSantri, santriId]
    }));
  };

  const handleSelectAll = () => {
    setPaymentData(prev => ({
      ...prev,
      selectedSantri: santriOptions.map(s => s.id)
    }));
  };

  const handleDeselectAll = () => {
    setPaymentData(prev => ({
      ...prev,
      selectedSantri: []
    }));
  };

  const handleSavePayments = async () => {
    try {
      setIsSaving(true);
      
      if (!paymentData.jenis_komponen || paymentData.nominal_per_santri <= 0) {
        toast.error('Jenis komponen dan nominal harus diisi dengan benar.');
        return;
      }

      if (paymentData.selectedSantri.length === 0) {
        toast.error('Pilih minimal satu santri.');
        return;
      }

      // Prepare payment records
      const paymentRecords = paymentData.selectedSantri.map(santriId => ({
        santri_id: santriId,
        tanggal: paymentData.tanggal,
        jenis_komponen: paymentData.jenis_komponen,
        nominal: paymentData.nominal_per_santri,
        metode: paymentData.metode,
        catatan: paymentData.catatan,
        status: 'dibayar'
      }));

      // Insert all payments
      const { error } = await supabase
        .from('bantuan_pembayaran')
        .insert(paymentRecords);

      if (error) throw error;

      toast.success(`Berhasil mencatat pembayaran untuk ${paymentData.selectedSantri.length} santri!`);
      
      // Reset form
      setPaymentData({
        tanggal: new Date().toISOString().split('T')[0],
        jenis_komponen: '',
        nominal_per_santri: 0,
        metode: 'Tunai',
        catatan: '',
        selectedSantri: []
      });
    } catch (error) {
      console.error('Error saving collective payments:', error);
      toast.error('Gagal mencatat pembayaran kolektif');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAmount = paymentData.nominal_per_santri * paymentData.selectedSantri.length;

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
            <Users className="w-5 h-5 text-blue-600" />
            Pencatatan Pembayaran Kolektif
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Catat pembayaran bantuan untuk multiple santri sekaligus
          </p>
        </CardHeader>
      </Card>

      {/* Payment Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Data Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal Pembayaran</Label>
              <Input
                id="tanggal"
                name="tanggal"
                type="date"
                value={paymentData.tanggal}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jenis_komponen">Jenis/Komponen Pembayaran</Label>
              <Input
                id="jenis_komponen"
                name="jenis_komponen"
                placeholder="Contoh: SPP Jan 2025, Seragam, Ujian"
                value={paymentData.jenis_komponen}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nominal_per_santri">Nominal per Santri</Label>
              <Input
                id="nominal_per_santri"
                name="nominal_per_santri"
                type="number"
                placeholder="Contoh: 500000"
                value={paymentData.nominal_per_santri || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metode">Metode Pembayaran</Label>
              <Select 
                name="metode" 
                value={paymentData.metode} 
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, metode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunai">Tunai</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea
              id="catatan"
              name="catatan"
              placeholder="Catatan tambahan untuk pembayaran ini..."
              value={paymentData.catatan}
              onChange={handleInputChange}
              rows={3}
            />
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
                    {paymentData.selectedSantri.length} santri
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-700">Total Pembayaran</p>
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
                    <TableHead className="text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {santriOptions.map(santri => (
                    <TableRow key={santri.id}>
                      <TableCell>
                        <Checkbox
                          checked={paymentData.selectedSantri.includes(santri.id)}
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
                      <TableCell className="text-right font-medium">
                        {formatRupiah(paymentData.nominal_per_santri)}
                      </TableCell>
                    </TableRow>
                  ))}
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
                Total pembayaran untuk {paymentData.selectedSantri.length} santri
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatRupiah(totalAmount)}
              </p>
            </div>
            <Button 
              onClick={handleSavePayments} 
              disabled={isSaving || paymentData.selectedSantri.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Menyimpan...' : 'Simpan Pembayaran Kolektif'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Catatan:</strong> Pembayaran kolektif akan dicatat sebagai bantuan manual untuk setiap santri yang dipilih. 
          Pastikan data yang diisi sudah benar sebelum menyimpan.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default CollectivePaymentTool;
