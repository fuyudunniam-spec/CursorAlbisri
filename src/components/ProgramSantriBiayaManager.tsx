import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  DollarSign,
  Settings,
  Users,
  GraduationCap,
  Calculator,
  RefreshCw
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProgramSantri {
  id: string;
  nama_program: string;
  kode_program: string;
  kategori: string;
  total_tarif_per_bulan: number;
  is_active: boolean;
  komponen_biaya: KomponenBiaya[];
}

interface KomponenBiaya {
  id: string;
  nama_komponen: string;
  kode_komponen: string;
  tarif_per_bulan: number;
  is_wajib: boolean;
  kategori_keuangan?: string;
  deskripsi?: string;
  urutan: number;
}

interface SantriProgram {
  id: string;
  santri_id: string;
  nama_santri: string;
  kategori_santri: string;
  nama_program: string;
  program_id: string;
  total_biaya_final: number;
  subsidi_persen: number;
  aktif: boolean;
}

const ProgramSantriBiayaManager = () => {
  const [programs, setPrograms] = useState<ProgramSantri[]>([]);
  const [santriPrograms, setSantriPrograms] = useState<SantriProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [showKomponenDialog, setShowKomponenDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramSantri | null>(null);
  const [editingKomponen, setEditingKomponen] = useState<KomponenBiaya | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  // Form state
  const [programForm, setProgramForm] = useState({
    nama_program: '',
    kode_program: '',
    kategori: '',
    is_active: true
  });

  const [komponenForm, setKomponenForm] = useState({
    nama_komponen: '',
    kode_komponen: '',
    tarif_per_bulan: 0,
    is_wajib: true,
    kategori_keuangan: '',
    deskripsi: '',
    urutan: 0
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load programs with komponen - simplified to use santri_kelas
      const { data: programsData, error: programsError } = await supabase
        .from('santri_kelas')
        .select(`
          *,
          komponen_biaya_program(*)
        `)
        .order('nama_program', { ascending: true });

      if (programsError) throw programsError;

      // Load santri programs
      const { data: santriProgramsData, error: santriProgramsError } = await supabase
        .from('santri_kelas')
        .select(`
          *,
          santri!inner(nama_lengkap, kategori)
        `)
        .order('created_at', { ascending: false });

      if (santriProgramsError) throw santriProgramsError;

      // Process programs data
      const processedPrograms = programsData?.map(program => ({
        ...program,
        komponen_biaya: program.komponen_biaya_program || []
      })) || [];

      // Process santri programs data
      const processedSantriPrograms = santriProgramsData?.map(sp => ({
        ...sp,
        nama_santri: sp.santri?.nama_lengkap || '',
        kategori_santri: sp.santri?.kategori || '',
        nama_program: sp.kelas_program || 'Kelas Belum Ditentukan'
      })) || [];

      setPrograms(processedPrograms);
      setSantriPrograms(processedSantriPrograms);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle program submission
  const handleProgramSubmit = async () => {
    try {
      if (editingProgram) {
        // Update - simplified to use santri_kelas
        const { error } = await supabase
          .from('santri_kelas')
          .update(programForm)
          .eq('id', editingProgram.id);

        if (error) throw error;
        toast.success('Program berhasil diperbarui');
      } else {
        // Create - simplified to use santri_kelas
        const { error } = await supabase
          .from('santri_kelas')
          .insert(programForm);

        if (error) throw error;
        toast.success('Program berhasil dibuat');
      }

      setShowProgramDialog(false);
      setEditingProgram(null);
      resetProgramForm();
      loadData();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Gagal menyimpan program');
    }
  };

  // Handle komponen submission
  const handleKomponenSubmit = async () => {
    try {
      if (!editingProgram) {
        toast.error('Pilih program terlebih dahulu');
        return;
      }

      if (editingKomponen) {
        // Update
        const { error } = await supabase
          .from('komponen_biaya_program')
          .update({
            ...komponenForm,
            program_id: editingProgram.id
          })
          .eq('id', editingKomponen.id);

        if (error) throw error;
        toast.success('Komponen berhasil diperbarui');
      } else {
        // Create
        const { error } = await supabase
          .from('komponen_biaya_program')
          .insert({
            ...komponenForm,
            program_id: editingProgram.id
          });

        if (error) throw error;
        toast.success('Komponen berhasil dibuat');
      }

      setShowKomponenDialog(false);
      setEditingKomponen(null);
      resetKomponenForm();
      loadData();
    } catch (error) {
      console.error('Error saving komponen:', error);
      toast.error('Gagal menyimpan komponen');
    }
  };

  // Handle delete
  const handleDelete = async (id: string, type: 'program' | 'komponen') => {
    try {
      if (type === 'program') {
        const { error } = await supabase
          .from('santri_kelas')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Program berhasil dihapus');
      } else {
        const { error } = await supabase
          .from('komponen_biaya_program')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Komponen berhasil dihapus');
      }

      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Gagal menghapus data');
    } finally {
      setDeleteDialog(null);
    }
  };

  // Handle edit
  const handleEditProgram = (program: ProgramSantri) => {
    setEditingProgram(program);
    setProgramForm({
      nama_program: program.nama_program,
      kode_program: program.kode_program,
      kategori: program.kategori,
      is_active: program.is_active
    });
    setShowProgramDialog(true);
  };

  const handleEditKomponen = (komponen: KomponenBiaya, program: ProgramSantri) => {
    setEditingKomponen(komponen);
    setEditingProgram(program);
    setKomponenForm({
      nama_komponen: komponen.nama_komponen,
      kode_komponen: komponen.kode_komponen,
      tarif_per_bulan: komponen.tarif_per_bulan,
      is_wajib: komponen.is_wajib,
      kategori_keuangan: komponen.kategori_keuangan || '',
      deskripsi: komponen.deskripsi || '',
      urutan: komponen.urutan
    });
    setShowKomponenDialog(true);
  };

  // Reset forms
  const resetProgramForm = () => {
    setProgramForm({
      nama_program: '',
      kode_program: '',
      kategori: '',
      is_active: true
    });
  };

  const resetKomponenForm = () => {
    setKomponenForm({
      nama_komponen: '',
      kode_komponen: '',
      tarif_per_bulan: 0,
      is_wajib: true,
      kategori_keuangan: '',
      deskripsi: '',
      urutan: 0
    });
  };

  // Calculate total biaya
  const calculateTotalBiaya = (komponen: KomponenBiaya[]) => {
    return komponen
      .filter(k => k.is_wajib)
      .reduce((sum, k) => sum + k.tarif_per_bulan, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
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
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            Manajemen Program Santri & Biaya
          </h2>
          <p className="text-muted-foreground">
            Kelola program santri dan komponen biaya untuk generate tagihan otomatis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowProgramDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Program
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs">Program & Komponen</TabsTrigger>
          <TabsTrigger value="santri-programs">Ploating Kelas</TabsTrigger>
        </TabsList>

        {/* Tab 1: Programs & Komponen */}
        <TabsContent value="programs" className="space-y-6">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {program.nama_program}
                      <Badge variant={program.is_active ? 'default' : 'secondary'}>
                        {program.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {program.kode_program} • {program.kategori}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProgram(program);
                        setShowKomponenDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Tambah Komponen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProgram(program)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog(program.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Total Biaya */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Total Biaya per Bulan</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      Rp {calculateTotalBiaya(program.komponen_biaya).toLocaleString()}
                    </span>
                  </div>

                  {/* Komponen Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Komponen</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Tarif/Bulan</TableHead>
                        <TableHead>Wajib</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {program.komponen_biaya
                        .sort((a, b) => a.urutan - b.urutan)
                        .map((komponen) => (
                        <TableRow key={komponen.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{komponen.nama_komponen}</p>
                              {komponen.deskripsi && (
                                <p className="text-sm text-muted-foreground">{komponen.deskripsi}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{komponen.kode_komponen}</TableCell>
                          <TableCell className="font-semibold">
                            Rp {komponen.tarif_per_bulan.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={komponen.is_wajib ? 'default' : 'secondary'}>
                              {komponen.is_wajib ? 'Wajib' : 'Opsional'}
                            </Badge>
                          </TableCell>
                          <TableCell>{komponen.kategori_keuangan || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditKomponen(komponen, program)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteDialog(komponen.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {program.komponen_biaya.length === 0 && (
                    <div className="text-center py-8">
                      <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Belum ada komponen biaya</h3>
                      <p className="text-muted-foreground mb-4">
                        Tambahkan komponen biaya untuk program ini
                      </p>
                      <Button onClick={() => {
                        setEditingProgram(program);
                        setShowKomponenDialog(true);
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Komponen
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 2: Santri Programs */}
        <TabsContent value="santri-programs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ploating Kelas Santri</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Santri</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Total Biaya</TableHead>
                    <TableHead>Subsidi</TableHead>
                    <TableHead>Biaya Final</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {santriPrograms.map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sp.nama_santri}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sp.kategori_santri.includes('Binaan') ? 'default' : 'secondary'}>
                          {sp.kategori_santri}
                        </Badge>
                      </TableCell>
                      <TableCell>{sp.nama_program}</TableCell>
                      <TableCell className="font-semibold">
                        Rp {sp.total_biaya_final.toLocaleString()}
                      </TableCell>
                      <TableCell>{sp.subsidi_persen}%</TableCell>
                      <TableCell className="font-semibold">
                        Rp {sp.total_biaya_final.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sp.aktif ? 'default' : 'secondary'}>
                          {sp.aktif ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Program Dialog */}
      <Dialog open={showProgramDialog} onOpenChange={setShowProgramDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? 'Edit Program' : 'Tambah Program Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nama_program">Nama Program</Label>
              <Input
                id="nama_program"
                value={programForm.nama_program}
                onChange={(e) => setProgramForm({ ...programForm, nama_program: e.target.value })}
                placeholder="Reguler TPQ"
              />
            </div>

            <div>
              <Label htmlFor="kode_program">Kode Program</Label>
              <Input
                id="kode_program"
                value={programForm.kode_program}
                onChange={(e) => setProgramForm({ ...programForm, kode_program: e.target.value })}
                placeholder="REGULER-TPQ"
              />
            </div>

            <div>
              <Label htmlFor="kategori">Kategori</Label>
              <Select
                value={programForm.kategori}
                onValueChange={(value) => setProgramForm({ ...programForm, kategori: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TPQ">TPQ</SelectItem>
                  <SelectItem value="Madin">Madin</SelectItem>
                  <SelectItem value="Pondok">Pondok</SelectItem>
                  <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                  <SelectItem value="Umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgramDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleProgramSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingProgram ? 'Update' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Komponen Dialog */}
      <Dialog open={showKomponenDialog} onOpenChange={setShowKomponenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKomponen ? 'Edit Komponen' : 'Tambah Komponen Baru'}
            </DialogTitle>
            {editingProgram && (
              <p className="text-sm text-muted-foreground">
                Program: {editingProgram.nama_program}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nama_komponen">Nama Komponen</Label>
              <Input
                id="nama_komponen"
                value={komponenForm.nama_komponen}
                onChange={(e) => setKomponenForm({ ...komponenForm, nama_komponen: e.target.value })}
                placeholder="SPP TPQ"
              />
            </div>

            <div>
              <Label htmlFor="kode_komponen">Kode Komponen</Label>
              <Input
                id="kode_komponen"
                value={komponenForm.kode_komponen}
                onChange={(e) => setKomponenForm({ ...komponenForm, kode_komponen: e.target.value })}
                placeholder="SPP_TPQ"
              />
            </div>

            <div>
              <Label htmlFor="tarif_per_bulan">Tarif per Bulan</Label>
              <Input
                id="tarif_per_bulan"
                type="number"
                value={komponenForm.tarif_per_bulan}
                onChange={(e) => setKomponenForm({ ...komponenForm, tarif_per_bulan: parseInt(e.target.value) || 0 })}
                placeholder="50000"
              />
            </div>

            <div>
              <Label htmlFor="urutan">Urutan</Label>
              <Input
                id="urutan"
                type="number"
                value={komponenForm.urutan}
                onChange={(e) => setKomponenForm({ ...komponenForm, urutan: parseInt(e.target.value) || 0 })}
                placeholder="1"
              />
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={komponenForm.deskripsi}
                onChange={(e) => setKomponenForm({ ...komponenForm, deskripsi: e.target.value })}
                placeholder="Deskripsi komponen..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKomponenDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleKomponenSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingKomponen ? 'Update' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog, 'program')}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProgramSantriBiayaManager;
