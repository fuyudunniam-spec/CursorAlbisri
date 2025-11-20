import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportExportProps {
  onClose: () => void;
  mode: 'import' | 'export';
}

const ImportExport = ({ onClose, mode }: ImportExportProps) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState('excel');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would implement actual import logic
      console.log('Importing file:', importFile.name);
      
      toast.success(`File ${importFile.name} berhasil diimpor!`);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Gagal mengimpor file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Here you would implement actual export logic
      const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
      
      // Create a dummy download
      const blob = new Blob(['Sample export data'], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Data berhasil diekspor ke ${filename}`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Nama Barang', 'Tipe Item', 'Kategori', 'Zona', 'Lokasi', 'Kondisi', 'Jumlah', 'Satuan', 'Harga Perolehan', 'Supplier', 'Min Stock', 'Tanggal Kedaluwarsa'],
      ['Contoh: Beras Cap Bandeng', 'Komoditas', 'Bahan Makanan', 'Gudang A', 'Lt. 1 Gudang', 'Baik', '50', 'kg', '15000', 'Supplier ABC', '10', '2024-12-31']
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
                  Batal
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
                    <li>• Data supplier dan lokasi</li>
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
