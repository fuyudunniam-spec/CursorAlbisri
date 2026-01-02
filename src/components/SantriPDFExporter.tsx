import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Printer, 
  Download, 
  FileText, 
  User, 
  Users, 
  BookOpen, 
  DollarSign, 
  Activity,
  Calendar,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

interface SantriPDFExporterProps {
  santri: any;
  comprehensiveSummary?: any;
  onClose?: () => void;
}

const SantriPDFExporter: React.FC<SantriPDFExporterProps> = ({
  santri,
  comprehensiveSummary,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([
    'identitas',
    'personal',
    'wali',
    'akademik',
    'keuangan',
    'dokumen'
  ]);

  const generateInitials = (name: string) => {
    if (!name || name.trim() === '') return 'SA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isBinaan = santri?.kategori?.includes('Binaan') || false;
  const isMukim = santri?.kategori === 'Binaan Mukim';

  const sections = [
    { id: 'identitas', label: 'Identitas Santri', icon: User, required: true },
    { id: 'personal', label: 'Data Pribadi', icon: User, required: true },
    { id: 'wali', label: 'Data Wali', icon: Users, required: true },
    { id: 'akademik', label: 'Data Akademik', icon: BookOpen, required: false },
    { id: 'keuangan', label: 'Data Keuangan', icon: DollarSign, required: false },
    { id: 'dokumen', label: 'Dokumen', icon: FileText, required: false },
  ];

  if (isMukim) {
    sections.push(
      { id: 'pendidikan', label: 'Riwayat Pendidikan', icon: BookOpen, required: false },
      { id: 'kesehatan', label: 'Kondisi Kesehatan', icon: Activity, required: false }
    );
  }

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      
      // TODO: Implement actual PDF generation
      // This would typically use a library like jsPDF or react-pdf
      
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('PDF berhasil dibuat!');
      
      // TODO: Trigger download
      // const pdfBlob = generatePDF();
      // const url = URL.createObjectURL(pdfBlob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = `profil-santri-${santri.nama_lengkap}.pdf`;
      // link.click();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal membuat PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Aktif":
        return "bg-green-100 text-green-800 border-green-200";
      case "Non Aktif":
      case "NonAktif":
        return "bg-red-100 text-red-800 border-red-200";
      case "Cuti":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Lulus":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export Profil Santri ke PDF</h2>
          <p className="text-gray-600">Pilih bagian yang ingin disertakan dalam dokumen PDF</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        )}
      </div>

      {/* Profile Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Preview Data Santri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={getSafeAvatarUrl(santri?.foto_profil)} />
              <AvatarFallback className="text-lg font-bold bg-blue-100 text-blue-700">
                {generateInitials(santri?.nama_lengkap || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{santri?.nama_lengkap}</h3>
              <p className="text-gray-600">ID Santri: {santri?.id_santri || 'Belum ada'}</p>
              <div className="flex gap-2 mt-2">
                <Badge className={cn("text-xs", getStatusBadgeColor((santri?.status_santri || santri?.status_baru) || ''))}>
                  {santri?.status_santri || santri?.status_baru}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {santri?.kategori}
                </Badge>
                {isBinaan && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    Bantuan Yayasan
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Bagian yang Akan Diexport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map((section) => {
              const isSelected = selectedSections.includes(section.id);
              const isRequired = section.required;
              
              return (
                <div
                  key={section.id}
                  className={cn(
                    "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                    isSelected 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300",
                    isRequired && "bg-gray-50"
                  )}
                  onClick={() => !isRequired && toggleSection(section.id)}
                >
                  <section.icon className={cn(
                    "w-4 h-4",
                    isSelected ? "text-blue-600" : "text-gray-500"
                  )} />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{section.label}</span>
                      {isRequired && (
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-800">
                          Wajib
                        </Badge>
                      )}
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                  
                  {isRequired ? (
                    <Badge variant="outline" className="text-xs bg-gray-100">
                      Terkunci
                    </Badge>
                  ) : (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSection(section.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Opsi Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Format File</label>
              <select className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2">
                <option value="pdf">PDF (Portable Document Format)</option>
                <option value="docx">Word Document (.docx)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ukuran Kertas</label>
              <select className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2">
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">Letter (8.5 × 11 in)</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includePhoto"
              className="w-4 h-4 text-blue-600 rounded"
              defaultChecked
            />
            <label htmlFor="includePhoto" className="text-sm text-gray-700">
              Sertakan foto profil
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeWatermark"
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="includeWatermark" className="text-sm text-gray-700">
              Sertakan watermark "CONFIDENTIAL"
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
        )}
        <Button 
          onClick={handleGeneratePDF}
          disabled={isGenerating || selectedSections.length === 0}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isGenerating ? 'Membuat PDF...' : 'Generate PDF'}
        </Button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Informasi Export:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>PDF akan berisi {selectedSections.length} bagian data santri</li>
              <li>File akan didownload dengan nama: profil-santri-{santri?.nama_lengkap?.toLowerCase().replace(/\s+/g, '-')}.pdf</li>
              <li>Proses export membutuhkan waktu beberapa detik</li>
              <li>Pastikan data santri sudah lengkap sebelum export</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SantriPDFExporter;
