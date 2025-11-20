import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Users,
  GraduationCap,
  Calendar,
  Phone,
  MapPin,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  BookOpen,
  UserCheck,
  AlertCircle,
  User,
  MoreVertical,
  Trash2,
  Settings,
  UserX,
  UserCheck2,
  GraduationCap as Alumni
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SantriFormWizard from '@/components/SantriFormWizard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getSafeAvatarUrl } from '@/utils/url.utils';

interface SantriData {
  id: string;
  id_santri?: string;
  nisn?: string;
  nis?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin: string;
  kategori: string;
  angkatan: string;
  status_santri: string;
  tipe_pembayaran: string;
  status_approval: string;
  alamat?: string;
  no_whatsapp?: string;
  foto_profil?: string;
  created_at?: string;
  updated_at?: string;
  // Extended fields
  nama_sekolah?: string;
  kelas?: string;
  nomor_wali_kelas?: string;
}

const SantriEnhanced = () => {
  const navigate = useNavigate();
  const [santriData, setSantriData] = useState<SantriData[]>([]);
  const [pendingSantri, setPendingSantri] = useState<SantriData[]>([]);
  const [unplacedSantri, setUnplacedSantri] = useState<SantriData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSantri, setEditingSantri] = useState<string | null>(null);

  // Load all santri data with optimized approach
  const loadSantriData = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      
      // Single query to get all santri data with better performance
      const { data: allSantri, error: allSantriError } = await supabase
        .from('santri')
        .select('*')
        .order('created_at', { ascending: false });

      if (allSantriError) {
        console.error('❌ Error loading santri data:', allSantriError);
        throw allSantriError;
      }


      // Filter data on client side for better performance
      const approved = allSantri?.filter(s => s.status_approval === 'disetujui') || [];
      const pending = allSantri?.filter(s => s.status_approval === 'pending') || [];
      

      setSantriData(approved);
      setPendingSantri(pending);

      // Load unplaced santri separately (more complex query)
      try {
        const { data: unplaced, error: unplacedError } = await supabase
          .from('santri')
          .select(`
            *,
            santri_kelas!left(id)
          `)
          .eq('status_approval', 'disetujui')
          .order('created_at', { ascending: false });

        if (unplacedError) {
          console.warn('Error loading unplaced santri:', unplacedError);
          // Fallback: filter from approved data
          const unplacedFallback = approved.filter(s => {
            // This is a simplified check - in real scenario you'd need to check program assignments
            return true; // For now, show all approved as potentially unplaced
          });
          setUnplacedSantri(unplacedFallback);
        } else {
          // Filter santri that don't have any kelas assigned
          const trulyUnplaced = unplaced?.filter(s => 
            !s.santri_kelas || s.santri_kelas.length === 0
          ) || [];
          setUnplacedSantri(trulyUnplaced);
        }
      } catch (unplacedError) {
        console.warn('Error loading unplaced santri, using fallback:', unplacedError);
        setUnplacedSantri(approved);
      }

    } catch (error) {
      console.error('Error loading santri data:', error);
      
      if (retryCount < 2) {
        console.log(`Retrying loadSantriData (attempt ${retryCount + 1}/2)`);
        // Use setTimeout with cleanup to prevent memory leaks
        const timeoutId = setTimeout(() => {
          loadSantriData(retryCount + 1);
        }, 3000 * (retryCount + 1));
        
        // Return cleanup function
        return () => clearTimeout(timeoutId);
      }
      
      toast.error('Gagal memuat data santri. Silakan refresh halaman.');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await loadSantriData();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Filter data for list tab
  const filteredData = santriData.filter(santri => {
    const matchesSearch = santri.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (santri.id_santri && santri.id_santri.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesKategori = filterKategori === 'all' || !filterKategori || santri.kategori === filterKategori;
    
    return matchesSearch && matchesKategori;
  });


  // Generate initials
  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate age
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  // Handle approval
  const handleApproval = async (santriId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const { error } = await supabase
        .from('santri')
        .update({
          status_approval: action === 'approve' ? 'disetujui' : 'ditolak',
          approved_at: new Date().toISOString(),
          catatan_approval: notes || null,
        })
        .eq('id', santriId);

      if (error) throw error;

      toast.success(`Santri berhasil di${action === 'approve' ? 'setujui' : 'tolak'}`);
      loadSantriData();
    } catch (error) {
      console.error('Error handling approval:', error);
      toast.error('Gagal memproses approval');
    }
  };

  const handleStatusChange = async (santriId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('santri')
        .update({ status_santri: newStatus, status_baru: newStatus })
        .eq('id', santriId);

      if (error) throw error;

      toast.success(`Status santri berhasil diubah menjadi ${newStatus}`);
      loadSantriData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal mengupdate status santri');
    }
  };

  const handleKategoriChange = async (santriId: string, newKategori: string) => {
    try {
      const { error } = await supabase
        .from('santri')
        .update({ 
          kategori: newKategori
        })
        .eq('id', santriId);

      if (error) throw error;

      toast.success(`Kategori santri berhasil diubah menjadi ${newKategori}`);
      loadSantriData();
      
      // Show notification about required fields/documents
      if (newKategori === 'Binaan Mukim' || newKategori === 'Binaan Non-Mukim') {
        toast.info('Santri sekarang memerlukan dokumen tambahan sesuai kategori binaan. Silakan lengkapi data di profile santri.');
      }
    } catch (error) {
      console.error('Error updating kategori:', error);
      toast.error('Gagal mengupdate kategori santri');
    }
  };

  const handleDeleteSantri = async (santriId: string, santriName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus santri "${santriName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      // Delete related data first
      await supabase.from('santri_wali').delete().eq('santri_id', santriId);
      await supabase.from('riwayat_pendidikan').delete().eq('santri_id', santriId);
      await supabase.from('kondisi_kesehatan').delete().eq('santri_id', santriId);
      await supabase.from('dokumen_santri').delete().eq('santri_id', santriId);
      await supabase.from('tagihan_santri').delete().eq('santri_id', santriId);
      await supabase.from('santri_kelas').delete().eq('santri_id', santriId);

      // Delete santri
      const { error } = await supabase
        .from('santri')
        .delete()
        .eq('id', santriId);

      if (error) throw error;

      toast.success(`Santri "${santriName}" berhasil dihapus`);
      loadSantriData();
    } catch (error) {
      console.error('Error deleting santri:', error);
      toast.error('Gagal menghapus santri');
    }
  };


  // Handle class placement
  const handleClassPlacement = async (santriId: string, kelas: string, rombel: string, tingkat: string = 'Dasar') => {
    try {
      const { error } = await supabase
        .from('santri_kelas')
        .insert({
          santri_id: santriId,
          kelas_program: kelas,
          rombel: rombel,
          tingkat: tingkat,
          tahun_ajaran: '2024/2025',
          semester: 'Ganjil',
          status_kelas: 'Aktif'
        });

      if (error) throw error;

      toast.success('Santri berhasil ditempatkan');
      loadSantriData();
    } catch (error) {
      console.error('Error placing santri:', error);
      toast.error('Gagal menempatkan santri');
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Aktif':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Non-Aktif':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Alumni':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get category badge color
  const getCategoryBadgeColor = (kategori: string) => {
    switch (kategori) {
      case 'Reguler':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Binaan Mukim':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Binaan Non-Mukim':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Mahasiswa':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Santri Card Component
  const SantriCard = ({ santri, showActions = true, actionType = 'default' }: { 
    santri: SantriData; 
    showActions?: boolean;
    actionType?: 'default' | 'approval' | 'placement';
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header dengan foto dan nama */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={getSafeAvatarUrl(santri.foto_profil)} />
            <AvatarFallback className="text-sm">
              {generateInitials(santri.nama_lengkap)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{santri.nama_lengkap}</h3>
            <p className="text-sm text-muted-foreground">ID: {santri.id_santri || 'Belum ada'}</p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getStatusBadgeColor(santri.status_santri || (santri as any).status_baru)}>
            {santri.status_santri || (santri as any).status_baru}
          </Badge>
          <Badge className={getCategoryBadgeColor(santri.kategori)}>
            {santri.kategori}
          </Badge>
          {santri.tipe_pembayaran === 'Bantuan Yayasan' && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              🎁 Bantuan Yayasan
            </Badge>
          )}
          {santri.tipe_pembayaran === 'Mandiri' && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              💰 Mandiri
            </Badge>
          )}
        </div>

        {/* Info kontak */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{santri.no_whatsapp || 'Belum ada'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{santri.alamat || 'Belum ada'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Daftar: {formatDate(santri.created_at || '')}</span>
          </div>
          {santri.tanggal_lahir && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{calculateAge(santri.tanggal_lahir)} tahun</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex gap-2">
            {actionType === 'default' && (
              <>
                <Button 
                  size="sm" 
                  className="flex-1" 
                  onClick={() => navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}`)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Detail
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setEditingSantri(santri.id);
                    setShowForm(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="px-2">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}&tab=program`)}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Kelola Program
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleStatusChange(santri.id, 'Aktif')}>
                      <UserCheck2 className="w-4 h-4 mr-2" />
                      Set Aktif
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(santri.id, 'Non Aktif')}>
                      <UserX className="w-4 h-4 mr-2" />
                      Set Non Aktif
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(santri.id, 'Alumni')}>
                      <Alumni className="w-4 h-4 mr-2" />
                      Set Alumni
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleKategoriChange(santri.id, 'Reguler')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Ubah ke Reguler
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleKategoriChange(santri.id, 'Binaan Mukim')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Ubah ke Binaan Mukim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleKategoriChange(santri.id, 'Binaan Non-Mukim')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Ubah ke Binaan Non-Mukim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleKategoriChange(santri.id, 'Mahasiswa')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Ubah ke Mahasiswa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteSantri(santri.id, santri.nama_lengkap)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus Santri
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {actionType === 'approval' && (
              <>
                <Button 
                  size="sm" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApproval(santri.id, 'approve')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Setujui
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleApproval(santri.id, 'reject')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Tolak
                </Button>
              </>
            )}
            {actionType === 'placement' && (
              <>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    // Navigate to profile with placement focus
                    navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}&tab=program`);
                  }}
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  Tempatkan
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    // Quick placement action
                    handleClassPlacement(santri.id, 'Kelas A', 'A', 'Dasar');
                  }}
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Quick Assign
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Data Santri
          </h1>
          <p className="text-muted-foreground">
            Kelola data santri, approval, dan penempatan kelas
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingSantri(null);
            setShowForm(true);
          }}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Santri
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Santri</p>
                <p className="text-2xl font-bold text-foreground">{santriData.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Menunggu Approval</p>
                <p className="text-2xl font-bold text-orange-600">{pendingSantri.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Belum Ditempatkan</p>
                <p className="text-2xl font-bold text-blue-600">{unplacedSantri.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Santri Penerima Bantuan</p>
                <p className="text-2xl font-bold text-green-600">
                  {santriData.filter(s => s.tipe_pembayaran === 'Bantuan Yayasan').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Daftar Santri
            {santriData.length > 0 && (
              <Badge variant="secondary" className="ml-1">{santriData.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Menunggu Approval
            {pendingSantri.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingSantri.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="placement" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Penempatan Kelas
            {unplacedSantri.length > 0 && (
              <Badge variant="secondary" className="ml-1">{unplacedSantri.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Daftar Santri */}
        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Cari nama santri atau NIS..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterKategori} onValueChange={setFilterKategori}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="Reguler">Reguler</SelectItem>
                    <SelectItem value="Binaan Mukim">Binaan Mukim</SelectItem>
                    <SelectItem value="Binaan Non-Mukim">Binaan Non-Mukim</SelectItem>
                    <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Data Table */}
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Daftar Santri ({filteredData.length})
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Menampilkan {filteredData.length} santri</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
          {isInitialLoad ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  {isLoading ? 'Memuat data santri...' : 'Menyiapkan tampilan...'}
                </p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Tidak ada data santri</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterKategori 
                  ? 'Tidak ada santri yang sesuai dengan filter'
                  : 'Belum ada data santri yang terdaftar'
                }
              </p>
              {!searchTerm && !filterKategori && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Santri Pertama
                </Button>
              )}
            </div>
          ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/20 border-b">
                        <th className="font-medium text-left py-3 px-3 text-sm">Santri</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Kategori</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Status</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Angkatan</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Kontak</th>
                        <th className="font-medium text-center py-3 px-3 text-sm w-16">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((santri, index) => (
                        <tr 
                          key={santri.id} 
                          className="hover:bg-muted/30 transition-colors border-b border-muted/20"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage 
                                  src={getSafeAvatarUrl(santri.foto_profil)} 
                                  alt={santri.nama_lengkap} 
                                />
                                <AvatarFallback className="text-xs font-medium">
                                  {generateInitials(santri.nama_lengkap)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-foreground truncate">{santri.nama_lengkap}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {santri.id_santri || '-'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-xs">
                              {santri.kategori}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge 
                              variant={santri.status_santri === 'Aktif' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {santri.status_santri || (santri as any).status_baru}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-sm text-muted-foreground">{santri.angkatan}</span>
                          </td>
                          <td className="py-3 px-3">
                            {santri.no_whatsapp ? (
                              <span className="text-sm text-green-600">{santri.no_whatsapp}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}`)}
                                className="h-7 w-7 p-0 hover:bg-primary/10"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs font-semibold">Aksi</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setEditingSantri(santri.id);
                                    setShowForm(true);
                                  }} className="cursor-pointer text-xs">
                                    <Edit className="w-3 h-3 mr-2" />
                                    Edit Data
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}`)}
                                    className="cursor-pointer text-xs"
                                  >
                                    <Eye className="w-3 h-3 mr-2" />
                                    Lihat Profil
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Ubah Kategori</DropdownMenuLabel>
                                  <DropdownMenuItem 
                                    onClick={() => handleKategoriChange(santri.id, 'Reguler')}
                                    className="cursor-pointer text-xs"
                                  >
                                    <Settings className="w-3 h-3 mr-2" />
                                    Reguler
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleKategoriChange(santri.id, 'Binaan Mukim')}
                                    className="cursor-pointer text-xs"
                                  >
                                    <Settings className="w-3 h-3 mr-2" />
                                    Binaan Mukim
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleKategoriChange(santri.id, 'Binaan Non-Mukim')}
                                    className="cursor-pointer text-xs"
                                  >
                                    <Settings className="w-3 h-3 mr-2" />
                                    Binaan Non-Mukim
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleKategoriChange(santri.id, 'Mahasiswa')}
                                    className="cursor-pointer text-xs"
                                  >
                                    <Settings className="w-3 h-3 mr-2" />
                                    Mahasiswa
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Ubah Status</DropdownMenuLabel>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(santri.id, 'Aktif')}
                                    className="cursor-pointer text-xs"
                                  >
                                    <UserCheck2 className="w-3 h-3 mr-2" />
                                    Set Aktif
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(santri.id, 'Non Aktif')}
                                    className="cursor-pointer text-xs"
                                  >
                                    <UserX className="w-3 h-3 mr-2" />
                                    Set Non Aktif
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(santri.id, 'Alumni')}
                                    className="cursor-pointer text-xs"
                                  >
                                    <Alumni className="w-3 h-3 mr-2" />
                                    Set Alumni
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteSantri(santri.id, santri.nama_lengkap)}
                                    className="text-red-600 cursor-pointer hover:bg-red-50 text-xs"
                                  >
                                    <Trash2 className="w-3 h-3 mr-2" />
                                    Hapus Santri
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            </div>
          )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* Tab 2: Menunggu Approval */}
        <TabsContent value="pending" className="space-y-6">
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Menunggu Approval ({pendingSantri.length})
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Menampilkan {pendingSantri.length} santri</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
          {pendingSantri.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Tidak ada santri menunggu approval</h3>
              <p className="text-muted-foreground">Semua pendaftaran sudah diproses</p>
            </div>
          ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/20 border-b">
                        <th className="font-medium text-left py-3 px-3 text-sm">Santri</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Kategori</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Tanggal Daftar</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Kontak</th>
                        <th className="font-medium text-center py-3 px-3 text-sm w-32">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSantri.map((santri, index) => (
                        <tr 
                  key={santri.id} 
                          className="hover:bg-muted/30 transition-colors border-b border-muted/20"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage 
                                  src={getSafeAvatarUrl(santri.foto_profil)} 
                                  alt={santri.nama_lengkap} 
                                />
                                <AvatarFallback className="text-xs font-medium">
                                  {generateInitials(santri.nama_lengkap)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-foreground truncate">{santri.nama_lengkap}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {santri.id_santri || 'ID belum ada'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-xs">
                              {santri.kategori}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-sm text-muted-foreground">{formatDate(santri.created_at || '')}</span>
                          </td>
                          <td className="py-3 px-3">
                            {santri.no_whatsapp ? (
                              <span className="text-sm text-green-600">{santri.no_whatsapp}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-xs h-7"
                                onClick={() => handleApproval(santri.id, 'approve')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Setujui
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7"
                                onClick={() => handleApproval(santri.id, 'reject')}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Tolak
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Penempatan Kelas */}
        <TabsContent value="placement" className="space-y-6">
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Penempatan Kelas ({unplacedSantri.length})
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Menampilkan {unplacedSantri.length} santri</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
          {unplacedSantri.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Semua santri sudah ditempatkan</h3>
              <p className="text-muted-foreground">Tidak ada santri yang perlu penempatan kelas</p>
            </div>
          ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/20 border-b">
                        <th className="font-medium text-left py-3 px-3 text-sm">Santri</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Kategori</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Angkatan</th>
                        <th className="font-medium text-left py-3 px-3 text-sm">Kontak</th>
                        <th className="font-medium text-center py-3 px-3 text-sm w-32">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unplacedSantri.map((santri, index) => (
                        <tr 
                  key={santri.id} 
                          className="hover:bg-muted/30 transition-colors border-b border-muted/20"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage 
                                  src={getSafeAvatarUrl(santri.foto_profil)} 
                                  alt={santri.nama_lengkap} 
                                />
                                <AvatarFallback className="text-xs font-medium">
                                  {generateInitials(santri.nama_lengkap)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-foreground truncate">{santri.nama_lengkap}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {santri.id_santri || 'ID belum ada'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-xs">
                              {santri.kategori}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-sm text-muted-foreground">{santri.angkatan}</span>
                          </td>
                          <td className="py-3 px-3">
                            {santri.no_whatsapp ? (
                              <span className="text-sm text-green-600">{santri.no_whatsapp}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
                                onClick={() => {
                                  navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}&tab=program`);
                                }}
                              >
                                <BookOpen className="w-3 h-3 mr-1" />
                                Tempatkan
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs h-7"
                                onClick={() => {
                                  handleClassPlacement(santri.id, 'Kelas A', 'A', 'Dasar');
                                }}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Quick
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Santri Form Modal */}
      {showForm && (
        <ErrorBoundary>
          <SantriFormWizard
            santriId={editingSantri || undefined}
            onClose={() => {
              setShowForm(false);
              setEditingSantri(null);
            }}
            onSave={async () => {
              try {
                await loadSantriData();
              } catch (error) {
                console.error('Error reloading santri data:', error);
              }
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default SantriEnhanced;
