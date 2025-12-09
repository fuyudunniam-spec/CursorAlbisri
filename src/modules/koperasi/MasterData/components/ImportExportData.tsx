import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ImportExportData() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportProduk = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('kop_barang')
        .select('*')
        .eq('is_active', true)
        .order('nama_barang');

      if (error) throw error;

      // Convert to CSV
      const headers = ['Kode Produk', 'Nama Produk', 'Kategori', 'Satuan', 'Harga Beli', 'Harga Jual Ecer', 'Harga Jual Grosir', 'Barcode', 'Deskripsi'];
      const csvRows = [headers.join(',')];

      data?.forEach((item: any) => {
        const row = [
          item.kode_barang || '',
          `"${item.nama_barang || ''}"`,
          item.kategori_id || '',
          item.satuan_dasar || '',
          item.harga_beli || 0,
          item.harga_jual_ecer || 0,
          item.harga_jual_grosir || 0,
          '', // barcode not in kop_barang
          '', // deskripsi not in kop_barang
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `koperasi_produk_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Data produk berhasil diekspor');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportProduk = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const rows = text.split('\n').slice(1); // Skip header
      
      const products = rows
        .filter(row => row.trim())
        .map(row => {
          const cols = row.split(',');
          return {
            kode_produk: cols[0]?.trim(),
            nama_produk: cols[1]?.replace(/"/g, '').trim(),
            kategori: cols[2]?.trim(),
            satuan: cols[3]?.trim(),
            harga_beli: parseFloat(cols[4]) || 0,
            harga_jual: parseFloat(cols[5]) || 0,
            barcode: cols[6]?.trim(),
            deskripsi: cols[7]?.replace(/"/g, '').trim(),
          };
        });

      // Validate required fields
      const invalid = products.filter(p => !p.kode_produk || !p.nama_produk || !p.satuan);
      if (invalid.length > 0) {
        toast.error(`${invalid.length} baris tidak valid (kode, nama, atau satuan kosong)`);
        return;
      }

      // Get sumber modal Koperasi
      const { data: sumberModal } = await supabase
        .from('kop_sumber_modal')
        .select('id')
        .eq('nama', 'Koperasi')
        .single();

      // Insert to database
      const { error } = await supabase
        .from('kop_barang')
        .upsert(
          products.map(p => ({
            kode_barang: p.kode_produk,
            nama_barang: p.nama_produk,
            kategori_id: null, // Will be set based on kategori if needed
            satuan_dasar: p.satuan,
            harga_beli: p.harga_beli,
            harga_jual_ecer: p.harga_jual,
            harga_jual_grosir: p.harga_jual,
            stok: 0,
            stok_minimum: 5,
            sumber_modal_id: sumberModal?.id || '',
            is_active: true,
          })),
          { onConflict: 'kode_barang' }
        );

      if (error) throw error;

      toast.success(`${products.length} produk berhasil diimpor`);
      
      // Reset input
      event.target.value = '';
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengimpor data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Kode Produk', 'Nama Produk', 'Kategori', 'Satuan', 'Harga Beli', 'Harga Jual', 'Barcode', 'Deskripsi'];
    const example = ['SEMBERAS0001', 'Beras Premium 5kg', 'Sembako', 'pcs', '50000', '55000', '', 'Beras kualitas premium'];
    
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_produk.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Template berhasil diunduh');
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Gunakan fitur import/export untuk mengelola data produk secara massal. 
          Pastikan format CSV sesuai dengan template yang disediakan.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ekspor semua data produk aktif ke file CSV untuk backup atau analisis.
            </p>
            <Button 
              onClick={handleExportProduk} 
              disabled={isExporting}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Mengekspor...' : 'Export Produk ke CSV'}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import data produk dari file CSV. Data yang sudah ada akan diupdate berdasarkan kode produk.
            </p>
            <div className="space-y-2">
              <Button 
                variant="outline"
                onClick={handleDownloadTemplate}
                className="w-full"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Template CSV
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportProduk}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-file"
                />
                <Button 
                  className="w-full"
                  disabled={isImporting}
                  asChild
                >
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {isImporting ? 'Mengimpor...' : 'Import Produk dari CSV'}
                  </label>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Panduan Import CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Format CSV:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Kolom 1: Kode Produk (wajib, unik)</li>
              <li>Kolom 2: Nama Produk (wajib)</li>
              <li>Kolom 3: Kategori (opsional)</li>
              <li>Kolom 4: Satuan (wajib, contoh: pcs, kg, liter)</li>
              <li>Kolom 5: Harga Beli (angka)</li>
              <li>Kolom 6: Harga Jual (angka)</li>
              <li>Kolom 7: Barcode (opsional)</li>
              <li>Kolom 8: Deskripsi (opsional)</li>
            </ul>
            <p className="font-semibold mt-4">Catatan:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Gunakan koma (,) sebagai pemisah kolom</li>
              <li>Teks yang mengandung koma harus diapit tanda kutip (")</li>
              <li>Baris pertama adalah header (akan diabaikan)</li>
              <li>Produk dengan kode yang sama akan diupdate</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
