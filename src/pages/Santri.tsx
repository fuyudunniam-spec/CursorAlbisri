import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  GraduationCap,
  Calendar,
  Phone,
  MapPin,
  User,
  Shield,
  Download,
  Upload,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SantriFormWizard from '@/components/SantriFormWizard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getSafeAvatarUrl } from '@/utils/url.utils';

interface SantriData {
  id: string;
  nis?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin: string;
  kategori: string;
  angkatan: string;
  status_santri: string;
  alamat?: string;
  no_whatsapp?: string;
  foto_profil?: string;
  created_at?: string;
  updated_at?: string;
}

const Santri = () => {
  const navigate = useNavigate();
  const [santriData, setSantriData] = useState<SantriData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSantri, setEditingSantri] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'nama' | 'kategori' | 'status' | 'angkatan' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedSantri, setSelectedSantri] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Load data santri (auto-approved)
  const loadSantriData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSantriData(data || []);
    } catch (error) {
      console.error('Error loading santri data:', error);
      toast.error('Gagal memuat data santri');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSantriData();
  }, []);

  // Filter and sort data
  const filteredData = santriData.filter(santri => {
    const matchesSearch = santri.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         santri.id_santri?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKategori = filterKategori === 'all' || !filterKategori || santri.kategori === filterKategori;
    const matchesStatus = filterStatus === 'all' || !filterStatus || (santri.status_santri || (santri as any).status_baru) === filterStatus;
    
    return matchesSearch && matchesKategori && matchesStatus;
  }).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'nama':
        aValue = a.nama_lengkap.toLowerCase();
        bValue = b.nama_lengkap.toLowerCase();
        break;
      case 'kategori':
        aValue = a.kategori;
        bValue = b.kategori;
        break;
      case 'status':
        aValue = a.status_santri || (a as any).status_baru;
        bValue = b.status_santri || (b as any).status_baru;
        break;
      case 'angkatan':
        aValue = a.angkatan;
        bValue = b.angkatan;
        break;
      case 'created_at':
        aValue = new Date(a.created_at || 0).getTime();
        bValue = new Date(b.created_at || 0).getTime();
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to first page and clear selection when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedSantri([]);
  }, [searchTerm, filterKategori, filterStatus]);

  // Generate inisial nama
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

  // Handle edit
  const handleEdit = (id: string) => {
    setEditingSantri(id);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data santri "${name}"?`)) {
      try {
        const { error } = await supabase
          .from('santri')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        toast.success('Data santri berhasil dihapus');
        loadSantriData();
      } catch (error) {
        console.error('Error deleting santri:', error);
        toast.error('Gagal menghapus data santri');
      }
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
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
            Kelola data santri pesantren Al-Bisri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Export functionality
              const csvContent = [
                ['Nama Lengkap', 'ID Santri', 'NISN', 'Kategori', 'Status', 'Angkatan', 'Umur', 'WhatsApp', 'Tipe Pembayaran'],
                ...filteredData.map(santri => [
                  santri.nama_lengkap,
                  santri.id_santri || '',
                  santri.nisn || '',
                  santri.kategori,
                  santri.status_santri || (santri as any).status_baru,
                  santri.angkatan,
                  santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : '-',
                  santri.no_whatsapp || '',
                  santri.tipe_pembayaran || 'Mandiri'
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `data-santri-${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
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
                <p className="text-sm font-medium text-muted-foreground">Santri Aktif</p>
                <p className="text-2xl font-bold text-green-600">
                  {santriData.filter(s => (s.status_santri || (s as any).status_baru) === 'Aktif').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Santri Mandiri</p>
                <p className="text-2xl font-bold text-blue-600">
                  {santriData.filter(s => s.tipe_pembayaran === 'Mandiri').length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
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

      {/* Enhanced Filters and Controls */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search and Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cari nama santri, ID Santri, atau NISN..."
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
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Non-Aktif">Non Aktif</SelectItem>
                  <SelectItem value="Alumni">Alumni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Sort and Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Urutkan:</span>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nama">Nama</SelectItem>
                      <SelectItem value="kategori">Kategori</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="angkatan">Angkatan</SelectItem>
                      <SelectItem value="created_at">Tanggal Daftar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3"
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Halaman {currentPage} dari {totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    →
                  </Button>
                </div>
              </div>
            </div>
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
              <span>Menampilkan {paginatedData.length} dari {filteredData.length} santri (Total: {santriData.length})</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Tidak ada data santri</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterKategori || filterStatus 
                  ? 'Tidak ada santri yang sesuai dengan filter'
                  : 'Belum ada data santri yang terdaftar'
                }
              </p>
              {!searchTerm && !filterKategori && !filterStatus && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Santri Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold w-12">
                      <input
                        type="checkbox"
                        checked={selectedSantri.length === paginatedData.length && paginatedData.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSantri(paginatedData.map(s => s.id));
                          } else {
                            setSelectedSantri([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Santri</TableHead>
                    <TableHead className="font-semibold">Kategori</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Angkatan</TableHead>
                    <TableHead className="font-semibold">Umur</TableHead>
                    <TableHead className="font-semibold">Kontak</TableHead>
                    <TableHead className="font-semibold">Tipe Pembayaran</TableHead>
                    <TableHead className="font-semibold text-center w-20">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((santri, index) => (
                    <TableRow 
                      key={santri.id} 
                      className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                    >
                      <TableCell className="py-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedSantri.includes(santri.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSantri([...selectedSantri, santri.id]);
                            } else {
                              setSelectedSantri(selectedSantri.filter(id => id !== santri.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 ring-2 ring-muted">
                            <AvatarImage 
                              src={getSafeAvatarUrl(santri.foto_profil)} 
                              alt={santri.nama_lengkap} 
                            />
                            <AvatarFallback className="text-sm font-medium">
                              {generateInitials(santri.nama_lengkap)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">{santri.nama_lengkap}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {santri.id_santri && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  ID: {santri.id_santri}
                                </span>
                              )}
                              {santri.nisn && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  NISN: {santri.nisn}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getCategoryBadgeColor(santri.kategori)} font-medium`}>
                          {santri.kategori}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(santri.status_santri || (santri as any).status_baru)} font-medium`}>
                          {santri.status_santri || (santri as any).status_baru}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{santri.angkatan}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {santri.no_whatsapp ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">{santri.no_whatsapp}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={santri.tipe_pembayaran === 'Bantuan Yayasan' ? 'default' : 'secondary'}
                          className={santri.tipe_pembayaran === 'Bantuan Yayasan' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                        >
                          {santri.tipe_pembayaran || 'Mandiri'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              console.log('🔗 Navigating to profile with:', { santriId: santri.id, santriName: santri.nama_lengkap });
                              navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}`);
                            }}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="font-semibold">Aksi</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(santri.id)} className="cursor-pointer">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Data
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  console.log('🔗 Navigating to profile with:', { santriId: santri.id, santriName: santri.nama_lengkap });
                                  navigate(`/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap)}`);
                                }}
                                className="cursor-pointer"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Lihat Profil
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(santri.id, santri.nama_lengkap)}
                                className="text-red-600 cursor-pointer hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus Santri
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Bulk Actions Bar */}
          {selectedSantri.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 bg-primary/10 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {selectedSantri.length} santri dipilih
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSantri([])}
                  className="h-8 px-3"
                >
                  Batal
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Bulk export selected santri
                    const selectedData = paginatedData.filter(s => selectedSantri.includes(s.id));
                    const csvContent = [
                      ['Nama Lengkap', 'ID Santri', 'NISN', 'Kategori', 'Status', 'Angkatan', 'Umur', 'WhatsApp', 'Tipe Pembayaran'],
                      ...selectedData.map(santri => [
                        santri.nama_lengkap,
                        santri.id_santri || '',
                        santri.nisn || '',
                        santri.kategori,
                        santri.status_santri || (santri as any).status_baru,
                        santri.angkatan,
                        santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : '-',
                        santri.no_whatsapp || '',
                        santri.tipe_pembayaran || 'Mandiri'
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `data-santri-terpilih-${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                  }}
                  className="h-8 px-3"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export Terpilih
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedSantri.length} santri yang dipilih?`)) {
                      // Bulk delete functionality
                      selectedSantri.forEach(id => {
                        handleDelete(id, 'Bulk Delete');
                      });
                      setSelectedSantri([]);
                    }
                  }}
                  className="h-8 px-3"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Hapus Terpilih
                </Button>
              </div>
            </div>
          )}
          
          {/* Pagination Footer */}
          {!isLoading && filteredData.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredData.length)} dari {filteredData.length} santri
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 px-3"
                >
                  Pertama
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3"
                >
                  ← Sebelumnya
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3"
                >
                  Selanjutnya →
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3"
                >
                  Terakhir
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

export default Santri;
