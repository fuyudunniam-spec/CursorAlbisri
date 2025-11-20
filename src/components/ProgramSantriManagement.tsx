import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  DollarSign, 
  Settings, 
  Users, 
  Calendar,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatDate } from "@/utils/inventaris.utils";
import { toast } from 'sonner';

interface SantriData {
  id: string;
  nama_lengkap: string;
  nis: string;
  kategori: string;
  status_approval: string;
}

interface ProgramSantri {
  id: string;
  nama_program: string;
  kode_program: string;
  kategori: string;
  total_tarif_per_bulan: number;
  deskripsi?: string;
}

interface SantriProgram {
  id: string;
  santri_id: string;
  program_id: string;
  kelas_program: string;
  rombel: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  aktif: boolean;
  subsidi_persen: number;
  total_biaya_final: number;
  // Simplified - no more program_santri reference
}

interface KomponenBiayaProgram {
  id: string;
  program_id: string;
  nama_komponen: string;
  kode_komponen: string;
  tarif_per_bulan: number;
  is_wajib: boolean;
  kategori_keuangan?: string;
  urutan: number;
}

const ProgramSantriManagement: React.FC = () => {
  const { santriId } = useParams<{ santriId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [programs, setPrograms] = useState<ProgramSantri[]>([]);
  const [santriPrograms, setSantriPrograms] = useState<SantriProgram[]>([]);
  const [komponenBiaya, setKomponenBiaya] = useState<KomponenBiayaProgram[]>([]);
  
  // Form states
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showEditProgram, setShowEditProgram] = useState(false);
  const [editingProgram, setEditingProgram] = useState<SantriProgram | null>(null);
  const [newProgramData, setNewProgramData] = useState<Partial<SantriProgram>>({});

  useEffect(() => {
    if (santriId) {
      loadData();
    }
  }, [santriId]);

  useEffect(() => {
    if (programId) {
      loadKomponenBiaya(programId);
    }
  }, [programId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load santri data
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('id, nama_lengkap, nis, kategori, status_approval')
        .eq('id', santriId)
        .single();

      if (santriError) throw santriError;

      // Load available programs - simplified to use kelas options
      const { data: programsData, error: programsError } = await supabase
        .from('santri_kelas')
        .select('DISTINCT kelas_program, tingkat')
        .not('kelas_program', 'is', null)
        .order('kelas_program');

      if (programsError) throw programsError;

      // Load santri programs
      const { data: santriProgramsData, error: santriProgramsError } = await supabase
        .from('santri_kelas')
        .select(`
          *
        `)
        .eq('santri_id', santriId)
        .order('created_at', { ascending: false });

      if (santriProgramsError) throw santriProgramsError;

      setSantri(santriData);
      setPrograms(programsData || []);
      setSantriPrograms(santriProgramsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const loadKomponenBiaya = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('komponen_biaya_program')
        .select('*')
        .eq('program_id', programId)
        .order('urutan');

      if (error) throw error;
      setKomponenBiaya(data || []);
    } catch (error) {
      console.error('Error loading komponen biaya:', error);
      toast.error('Gagal memuat komponen biaya');
    }
  };

  const handleAddProgram = async () => {
    if (!newProgramData.program_id || !newProgramData.kelas_program || !newProgramData.rombel) {
      toast.error('Program, kelas, dan rombel wajib diisi');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('santri_kelas')
        .insert({
          santri_id: santriId,
          program_id: newProgramData.program_id,
          kelas_program: newProgramData.kelas_program,
          rombel: newProgramData.rombel,
          tanggal_mulai: newProgramData.tanggal_mulai || new Date().toISOString().split('T')[0],
          tanggal_selesai: newProgramData.tanggal_selesai,
          aktif: true,
          subsidi_persen: newProgramData.subsidi_persen || 0
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Program berhasil ditambahkan');
      setShowAddProgram(false);
      setNewProgramData({});
      loadData();
    } catch (error: any) {
      toast.error(`Gagal menambah program: ${error.message}`);
      console.error('Error adding program:', error);
    }
  };

  const handleEditProgram = async () => {
    if (!editingProgram) return;

    try {
      const { error } = await supabase
        .from('santri_kelas')
        .update({
          kelas_program: newProgramData.kelas_program,
          rombel: newProgramData.rombel,
          tanggal_mulai: newProgramData.tanggal_mulai,
          tanggal_selesai: newProgramData.tanggal_selesai,
          subsidi_persen: newProgramData.subsidi_persen,
          aktif: newProgramData.aktif
        })
        .eq('id', editingProgram.id);

      if (error) throw error;

      toast.success('Program berhasil diperbarui');
      setShowEditProgram(false);
      setEditingProgram(null);
      setNewProgramData({});
      loadData();
    } catch (error: any) {
      toast.error(`Gagal memperbarui program: ${error.message}`);
      console.error('Error updating program:', error);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      const { error } = await supabase
        .from('santri_kelas')
        .delete()
        .eq('id', programId);

      if (error) throw error;

      toast.success('Program berhasil dihapus');
      loadData();
    } catch (error: any) {
      toast.error(`Gagal menghapus program: ${error.message}`);
      console.error('Error deleting program:', error);
    }
  };

  const handleToggleProgramStatus = async (program: SantriProgram) => {
    try {
      const { error } = await supabase
        .from('santri_kelas')
        .update({ status_kelas: program.aktif ? 'Non-Aktif' : 'Aktif' })
        .eq('id', program.id);

      if (error) throw error;

      toast.success(`Program ${!program.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
      loadData();
    } catch (error: any) {
      toast.error('Gagal mengubah status program');
      console.error('Error toggling program status:', error);
    }
  };

  const openEditDialog = (program: SantriProgram) => {
    setEditingProgram(program);
    setNewProgramData({
      kelas_program: program.kelas_program,
      rombel: program.rombel,
      tanggal_mulai: program.tanggal_mulai,
      tanggal_selesai: program.tanggal_selesai,
      subsidi_persen: program.subsidi_persen,
      aktif: program.aktif
    });
    setShowEditProgram(true);
  };

  const totalBiaya = santriPrograms
    .filter(sp => sp.aktif)
    .reduce((sum, sp) => sum + (sp.total_biaya_final || 0), 0);

  const rataRataSubsidi = santriPrograms.length > 0 
    ? santriPrograms.reduce((sum, sp) => sum + (sp.subsidi_persen || 0), 0) / santriPrograms.length 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/santri/profile?id=${santriId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Profile
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Kelola Program Santri</h1>
            <p className="text-muted-foreground">
              {santri?.nama_lengkap} ({santri?.nisn})
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddProgram(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Program
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Program Aktif</p>
                <p className="text-2xl font-bold text-primary">
                  {santriPrograms.filter(sp => sp.aktif).length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Biaya/Bulan</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatRupiah(totalBiaya)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rata-rata Subsidi</p>
                <p className="text-2xl font-bold text-blue-600">
                  {rataRataSubsidi.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`${santri?.status_approval === 'disetujui' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {santri?.status_approval === 'disetujui' ? 'Disetujui' : 'Menunggu'}
                </Badge>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="programs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="programs">Program Santri</TabsTrigger>
          <TabsTrigger value="details">Detail Biaya</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Program yang Diikuti</CardTitle>
              <CardDescription>
                Kelola program dan kelas yang diikuti santri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {santriPrograms.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Belum ada program</h3>
                  <p className="text-muted-foreground mb-4">
                    Santri belum ditempatkan ke program apapun
                  </p>
                  <Button onClick={() => setShowAddProgram(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Program Pertama
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {santriPrograms.map((program) => (
                    <Card key={program.id} className={`border-l-4 ${program.aktif ? 'border-l-green-500' : 'border-l-gray-300'} hover:shadow-md transition-shadow`}>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          {/* Program Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-lg">{program.kelas_program || 'Kelas Belum Ditentukan'}</h4>
                              <Badge className={`${program.aktif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {program.aktif ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {program.tingkat || 'Tingkat Belum Ditentukan'}
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {program.kelas_program}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {program.rombel}
                              </Badge>
                            </div>
                          </div>

                          {/* Date Info */}
                          <div className="space-y-2">
                            <div className="text-sm">
                              <p><strong>Mulai:</strong> {formatDate(program.tanggal_mulai)}</p>
                              <p><strong>Selesai:</strong> {formatDate(program.tanggal_selesai)}</p>
                            </div>
                          </div>

                          {/* Cost Info */}
                          <div className="space-y-2">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Tarif Program:</span>
                                  <span className="font-medium">{program.rombel || 'Belum Ditentukan'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Subsidi:</span>
                                  <span className="font-medium">{program.subsidi_persen}%</span>
                                </div>
                                <hr className="border-blue-200" />
                                <div className="flex justify-between font-semibold">
                                  <span className="text-blue-900">Biaya Final:</span>
                                  <span className="text-blue-900">{formatRupiah(program.total_biaya_final || 0)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(program)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleToggleProgramStatus(program)}
                            >
                              {program.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Hapus
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Konfirmasi Hapus Program</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus program "{program.kelas_program || 'Kelas Belum Ditentukan'}"? 
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteProgram(program.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Hapus Program
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {komponenBiaya.length > 0 && (
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Detail Komponen Biaya</CardTitle>
                <CardDescription>
                  Breakdown komponen biaya untuk program yang dipilih
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Komponen</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Tarif/Bulan</TableHead>
                      <TableHead>Wajib</TableHead>
                      <TableHead>Kategori</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {komponenBiaya.map((komponen) => (
                      <TableRow key={komponen.id}>
                        <TableCell className="font-medium">{komponen.nama_komponen}</TableCell>
                        <TableCell>{komponen.kode_komponen}</TableCell>
                        <TableCell>{formatRupiah(komponen.tarif_per_bulan)}</TableCell>
                        <TableCell>
                          <Badge variant={komponen.is_wajib ? 'default' : 'outline'}>
                            {komponen.is_wajib ? 'Ya' : 'Tidak'}
                          </Badge>
                        </TableCell>
                        <TableCell>{komponen.kategori_keuangan || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Program Dialog */}
      <Dialog open={showAddProgram} onOpenChange={setShowAddProgram}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Program Santri</DialogTitle>
            <DialogDescription>
              Pilih program dan isi detail untuk santri
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="program_id" className="text-right">Program</Label>
              <Select value={newProgramData.program_id} onValueChange={(value) => setNewProgramData({...newProgramData, program_id: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.nama_program} ({program.kategori})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kelas_program" className="text-right">Kelas</Label>
              <Input
                id="kelas_program"
                value={newProgramData.kelas_program || ''}
                onChange={(e) => setNewProgramData({...newProgramData, kelas_program: e.target.value})}
                className="col-span-3"
                placeholder="Contoh: 1A, 2B, dll"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rombel" className="text-right">Rombel</Label>
              <Input
                id="rombel"
                value={newProgramData.rombel || ''}
                onChange={(e) => setNewProgramData({...newProgramData, rombel: e.target.value})}
                className="col-span-3"
                placeholder="Contoh: A, B, C"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tanggal_mulai" className="text-right">Tanggal Mulai</Label>
              <Input
                id="tanggal_mulai"
                type="date"
                value={newProgramData.tanggal_mulai || ''}
                onChange={(e) => setNewProgramData({...newProgramData, tanggal_mulai: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tanggal_selesai" className="text-right">Tanggal Selesai</Label>
              <Input
                id="tanggal_selesai"
                type="date"
                value={newProgramData.tanggal_selesai || ''}
                onChange={(e) => setNewProgramData({...newProgramData, tanggal_selesai: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subsidi_persen" className="text-right">Subsidi (%)</Label>
              <Input
                id="subsidi_persen"
                type="number"
                min="0"
                max="100"
                value={newProgramData.subsidi_persen || ''}
                onChange={(e) => setNewProgramData({...newProgramData, subsidi_persen: parseFloat(e.target.value)})}
                className="col-span-3"
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProgram(false)}>
              Batal
            </Button>
            <Button onClick={handleAddProgram}>
              Tambah Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={showEditProgram} onOpenChange={setShowEditProgram}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Program Santri</DialogTitle>
            <DialogDescription>
              Ubah detail program untuk santri
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_kelas_program" className="text-right">Kelas</Label>
              <Input
                id="edit_kelas_program"
                value={newProgramData.kelas_program || ''}
                onChange={(e) => setNewProgramData({...newProgramData, kelas_program: e.target.value})}
                className="col-span-3"
                placeholder="Contoh: 1A, 2B, dll"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_rombel" className="text-right">Rombel</Label>
              <Input
                id="edit_rombel"
                value={newProgramData.rombel || ''}
                onChange={(e) => setNewProgramData({...newProgramData, rombel: e.target.value})}
                className="col-span-3"
                placeholder="Contoh: A, B, C"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_tanggal_mulai" className="text-right">Tanggal Mulai</Label>
              <Input
                id="edit_tanggal_mulai"
                type="date"
                value={newProgramData.tanggal_mulai || ''}
                onChange={(e) => setNewProgramData({...newProgramData, tanggal_mulai: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_tanggal_selesai" className="text-right">Tanggal Selesai</Label>
              <Input
                id="edit_tanggal_selesai"
                type="date"
                value={newProgramData.tanggal_selesai || ''}
                onChange={(e) => setNewProgramData({...newProgramData, tanggal_selesai: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_subsidi_persen" className="text-right">Subsidi (%)</Label>
              <Input
                id="edit_subsidi_persen"
                type="number"
                min="0"
                max="100"
                value={newProgramData.subsidi_persen || ''}
                onChange={(e) => setNewProgramData({...newProgramData, subsidi_persen: parseFloat(e.target.value)})}
                className="col-span-3"
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProgram(false)}>
              Batal
            </Button>
            <Button onClick={handleEditProgram}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramSantriManagement;
