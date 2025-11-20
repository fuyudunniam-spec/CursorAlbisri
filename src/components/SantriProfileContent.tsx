import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Users, 
  FileText, 
  BookOpen, 
  DollarSign, 
  HandCoins, 
  Activity,
  Eye,
  Calendar,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  AlertTriangle,
  Edit,
  Plus,
  GraduationCap,
  RefreshCw,
  Printer,
  Download,
  Save,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

// Import existing components
import SantriFormWizard from "./SantriFormWizard";
import DokumenSantriTab from "./DokumenSantriTab";
import SantriDataValidationPanel from "./SantriDataValidationPanel";
import SantriDataAggregator from "./SantriDataAggregator";
import SantriPDFExporter from "./SantriPDFExporter";
import BantuanYayasanTab from "./BantuanYayasanTab";

interface SantriProfileContentProps {
  santri?: any;
  activeTab: string;
  mode: 'view' | 'edit' | 'add';
  santriId?: string;
  onDataChange?: (data: any) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

const SantriProfileContent: React.FC<SantriProfileContentProps> = ({
  santri,
  activeTab,
  mode,
  santriId,
  onDataChange,
  onSave,
  onCancel,
}) => {
  const [santriData, setSantriData] = useState<any>(santri);
  const [loading, setLoading] = useState(false);
  const [comprehensiveSummary, setComprehensiveSummary] = useState<any>(null);
  const [showPDFExporter, setShowPDFExporter] = useState(false);
  const [riwayatPendidikan, setRiwayatPendidikan] = useState<any[]>([]);
  const [kondisiKesehatan, setKondisiKesehatan] = useState<any>({});

  // Load comprehensive data when in view mode
  useEffect(() => {
    if (mode === 'view' && santriId && santri) {
      console.log('🔍 Loading santri data in SantriProfileContent:', {
        id: santri.id,
        nama: santri.nama_lengkap,
        nik: santri.nik,
        nisn: santri.nisn,
        hobi: santri.hobi,
        cita_cita: santri.cita_cita,
        id_santri: santri.id_santri
      });
      loadComprehensiveData();
    }
  }, [mode, santriId, santri]);

  // Load additional data for comprehensive view
  useEffect(() => {
    const loadAdditionalData = async () => {
      if (santriId && mode === 'view') {
        try {
          // Load riwayat pendidikan
          const { data: pendidikan } = await supabase
            .from('riwayat_pendidikan')
            .select('*')
            .eq('santri_id', santriId)
            .order('tahun_lulus', { ascending: false });

          // Load kondisi kesehatan
          const { data: kesehatan, error: kesehatanError } = await supabase
            .from('kondisi_kesehatan')
            .select('*')
            .eq('santri_id', santriId)
            .maybeSingle();

          setRiwayatPendidikan(pendidikan || []);
          setKondisiKesehatan(kesehatan || {});
        } catch (error) {
          console.error('Error loading additional data:', error);
        }
      }
    };

    loadAdditionalData();
  }, [santriId, mode]);

  const loadComprehensiveData = async () => {
    if (!santriId || !santri) return;
    
    try {
      setLoading(true);
      const summary = await SantriDataAggregator.getComprehensiveSummary(
        santriId,
        santri.kategori,
        santri.status_sosial
      );
      setComprehensiveSummary(summary);
    } catch (error) {
      console.error('Error loading comprehensive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = () => {
    setShowPDFExporter(true);
  };

  const handleSaveData = async () => {
    if (!santriId || !santriData) return;
    
    try {
      const { error } = await supabase
        .from('santri')
        .update({
          nama_lengkap: santriData.nama_lengkap,
          nisn: santriData.nisn,
          tempat_lahir: santriData.tempat_lahir,
          tanggal_lahir: santriData.tanggal_lahir,
          jenis_kelamin: santriData.jenis_kelamin,
          no_whatsapp: santriData.no_whatsapp,
          alamat: santriData.alamat,
          kategori: santriData.kategori,
          status_sosial: santriData.status_sosial,
          anak_ke: santriData.anak_ke,
          jumlah_saudara: santriData.jumlah_saudara,
          cita_cita: santriData.cita_cita,
          nama_sekolah: santriData.nama_sekolah,
          kelas_sekolah: santriData.kelas_sekolah,
          nomor_wali_kelas: santriData.nomor_wali_kelas,
        })
        .eq('id', santriId);

      if (error) throw error;
      
      toast.success('Data santri berhasil diperbarui');
      if (onDataChange) onDataChange(santriData);
      if (onSave) onSave(); // Call parent's onSave function
    } catch (error) {
      console.error('Error saving santri data:', error);
      toast.error('Gagal menyimpan data santri');
    }
  };

  const isBinaan = santriData?.kategori?.includes('Binaan') || false;
  const isBantuanRecipient = (santriData?.tipe_pembayaran === 'Bantuan Yayasan') || isBinaan;
  const isMukim = santriData?.kategori === 'Binaan Mukim';

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return renderPersonalComprehensive();
      case 'akademik':
        return renderAkademik();
      case 'keuangan':
        return renderKeuangan();
      case 'bantuan':
        return renderBantuan();
      case 'dokumen':
        return renderDokumen();
      default:
        return renderPersonalComprehensive();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Overview Profil Santri</h2>
        {mode === 'view' && (
          <Button onClick={handlePrintPDF} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="ml-3 text-gray-600">Memuat data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                INFORMASI DATA DIRI
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Nama Lengkap</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.nama_lengkap || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">ID Santri</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.id_santri || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">NIK</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.nik || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">NISN</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.nisn || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Hobi</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.hobi || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Tempat Lahir</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.tempat_lahir || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Tanggal Lahir</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.tanggal_lahir ? formatDate(santriData.tanggal_lahir) : '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Jenis Kelamin</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.jenis_kelamin || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">WhatsApp</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.no_whatsapp || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Alamat</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.alamat || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Kategori</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.kategori || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Status Sosial</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.status_sosial || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Status Santri</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.status_santri || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                Akademik
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Program Aktif:</span>
                <span className="font-medium">{comprehensiveSummary?.academic?.total_program || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Program Aktif:</span>
                <span className="font-medium">{comprehensiveSummary?.academic?.program_aktif || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-600" />
                Keuangan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Tipe Pembayaran:</span>
                <Badge variant="outline">{santriData?.tipe_pembayaran || '-'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Tagihan:</span>
                <span className="font-medium">{formatRupiah(comprehensiveSummary?.financial?.total_tagihan || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Pembayaran:</span>
                <span className="font-medium">{formatRupiah(comprehensiveSummary?.financial?.total_pembayaran || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bantuan Aktif:</span>
                <span className="font-medium">{comprehensiveSummary?.bantuan?.total_bantuan_aktif || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Documents Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Dokumen Diunggah:</span>
                <span className="font-medium">{comprehensiveSummary?.documents?.total_uploaded_documents || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dokumen Wajib:</span>
                <span className="font-medium">
                  {comprehensiveSummary?.documents?.uploaded_required_documents || 0}/
                  {comprehensiveSummary?.documents?.total_required_documents || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status Kelengkapan:</span>
                <Badge 
                  variant={comprehensiveSummary?.documents?.is_complete ? "default" : "destructive"}
                  className={comprehensiveSummary?.documents?.is_complete ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                >
                  {comprehensiveSummary?.documents?.is_complete ? "Lengkap" : "Belum Lengkap"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Wali Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Data Wali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Wali:</span>
                <span className="font-medium">{comprehensiveSummary?.wali?.total_wali || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Wali Utama:</span>
                <Badge 
                  variant={comprehensiveSummary?.wali?.has_utama_wali ? "default" : "destructive"}
                  className={comprehensiveSummary?.wali?.has_utama_wali ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                >
                  {comprehensiveSummary?.wali?.has_utama_wali ? "Ada" : "Belum Ada"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Health Summary (for Binaan Mukim) */}
          {isMukim && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-600" />
                  Kesehatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Golongan Darah:</span>
                  <span className="font-medium">{kondisiKesehatan?.golongan_darah || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Riwayat Penyakit:</span>
                  <span className="font-medium">{kondisiKesehatan?.riwayat_penyakit || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Alergi:</span>
                  <span className="font-medium">{kondisiKesehatan?.alergi || '-'}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  const renderPersonalComprehensive = () => {
    return (
      <div className="space-y-8" id="printable-content">
        {/* Header dengan tombol print */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Data Lengkap Santri</h1>
          <div className="flex gap-2">
            {mode === 'view' && (
              <Button 
                onClick={() => window.print()}
                variant="outline"
                className="print:hidden"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Data
              </Button>
            )}
            {mode === 'edit' && (
              <>
                <Button onClick={onCancel} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </Button>
                <Button onClick={handleSaveData}>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Data Pribadi */}
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h2 className="text-2xl font-bold text-gray-900">DATA PRIBADI</h2>
          </div>
          
          {mode === 'view' ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex">
                    <span className="w-1/3 text-sm font-medium text-gray-600">Nama Lengkap</span>
                    <span className="w-1 text-gray-400">:</span>
                    <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.nama_lengkap || '-'}</span>
                  </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">ID Santri</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.id_santri || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Tempat Lahir</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.tempat_lahir || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Tanggal Lahir</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.tanggal_lahir ? formatDate(santriData.tanggal_lahir) : '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Jenis Kelamin</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.jenis_kelamin || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">WhatsApp</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.no_whatsapp || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Alamat</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.alamat || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Kategori</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.kategori || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Status Sosial</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.status_sosial || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Status Santri</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.status_santri || '-'}</span>
                </div>
                {/* Data tambahan untuk kategori Binaan */}
                {(santriData?.kategori?.includes('Binaan')) && (
                  <>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Anak Ke</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.anak_ke || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Jumlah Saudara</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.jumlah_saudara || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Cita-cita</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.cita_cita || '-'}</span>
                    </div>
                  </>
                )}
                {/* Data tambahan untuk kategori Binaan Mukim */}
                {(santriData?.kategori === 'Binaan Mukim') && (
                  <>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Nama Sekolah</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.nama_sekolah || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Kelas Sekolah</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.kelas_sekolah || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Nomor Wali Kelas</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{santriData?.nomor_wali_kelas || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nama Lengkap</label>
                      <input
                        type="text"
                        value={santriData?.nama_lengkap || ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID Santri</label>
                      <input
                        type="text"
                        value={santriData?.id_santri || ''}
                        readOnly
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-generated berdasarkan kategori dan angkatan</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tempat Lahir</label>
                      <input
                        type="text"
                        value={santriData?.tempat_lahir || ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, tempat_lahir: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={santriData?.tanggal_lahir ? santriData.tanggal_lahir.split('T')[0] : ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, tanggal_lahir: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Jenis Kelamin</label>
                      <select
                        value={santriData?.jenis_kelamin || ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, jenis_kelamin: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih Jenis Kelamin</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">WhatsApp</label>
                      <input
                        type="text"
                        value={santriData?.no_whatsapp || ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, no_whatsapp: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Alamat</label>
                      <textarea
                        value={santriData?.alamat || ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, alamat: e.target.value }))}
                        rows={3}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Kategori</label>
                      <select
                        value={santriData?.kategori || ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, kategori: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih Kategori</option>
                        <option value="Reguler">Reguler</option>
                        <option value="Binaan Mukim">Binaan Mukim</option>
                        <option value="Binaan Non-Mukim">Binaan Non-Mukim</option>
                        <option value="Mahasiswa">Mahasiswa</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status Sosial</label>
                      <select
                        value={santriData?.status_sosial || ''}
                        onChange={(e) => setSantriData(prev => ({ ...prev, status_sosial: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih Status Sosial</option>
                        <option value="Yatim">Yatim</option>
                        <option value="Piatu">Piatu</option>
                        <option value="Yatim Piatu">Yatim Piatu</option>
                        <option value="Dhuafa">Dhuafa</option>
                      </select>
                    </div>
                    {/* Data tambahan untuk kategori Binaan */}
                    {(santriData?.kategori?.includes('Binaan')) && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Anak Ke</label>
                          <input
                            type="number"
                            value={santriData?.anak_ke || ''}
                            onChange={(e) => setSantriData(prev => ({ ...prev, anak_ke: e.target.value === '' ? undefined : Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Jumlah Saudara</label>
                          <input
                            type="number"
                            value={santriData?.jumlah_saudara || ''}
                            onChange={(e) => setSantriData(prev => ({ ...prev, jumlah_saudara: e.target.value === '' ? undefined : Number(e.target.value) }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Cita-cita</label>
                          <input
                            type="text"
                            value={santriData?.cita_cita || ''}
                            onChange={(e) => setSantriData(prev => ({ ...prev, cita_cita: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                    {/* Data tambahan untuk kategori Binaan Mukim */}
                    {(santriData?.kategori === 'Binaan Mukim') && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Nama Sekolah</label>
                          <input
                            type="text"
                            value={santriData?.nama_sekolah || ''}
                            onChange={(e) => setSantriData(prev => ({ ...prev, nama_sekolah: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Kelas Sekolah</label>
                          <input
                            type="text"
                            value={santriData?.kelas_sekolah || ''}
                            onChange={(e) => setSantriData(prev => ({ ...prev, kelas_sekolah: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Nomor Wali Kelas</label>
                          <input
                            type="text"
                            value={santriData?.nomor_wali_kelas || ''}
                            onChange={(e) => setSantriData(prev => ({ ...prev, nomor_wali_kelas: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      {/* Data Wali */}
      <div className="space-y-4">
        <div className="border-l-4 border-green-500 pl-4">
          <h2 className="text-2xl font-bold text-gray-900">DATA WALI/ORANG TUA</h2>
        </div>
        
        {comprehensiveSummary?.wali?.wali_data && comprehensiveSummary.wali.wali_data.length > 0 ? (
          comprehensiveSummary.wali.wali_data.map((wali: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Wali {index + 1}
                  {wali.is_utama && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Utama
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex">
                    <span className="w-1/3 text-sm font-medium text-gray-600">Nama Lengkap</span>
                    <span className="w-1 text-gray-400">:</span>
                    <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.nama_lengkap || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-1/3 text-sm font-medium text-gray-600">Status Hubungan</span>
                    <span className="w-1 text-gray-400">:</span>
                    <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.status_hubungan || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-1/3 text-sm font-medium text-gray-600">No. WhatsApp</span>
                    <span className="w-1 text-gray-400">:</span>
                    <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.no_whatsapp || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-1/3 text-sm font-medium text-gray-600">Pekerjaan</span>
                    <span className="w-1 text-gray-400">:</span>
                    <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.pekerjaan || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-1/3 text-sm font-medium text-gray-600">Alamat</span>
                    <span className="w-1 text-gray-400">:</span>
                    <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.alamat || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Belum Ada Data Wali</h3>
              <p className="text-gray-600">Data wali belum diisi untuk santri ini.</p>
            </CardContent>
          </Card>
        )}
      </div>

        {/* Riwayat Pendidikan */}
        <div className="space-y-4">
          <div className="border-l-4 border-purple-500 pl-4">
            <h2 className="text-2xl font-bold text-gray-900">RIWAYAT PENDIDIKAN</h2>
          </div>
          
          {riwayatPendidikan && riwayatPendidikan.length > 0 ? (
            riwayatPendidikan.map((pendidikan: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    Pendidikan {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Jenjang Pendidikan</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{pendidikan.jenjang || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Nama Sekolah</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{pendidikan.nama_sekolah || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Tahun Masuk</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{pendidikan.tahun_masuk || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Tahun Lulus</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{pendidikan.tahun_lulus || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Belum Ada Riwayat Pendidikan</h3>
                <p className="text-gray-600">Data riwayat pendidikan belum diisi untuk santri ini.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Data Kesehatan */}
        <div className="space-y-4">
          <div className="border-l-4 border-red-500 pl-4">
            <h2 className="text-2xl font-bold text-gray-900">DATA KESEHATAN</h2>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Golongan Darah</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.golongan_darah || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Tinggi Badan</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.tinggi_badan ? `${kondisiKesehatan.tinggi_badan} cm` : '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Berat Badan</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.berat_badan ? `${kondisiKesehatan.berat_badan} kg` : '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Riwayat Penyakit</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.riwayat_penyakit || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Alergi</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.alergi || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Kondisi Khusus</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.kondisi_khusus || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Kontak Darurat - Nama</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.kontak_darurat_nama || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Kontak Darurat - Nomor</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.kontak_darurat_nomor || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-1/3 text-sm font-medium text-gray-600">Hubungan Kontak Darurat</span>
                  <span className="w-1 text-gray-400">:</span>
                  <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{kondisiKesehatan?.kontak_darurat_hubungan || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer untuk print */}
        <div className="text-center text-gray-500 text-sm print:block hidden">
          <p>Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
          <p>Pesantren Al-Bisri</p>
        </div>
      </div>
    );
  };

  const renderWali = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Data Wali/Orang Tua</h2>
        {mode === 'edit' && (
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveData}>
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        )}
      </div>

      {mode === 'view' ? (
        <div className="space-y-6">
          {comprehensiveSummary?.wali?.wali_data && comprehensiveSummary.wali.wali_data.length > 0 ? (
            comprehensiveSummary.wali.wali_data.map((wali: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    INFORMASI DATA WALI/ORANG TUA
                    {wali.is_utama && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        Utama
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Nama Lengkap</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.nama_lengkap || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Status Hubungan</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.status_hubungan || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">No. WhatsApp</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.no_whatsapp || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Pekerjaan</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.pekerjaan || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-1/3 text-sm font-medium text-gray-600">Alamat</span>
                      <span className="w-1 text-gray-400">:</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 ml-3">{wali.alamat || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Belum Ada Data Wali</h3>
                <p className="text-gray-600">Data wali belum diisi untuk santri ini.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <SantriFormWizard
          santriId={santriId}
          initialTab="wali"
          onClose={onCancel || (() => {})}
          onSave={onSave || (() => {})}
        />
      )}
    </div>
  );

  const renderBantuan = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Bantuan Yayasan</h2>
        <div className="text-sm text-gray-600">
          Transparansi bantuan untuk santri {isMukim ? 'Mukim' : 'Non-Mukim'}
        </div>
      </div>

      {/* Bantuan Yayasan Tab Component */}
      {mode === 'view' && santriId ? (
        <BantuanYayasanTab
          santriId={santriId}
          santriName={santriData?.nama_lengkap}
          santriNisn={santriData?.nisn}
          santriIdSantri={santriData?.id_santri}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-600">
              <HandCoins className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Bantuan Yayasan akan ditampilkan di mode view.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDokumen = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dokumen Santri</h2>
        {mode === 'edit' && (
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveData}>
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        )}
      </div>

      <DokumenSantriTab 
        santriId={santriId || ''} 
        santriData={{
          status_sosial: santriData?.status_sosial,
          nama_lengkap: santriData?.nama_lengkap || '',
          kategori: santriData?.kategori || ''
        }}
        isBantuanRecipient={isBantuanRecipient}
        mode={mode}
      />
    </div>
  );

  const renderAkademik = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Data Akademik</h2>
        {mode === 'edit' && (
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveData}>
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">Data akademik dan program akan ditampilkan di sini.</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderKeuangan = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Data Keuangan</h2>
        {mode === 'edit' && (
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveData}>
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        )}
      </div>

      {/* Bantuan Yayasan Details for Binaan */}
      {isBinaan && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <HandCoins className="w-5 h-5" />
              Detail Bantuan Yayasan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Komponen Bantuan</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>SPP Pesantren:</span>
                    <span className="font-medium">Rp 500.000</span>
                  </div>
                  {isMukim && (
                    <div className="flex justify-between text-sm">
                      <span>Pendidikan Formal:</span>
                      <span className="font-medium">Rp 300.000</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Total Bantuan:</span>
                    <span className="text-green-700">
                      {isMukim ? 'Rp 800.000' : 'Rp 500.000'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Informasi Sekolah</h4>
                {isMukim && santriData?.nama_sekolah ? (
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Sekolah:</span> {santriData.nama_sekolah}</div>
                    <div><span className="font-medium">Kelas:</span> {santriData.kelas_sekolah || '-'}</div>
                    <div><span className="font-medium">Wali Kelas:</span> {santriData.nomor_wali_kelas || '-'}</div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Informasi sekolah belum diisi</p>
                )}
              </div>
            </div>
            
            <div className="bg-green-100 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Status:</strong> Anda menerima bantuan yayasan {isMukim ? 'mukim' : 'non-mukim'} 
                {isMukim ? ' yang mencakup asrama, makan, dan pendidikan formal' : ' untuk pendidikan pesantren'}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderPendidikan = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Riwayat Pendidikan</h2>
        {mode === 'edit' && (
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveData}>
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        )}
      </div>

      {mode === 'view' ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Riwayat pendidikan akan ditampilkan di sini.</p>
          </CardContent>
        </Card>
      ) : (
        <SantriFormWizard
          santriId={santriId}
          initialTab="pendidikan"
          onClose={onCancel || (() => {})}
          onSave={onSave || (() => {})}
        />
      )}
    </div>
  );

  const renderKesehatan = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Kondisi Kesehatan</h2>
        {mode === 'edit' && (
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveData}>
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        )}
      </div>

      {mode === 'view' ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Data kesehatan akan ditampilkan di sini.</p>
          </CardContent>
        </Card>
      ) : (
        <SantriFormWizard
          santriId={santriId}
          initialTab="kesehatan"
          onClose={onCancel || (() => {})}
          onSave={onSave || (() => {})}
        />
      )}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        {renderContent()}
      </div>
      
      {/* PDF Exporter Modal */}
      {showPDFExporter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <SantriPDFExporter
                santri={santriData}
                comprehensiveSummary={comprehensiveSummary}
                onClose={() => setShowPDFExporter(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SantriProfileContent;
