import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Calendar,
  School
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { PloatingService, SantriForPloating, KelasStats } from '@/services/ploating.service';

const PloatingKelas: React.FC = () => {
  const [santriList, setSantriList] = useState<SantriForPloating[]>([]);
  const [availableKelas, setAvailableKelas] = useState<Array<{kelas: string, tingkat: string}>>([]);
  const [selectedSantri, setSelectedSantri] = useState<SantriForPloating | null>(null);
  const [selectedSantriIds, setSelectedSantriIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sudah' | 'belum'>('all');
  
  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  
  // Form states - simplified
  const [formData, setFormData] = useState({
    kelas_program: '',
    rombel: '',
    tingkat: '',
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil'
  });
  
  // Stats
  const [stats, setStats] = useState<KelasStats>({
    total_approved: 0,
    sudah_diploat: 0,
    belum_diploat: 0,
  });

  // Predefined options
  const tingkatOptions = ['Dasar', 'Menengah', 'Tinggi'];
  const semesterOptions = ['Ganjil', 'Genap'];
  const rombelOptions = ['A', 'B', 'C', 'D', 'E'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [santriData, kelasData, statsData] = await Promise.all([
        PloatingService.getSantriForPloating(),
        PloatingService.getAvailableKelas(),
        PloatingService.getPloatingStats(),
      ]);
      
      setSantriList(santriData);
      setAvailableKelas(kelasData);
      setStats(statsData);
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignDialog = (santri: SantriForPloating) => {
    setSelectedSantri(santri);
    setFormData({
      kelas_program: '',
      rombel: '',
      tingkat: '',
      tahun_ajaran: '2024/2025',
      semester: 'Ganjil'
    });
    setShowAssignDialog(true);
  };

  const handleAssignKelas = async () => {
    if (!selectedSantri || !formData.kelas_program || !formData.tingkat) {
      toast.error('Kelas dan tingkat harus diisi');
      return;
    }

    try {
      await PloatingService.assignKelas({
        santri_id: selectedSantri.id,
        kelas_program: formData.kelas_program,
        rombel: formData.rombel,
        tingkat: formData.tingkat,
        tahun_ajaran: formData.tahun_ajaran,
        semester: formData.semester,
      });
      
      toast.success('Kelas berhasil di-assign');
      setShowAssignDialog(false);
      setFormData({ kelas_program: '', rombel: '', tingkat: '', tahun_ajaran: '2024/2025', semester: 'Ganjil' });
      loadData();
    } catch (error: any) {
      toast.error('Gagal assign kelas: ' + error.message);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedSantriIds.length === 0) {
      toast.error('Pilih minimal 1 santri');
      return;
    }

    if (!formData.kelas_program || !formData.tingkat) {
      toast.error('Kelas dan tingkat harus diisi');
      return;
    }

    try {
      await PloatingService.bulkAssignKelas(selectedSantriIds, {
        kelas_program: formData.kelas_program,
        rombel: formData.rombel,
        tingkat: formData.tingkat,
        tahun_ajaran: formData.tahun_ajaran,
        semester: formData.semester,
      });
      
      toast.success(`${selectedSantriIds.length} santri berhasil di-assign`);
      setShowBulkDialog(false);
      setSelectedSantriIds([]);
      setFormData({ kelas_program: '', rombel: '', tingkat: '', tahun_ajaran: '2024/2025', semester: 'Ganjil' });
      loadData();
    } catch (error: any) {
      toast.error('Gagal bulk assign: ' + error.message);
    }
  };

  const handleRemoveKelas = async (assignmentId: string) => {
    if (!confirm('Hapus assignment kelas ini?')) return;

    try {
      await PloatingService.removeKelas(assignmentId);
      toast.success('Kelas berhasil dihapus');
      loadData();
    } catch (error: any) {
      toast.error('Gagal hapus kelas: ' + error.message);
    }
  };

  const toggleSelectSantri = (santriId: string) => {
    setSelectedSantriIds(prev => 
      prev.includes(santriId)
        ? prev.filter(id => id !== santriId)
        : [...prev, santriId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSantriIds.length === filteredSantri.length) {
      setSelectedSantriIds([]);
    } else {
      setSelectedSantriIds(filteredSantri.map(s => s.id));
    }
  };

  const filteredSantri = santriList.filter(santri => {
    const matchSearch = santri.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       santri.nisn?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchStatus = true;
    if (filterStatus === 'sudah') {
      matchStatus = (santri.kelas?.length || 0) > 0;
    } else if (filterStatus === 'belum') {
      matchStatus = (santri.kelas?.length || 0) === 0;
    }
    
    return matchSearch && matchStatus;
  });

  const getKategoriBadge = (kategori: string) => {
    const colors: Record<string, string> = {
      'Santri Binaan Mukim': 'bg-green-100 text-green-800 border-green-200',
      'Santri Binaan Non-Mukim': 'bg-blue-100 text-blue-800 border-blue-200',
      'Mahasantri Reguler': 'bg-gray-100 text-gray-800 border-gray-200',
      'Mahasantri Bantuan': 'bg-purple-100 text-purple-800 border-purple-200',
      'Santri TPO': 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return (
      <Badge className={colors[kategori] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {kategori}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Aktif': 'bg-green-100 text-green-800',
      'Non-Aktif': 'bg-gray-100 text-gray-800',
      'Lulus': 'bg-blue-100 text-blue-800',
      'Pindah': 'bg-orange-100 text-orange-800',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            Ploating Kelas
          </h1>
          <p className="text-muted-foreground">
            Assign santri ke kelas dan rombel (simplified - no program complexity)
          </p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ kelas_program: '', rombel: '', tingkat: '', tahun_ajaran: '2024/2025', semester: 'Ganjil' });
            setShowBulkDialog(true);
          }}
          disabled={selectedSantriIds.length === 0}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Bulk Assign ({selectedSantriIds.length})
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Santri</p>
                <p className="text-2xl font-bold text-primary">{stats.total_approved}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Sudah Di-ploat</p>
                <p className="text-2xl font-bold text-green-600">{stats.sudah_diploat}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Belum Di-ploat</p>
                <p className="text-2xl font-bold text-amber-600">{stats.belum_diploat}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cari santri..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status Ploating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="sudah">Sudah Di-ploat</SelectItem>
                <SelectItem value="belum">Belum Di-ploat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Santri List */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Daftar Santri</CardTitle>
          <CardDescription>
            {filteredSantri.length} santri ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">Memuat data...</p>
            </div>
          ) : filteredSantri.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Tidak ada santri ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedSantriIds.length === filteredSantri.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Santri</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Kelas Terdaftar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSantri.map((santri) => (
                    <TableRow key={santri.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSantriIds.includes(santri.id)}
                          onCheckedChange={() => toggleSelectSantri(santri.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{santri.nama_lengkap}</div>
                          <div className="text-xs text-muted-foreground">{santri.nisn}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getKategoriBadge(santri.kategori)}</TableCell>
                      <TableCell>
                        {santri.kelas && santri.kelas.length > 0 ? (
                          <div className="space-y-1">
                            {santri.kelas.map((kelas) => (
                              <div key={kelas.id} className="flex items-center gap-2">
                                <School className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {kelas.kelas_program} - {kelas.rombel}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({kelas.tingkat})
                                  </span>
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleRemoveKelas(kelas.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Belum ada</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {santri.kelas && santri.kelas.length > 0 ? (
                          <div className="space-y-1">
                            {santri.kelas.map((kelas) => (
                              <div key={kelas.id}>
                                {getStatusBadge(kelas.status_kelas)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="secondary">Belum Di-ploat</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignDialog(santri)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Kelas - {selectedSantri?.nama_lengkap}</DialogTitle>
            <DialogDescription>
              Pilih kelas dan rombel untuk santri
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="kelas">Kelas *</Label>
              <Input
                id="kelas"
                value={formData.kelas_program}
                onChange={(e) => setFormData({ ...formData, kelas_program: e.target.value })}
                placeholder="Contoh: Kelas 1, Iqro 3, Tahfidz 2"
              />
            </div>

            <div>
              <Label htmlFor="rombel">Rombel</Label>
              <Select
                value={formData.rombel}
                onValueChange={(value) => setFormData({ ...formData, rombel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rombel" />
                </SelectTrigger>
                <SelectContent>
                  {rombelOptions.map((rombel) => (
                    <SelectItem key={rombel} value={rombel}>
                      {rombel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tingkat">Tingkat *</Label>
              <Select
                value={formData.tingkat}
                onValueChange={(value) => setFormData({ ...formData, tingkat: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  {tingkatOptions.map((tingkat) => (
                    <SelectItem key={tingkat} value={tingkat}>
                      {tingkat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tahun_ajaran">Tahun Ajaran</Label>
                <Input
                  id="tahun_ajaran"
                  value={formData.tahun_ajaran}
                  onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                  placeholder="2024/2025"
                />
              </div>
              <div>
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) => setFormData({ ...formData, semester: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesterOptions.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleAssignKelas}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Assign Kelas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Kelas</DialogTitle>
            <DialogDescription>
              Assign kelas ke {selectedSantriIds.length} santri sekaligus
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Kelas yang sama akan di-assign ke semua santri terpilih
            </AlertDescription>
          </Alert>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bulk_kelas">Kelas *</Label>
              <Input
                id="bulk_kelas"
                value={formData.kelas_program}
                onChange={(e) => setFormData({ ...formData, kelas_program: e.target.value })}
                placeholder="Contoh: Kelas 1, Iqro 3, Tahfidz 2"
              />
            </div>

            <div>
              <Label htmlFor="bulk_rombel">Rombel</Label>
              <Select
                value={formData.rombel}
                onValueChange={(value) => setFormData({ ...formData, rombel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rombel" />
                </SelectTrigger>
                <SelectContent>
                  {rombelOptions.map((rombel) => (
                    <SelectItem key={rombel} value={rombel}>
                      {rombel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulk_tingkat">Tingkat *</Label>
              <Select
                value={formData.tingkat}
                onValueChange={(value) => setFormData({ ...formData, tingkat: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  {tingkatOptions.map((tingkat) => (
                    <SelectItem key={tingkat} value={tingkat}>
                      {tingkat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bulk_tahun_ajaran">Tahun Ajaran</Label>
                <Input
                  id="bulk_tahun_ajaran"
                  value={formData.tahun_ajaran}
                  onChange={(e) => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                  placeholder="2024/2025"
                />
              </div>
              <div>
                <Label htmlFor="bulk_semester">Semester</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) => setFormData({ ...formData, semester: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesterOptions.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleBulkAssign}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Assign ke {selectedSantriIds.length} Santri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PloatingKelas;