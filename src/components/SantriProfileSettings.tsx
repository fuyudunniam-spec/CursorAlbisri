import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Users, 
  FileText, 
  BookOpen, 
  DollarSign, 
  HandCoins, 
  Activity,
  Settings,
  Edit,
  Eye,
  Calendar,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import SantriFormWizard from "./SantriFormWizard";
import DokumenSantriTab from "./DokumenSantriTab";

interface SantriProfileSettingsProps {
  santriId: string;
  santriName: string;
  isOpen: boolean;
  onClose: () => void;
}

const SantriProfileSettings: React.FC<SantriProfileSettingsProps> = ({
  santriId,
  santriName,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [santri, setSantri] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editTab, setEditTab] = useState<string>('personal');

  // Load santri data
  const loadSantriData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (error) throw error;
      setSantri(data);
    } catch (error) {
      console.error('Error loading santri data:', error);
      toast.error('Gagal memuat data santri');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && santriId) {
      loadSantriData();
    }
  }, [isOpen, santriId]);

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogTitle className="sr-only">Memuat Data Santri</DialogTitle>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat data santri...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!santri) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogTitle className="sr-only">Data Tidak Ditemukan</DialogTitle>
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Data tidak ditemukan</h3>
            <p className="text-gray-600">Data santri tidak tersedia</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isBantuanRecipient = santri.kategori?.includes('Binaan') || santri.tipe_pembayaran === 'Bantuan Yayasan';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Pengaturan Profil Santri
            </DialogTitle>
            <DialogDescription>
              Kelola data lengkap santri: {santriName}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="wali" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Wali
              </TabsTrigger>
              <TabsTrigger value="academic" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Akademik
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Keuangan
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Dokumen
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              {/* Tab: Overview */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Profile Card */}
                  <Card className="lg:col-span-1">
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-4">
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={getSafeAvatarUrl(santri.foto_profil)} />
                          <AvatarFallback className="text-lg font-bold bg-blue-100 text-blue-700">
                            {generateInitials(santri.nama_lengkap)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <CardTitle className="text-xl">{santri.nama_lengkap}</CardTitle>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline">{santri.status_santri || santri.status_baru}</Badge>
                        <Badge variant="outline">{santri.kategori}</Badge>
                        <Badge variant="outline">{santri.tipe_pembayaran}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">NISN:</span>
                          <span className="font-medium">{santri.nisn || 'Belum ada'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Umur:</span>
                          <span className="font-medium">
                            {santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">WhatsApp:</span>
                          <span className="font-medium">{santri.no_whatsapp || 'Belum ada'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Alamat:</span>
                          <span className="font-medium">{santri.alamat || 'Belum ada'}</span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          setEditTab('personal');
                          setShowEditForm(true);
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Data Pribadi
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Status & Info */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        Status & Informasi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Status Santri</span>
                          </div>
                          <p className="text-lg font-bold text-blue-700">{santri.status_santri || santri.status_baru}</p>
                        </div>
                        
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">Kategori</span>
                          </div>
                          <p className="text-lg font-bold text-green-700">{santri.kategori}</p>
                        </div>
                        
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-900">Tipe Pembayaran</span>
                          </div>
                          <p className="text-lg font-bold text-yellow-700">{santri.tipe_pembayaran}</p>
                        </div>
                        
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Bergabung</span>
                          </div>
                          <p className="text-sm font-bold text-purple-700">
                            {santri.created_at ? formatDate(santri.created_at) : '-'}
                          </p>
                        </div>
                      </div>

                      {isBantuanRecipient && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <HandCoins className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-900">Penerima Bantuan Yayasan</p>
                              <p className="text-sm text-green-700">
                                Santri ini menerima bantuan yayasan berdasarkan kategori {santri.kategori}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab: Personal */}
              <TabsContent value="personal" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Data Pribadi Santri</h3>
                  <Button 
                    onClick={() => {
                      setEditTab('personal');
                      setShowEditForm(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Data
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Informasi Dasar</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nama Lengkap:</span>
                        <span className="font-medium">{santri.nama_lengkap}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tempat Lahir:</span>
                        <span className="font-medium">{santri.tempat_lahir || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tanggal Lahir:</span>
                        <span className="font-medium">
                          {santri.tanggal_lahir ? formatDate(santri.tanggal_lahir) : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jenis Kelamin:</span>
                        <span className="font-medium">{santri.jenis_kelamin}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Kontak & Alamat</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">WhatsApp:</span>
                        <span className="font-medium">{santri.no_whatsapp || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Alamat:</span>
                        <span className="font-medium">{santri.alamat || '-'}</span>
                      </div>
                      {santri.nik && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">NIK:</span>
                          <span className="font-medium">{santri.nik}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab: Wali */}
              <TabsContent value="wali" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Data Wali/Orang Tua</h3>
                  <Button 
                    onClick={() => {
                      setEditTab('wali');
                      setShowEditForm(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Data Wali
                  </Button>
                </div>
                <p className="text-gray-600">Kelola data wali dan orang tua santri</p>
              </TabsContent>

              {/* Tab: Academic */}
              <TabsContent value="academic" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Data Akademik</h3>
                  <Button 
                    onClick={() => {
                      setEditTab('pendidikan');
                      setShowEditForm(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Data Akademik
                  </Button>
                </div>
                <p className="text-gray-600">Kelola program dan kelas santri</p>
              </TabsContent>

              {/* Tab: Financial */}
              <TabsContent value="financial" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Data Keuangan</h3>
                </div>
                
                {isBantuanRecipient ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <HandCoins className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Bantuan Yayasan</h3>
                        <p className="text-gray-600">Santri menerima bantuan yayasan untuk pendidikan</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Manajemen Tagihan</h3>
                        <p className="text-gray-600">Kelola tagihan dan pembayaran santri</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Documents */}
              <TabsContent value="documents" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Dokumen Santri</h3>
                  <Button 
                    onClick={() => {
                      setEditTab('dokumen');
                      setShowEditForm(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Dokumen
                  </Button>
                </div>
                
                <DokumenSantriTab 
                  santriId={santriId} 
                  santriData={{
                    status_sosial: santri.status_sosial,
                    nama_lengkap: santriName,
                    kategori: santri.kategori
                  }}
                  isBantuanRecipient={isBantuanRecipient}
                />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Form Modal */}
      {showEditForm && (
        <SantriFormWizard
          santriId={santriId}
          initialTab={editTab}
          onClose={() => {
            setShowEditForm(false);
            loadSantriData(); // Reload data after edit
          }}
          onSave={() => {
            setShowEditForm(false);
            loadSantriData(); // Reload data after save
          }}
        />
      )}
    </>
  );
};

export default SantriProfileSettings;
