import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createInventoryItem, listInventory } from '@/services/inventaris.service';
import { exportToCSV } from '@/utils/inventaris.utils';

interface ImportExportProps {
  onClose: () => void;
  mode: 'import' | 'export';
  onImportSuccess?: () => void; // Callback untuk refresh data setelah import
  inventoryData?: any[]; // Data inventaris untuk export (optional, akan fetch jika tidak ada)
}

const ImportExport = ({ onClose, mode, onImportSuccess, inventoryData }: ImportExportProps) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState('excel');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Format file tidak didukung. Gunakan Excel (.xlsx, .xls) atau CSV');
        return;
      }
      
      setImportFile(file);
    }
  };

  // Parse CSV file
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentField || currentLine.length > 0) {
          currentLine.push(currentField.trim());
          lines.push(currentLine);
          currentLine = [];
          currentField = '';
        }
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n after \r
        }
      } else {
        currentField += char;
      }
    }

    // Add last line
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      lines.push(currentLine);
    }

    return lines;
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      // Read file
      const text = await importFile.text();
      const lines = parseCSV(text);

      if (lines.length < 2) {
        toast.error('File CSV tidak valid. Minimal harus ada header dan 1 baris data.');
        setIsProcessing(false);
        return;
      }

      // Get header (first line)
      const headers = lines[0].map(h => h.trim().toLowerCase());
      console.log('CSV Headers:', headers);

      // Map header indices
      const headerMap: Record<string, number> = {};
      headers.forEach((header, index) => {
        headerMap[header] = index;
      });

      // Required fields mapping
      const requiredFields = ['nama barang', 'tipe item', 'kategori', 'lokasi', 'kondisi', 'jumlah'];
      const missingFields = requiredFields.filter(field => !headerMap[field]);

      if (missingFields.length > 0) {
        toast.error(`Kolom wajib tidak ditemukan: ${missingFields.join(', ')}`);
        setIsProcessing(false);
        return;
      }

      // Process data rows (skip header)
      const dataRows = lines.slice(1);
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // +2 karena header di line 1, dan index mulai dari 0

        try {
          // Extract data berdasarkan header
          const getValue = (fieldName: string): string => {
            const index = headerMap[fieldName];
            return index !== undefined && row[index] ? row[index].trim() : '';
          };

          const namaBarang = getValue('nama barang');
          const tipeItem = getValue('tipe item');
          const kategori = getValue('kategori');
          const zona = getValue('zona') || 'Gudang Utama';
          const lokasi = getValue('lokasi');
          const kondisi = getValue('kondisi');
          const jumlah = getValue('jumlah');
          const satuan = getValue('satuan') || 'pcs';
          const hargaPerolehan = getValue('harga perolehan');
          const sumber = getValue('sumber') || null;
          const minStock = getValue('min stock');
          const tanggalKedaluwarsa = getValue('tanggal kedaluwarsa');

          // Validasi data wajib
          if (!namaBarang || !tipeItem || !kategori || !lokasi || !kondisi || !jumlah) {
            errors.push(`Baris ${rowNum}: Data wajib tidak lengkap`);
            failedCount++;
            continue;
          }

          // Validasi tipe item
          if (tipeItem !== 'Aset' && tipeItem !== 'Komoditas') {
            errors.push(`Baris ${rowNum}: Tipe Item harus "Aset" atau "Komoditas"`);
            failedCount++;
            continue;
          }

          // Validasi kondisi
          const validKondisi = ['Baik', 'Perlu perbaikan', 'Rusak'];
          if (!validKondisi.includes(kondisi)) {
            errors.push(`Baris ${rowNum}: Kondisi harus salah satu dari: ${validKondisi.join(', ')}`);
            failedCount++;
            continue;
          }

          // Parse numeric values
          const jumlahNum = parseFloat(jumlah);
          if (isNaN(jumlahNum) || jumlahNum < 0) {
            errors.push(`Baris ${rowNum}: Jumlah harus berupa angka >= 0`);
            failedCount++;
            continue;
          }

          const hargaPerolehanNum = hargaPerolehan ? parseFloat(hargaPerolehan) : null;
          if (hargaPerolehan && (isNaN(hargaPerolehanNum!) || hargaPerolehanNum! < 0)) {
            errors.push(`Baris ${rowNum}: Harga Perolehan harus berupa angka >= 0`);
            failedCount++;
            continue;
          }

          const minStockNum = minStock ? parseFloat(minStock) : null;
          if (minStock && (isNaN(minStockNum!) || minStockNum! < 0)) {
            errors.push(`Baris ${rowNum}: Min Stock harus berupa angka >= 0`);
            failedCount++;
            continue;
          }

          // Validasi tanggal kedaluwarsa
          let tanggalKedaluwarsaValid: string | null = null;
          if (tanggalKedaluwarsa) {
            const date = new Date(tanggalKedaluwarsa);
            if (isNaN(date.getTime())) {
              errors.push(`Baris ${rowNum}: Format tanggal kedaluwarsa tidak valid (gunakan YYYY-MM-DD)`);
              failedCount++;
              continue;
            }
            tanggalKedaluwarsaValid = tanggalKedaluwarsa;
          }

          // Validasi sumber
          let sumberValid: 'Pembelian' | 'Donasi' | null = null;
          if (sumber) {
            if (sumber !== 'Pembelian' && sumber !== 'Donasi') {
              errors.push(`Baris ${rowNum}: Sumber harus "Pembelian" atau "Donasi"`);
              failedCount++;
              continue;
            }
            sumberValid = sumber as 'Pembelian' | 'Donasi';
          }

          // Create inventory item
          const payload = {
            nama_barang: namaBarang,
            tipe_item: tipeItem,
            kategori: kategori,
            zona: zona,
            lokasi: lokasi,
            kondisi: kondisi,
            jumlah: jumlahNum,
            satuan: satuan,
            harga_perolehan: hargaPerolehanNum,
            sumber: sumberValid,
            min_stock: minStockNum,
            has_expiry: !!tanggalKedaluwarsaValid,
            tanggal_kedaluwarsa: tanggalKedaluwarsaValid,
          };

          await createInventoryItem(payload);
          successCount++;

        } catch (error: any) {
          console.error(`Error importing row ${rowNum}:`, error);
          errors.push(`Baris ${rowNum}: ${error.message || 'Error tidak diketahui'}`);
          failedCount++;
        }
      }

      // Set result
      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Max 10 errors untuk ditampilkan
      });

      // Show success message
      if (successCount > 0) {
        toast.success(
          `Import berhasil! ${successCount} item berhasil diimpor${failedCount > 0 ? `, ${failedCount} gagal` : ''}`,
          { duration: 5000 }
        );
        
        // Refresh data
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        toast.error(`Import gagal! Semua ${failedCount} item gagal diimpor`);
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Gagal mengimpor file: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      // Fetch data jika tidak disediakan
      let dataToExport = inventoryData;
      
      if (!dataToExport || dataToExport.length === 0) {
        // Fetch semua data inventaris
        const result = await listInventory({ page: 1, pageSize: 10000 }, {});
        dataToExport = result.data || [];
      }

      if (dataToExport.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        setIsProcessing(false);
        return;
      }

      // Format data untuk export sesuai template
      const exportData = dataToExport.map((item) => ({
        'Nama Barang': item.nama_barang || '',
        'Tipe Item': item.tipe_item || '',
        'Kategori': item.kategori || '',
        'Zona': item.zona || '',
        'Lokasi': item.lokasi || '',
        'Kondisi': item.kondisi || '',
        'Jumlah': item.jumlah || 0,
        'Satuan': item.satuan || 'pcs',
        'Harga Perolehan': item.harga_perolehan || 0,
        'Sumber': item.sumber || '',
        'Min Stock': item.min_stock || 0,
        'Tanggal Kedaluwarsa': item.tanggal_kedaluwarsa || '',
        'Total Nilai': (item.jumlah || 0) * (item.harga_perolehan || 0),
        'Tanggal Dibuat': item.created_at || '',
      }));

      // Export menggunakan utility function
      const filename = `inventaris_export_${new Date().toISOString().split('T')[0]}`;
      exportToCSV(exportData, filename);
      
      toast.success(`Data berhasil diekspor! ${dataToExport.length} item diekspor ke ${filename}.csv`);
      onClose();
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Nama Barang', 'Tipe Item', 'Kategori', 'Zona', 'Lokasi', 'Kondisi', 'Jumlah', 'Satuan', 'Harga Perolehan', 'Sumber', 'Min Stock', 'Tanggal Kedaluwarsa'],
      ['Contoh: Beras Cap Bandeng', 'Komoditas', 'Bahan Makanan', 'Gudang A', 'Lt. 1 Gudang', 'Baik', '50', 'kg', '15000', 'Pembelian', '10', '2024-12-31']
    ];
    
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_inventaris.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template berhasil didownload');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {mode === 'import' ? (
              <>
                <Upload className="h-5 w-5" />
                Import Data Inventaris
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export Data Inventaris
              </>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {mode === 'import' ? (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Petunjuk Import</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Gunakan format Excel (.xlsx, .xls) atau CSV</li>
                      <li>• Kolom wajib: Nama Barang, Tipe Item, Kategori, Lokasi, Kondisi, Jumlah</li>
                      <li>• Tipe Item: Aset atau Komoditas</li>
                      <li>• Kondisi: Baik, Rusak, atau Perlu Perbaikan</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-file">Pilih File</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="mt-1"
                  />
                  {importFile && (
                    <p className="text-sm text-green-600 mt-1">
                      File dipilih: {importFile.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`border rounded-lg p-4 ${
                  importResult.success > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {importResult.success > 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-medium mb-2 ${
                        importResult.success > 0 ? 'text-green-900' : 'text-red-900'
                      }`}>
                        Hasil Import
                      </h4>
                      <div className={`text-sm space-y-1 ${
                        importResult.success > 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        <p>✅ Berhasil: {importResult.success} item</p>
                        {importResult.failed > 0 && (
                          <p>❌ Gagal: {importResult.failed} item</p>
                        )}
                        {importResult.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Detail Error:</p>
                            <ul className="list-disc list-inside space-y-1 mt-1">
                              {importResult.errors.map((error, idx) => (
                                <li key={idx} className="text-xs">{error}</li>
                              ))}
                            </ul>
                            {importResult.errors.length >= 10 && (
                              <p className="text-xs mt-1 italic">
                                ... dan {importResult.failed - 10} error lainnya
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleImport} 
                  disabled={!importFile || isProcessing}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isProcessing ? 'Mengimpor...' : 'Import Data'}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  {importResult ? 'Tutup' : 'Batal'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Export Options */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="export-format">Format Export</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-gray-50 border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Data yang akan diekspor:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Semua item inventaris</li>
                    <li>• Informasi stok dan harga</li>
                    <li>• Data sumber (Pembelian/Donasi) dan lokasi</li>
                    <li>• Status kondisi barang</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleExport} 
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isProcessing ? 'Mengekspor...' : 'Export Data'}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Batal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportExport;
