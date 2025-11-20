import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Users,
  DollarSign,
  GraduationCap,
  Settings,
  CheckCircle,
  XCircle
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Program {
  id: string;
  nama_program: string;
  kode_program: string;
  kategori: string;
  tingkat?: string;
  jenjang?: string;
  is_active: boolean;
  kapasitas_maksimal?: number;
  jumlah_peserta_saat_ini: number;
  deskripsi?: string;
  created_at: string;
}

interface KomponenBiaya {
  id: string;
  nama_komponen: string;
  kode_komponen: string;
  tarif_per_bulan: number;
  is_wajib: boolean;
  urutan: number;
}

const ProgramSantri: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [komponenBiaya, setKomponenBiaya] = useState<KomponenBiaya[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [komponenDialogOpen, setKomponenDialogOpen] = useState(false);
  const [editingKomponen, setEditingKomponen] = useState<KomponenBiaya | null>(null);

  // Form state for program
  const [formData, setFormData] = useState({
    nama_program: '',
    kode_program: '',
    kategori: 'Pondok',
    tingkat: '',
    jenjang: '',
    kapasitas_maksimal: '',
    deskripsi: ''
  });

  // Form state for komponen biaya
  const [komponenForm, setKomponenForm] = useState({
    nama_komponen: '',
    kode_komponen: '',
    tarif_per_bulan: '',
    is_wajib: true
  });

  useEffect(() => {
    fetchPrograms();
    
    // Suppress Zotero extension errors
    window.addEventListener('error', (event) => {
      if (event.message?.includes('zotero') || event.message?.includes('chrome-extension')) {
        event.preventDefault();
        return false;
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('zotero') || event.reason?.message?.includes('chrome-extension')) {
        event.preventDefault();
        return false;
      }
    });
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      fetchKomponenBiaya(selectedProgram.id);
    }
  }, [selectedProgram]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('program_santri')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error: any) {
      toast.error('Gagal memuat program: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchKomponenBiaya = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('komponen_biaya_program')
        .select('*')
        .eq('program_id', programId)
        .order('urutan', { ascending: true });

      if (error) throw error;
      setKomponenBiaya(data || []);
    } catch (error: any) {
      toast.error('Gagal memuat komponen biaya: ' + error.message);
    }
  };

  const handleSubmitProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const dataToInsert = {
        ...formData,
        kapasitas_maksimal: formData.kapasitas_maksimal ? parseInt(formData.kapasitas_maksimal) : null,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('program_santri')
        .insert([dataToInsert]);

      if (error) throw error;

      toast.success('Program berhasil ditambahkan!');
      setDialogOpen(false);
      setFormData({
        nama_program: '',
        kode_program: '',
        kategori: 'Pondok',
        tingkat: '',
        jenjang: '',
        kapasitas_maksimal: '',
        deskripsi: ''
      });
      fetchPrograms();
    } catch (error: any) {
      toast.error('Gagal menambahkan program: ' + error.message);
    }
  };

  const handleSubmitKomponen = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProgram) {
      toast.error('Pilih program terlebih dahulu');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingKomponen) {
        // UPDATE mode
        const { error } = await supabase
          .from('komponen_biaya_program')
          .update({
            nama_komponen: komponenForm.nama_komponen,
            kode_komponen: komponenForm.kode_komponen,
            tarif_per_bulan: parseFloat(komponenForm.tarif_per_bulan),
            is_wajib: komponenForm.is_wajib
          })
          .eq('id', editingKomponen.id);

        if (error) throw error;
        toast.success('Komponen biaya berhasil diupdate!');
      } else {
        // INSERT mode
        const dataToInsert = {
          program_id: selectedProgram.id,
          ...komponenForm,
          tarif_per_bulan: parseFloat(komponenForm.tarif_per_bulan),
          urutan: komponenBiaya.length + 1
        };

        const { error } = await supabase
          .from('komponen_biaya_program')
          .insert([dataToInsert]);

        if (error) throw error;
        toast.success('Komponen biaya berhasil ditambahkan!');
      }

      setKomponenDialogOpen(false);
      setEditingKomponen(null);
      setKomponenForm({
        nama_komponen: '',
        kode_komponen: '',
        tarif_per_bulan: '',
        is_wajib: true
      });
      fetchKomponenBiaya(selectedProgram.id);
    } catch (error: any) {
      toast.error('Gagal menyimpan komponen: ' + error.message);
    }
  };

  const handleEditKomponen = (komponen: KomponenBiaya) => {
    setEditingKomponen(komponen);
    setKomponenForm({
      nama_komponen: komponen.nama_komponen,
      kode_komponen: komponen.kode_komponen,
      tarif_per_bulan: komponen.tarif_per_bulan.toString(),
      is_wajib: komponen.is_wajib
    });
    setKomponenDialogOpen(true);
  };

  const handleDeleteKomponen = async (id: string) => {
    if (!confirm('Yakin ingin menghapus komponen ini?')) return;

    try {
      const { error } = await supabase
        .from('komponen_biaya_program')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Komponen berhasil dihapus');
      if (selectedProgram) {
        fetchKomponenBiaya(selectedProgram.id);
      }
    } catch (error: any) {
      toast.error('Gagal menghapus komponen: ' + error.message);
    }
  };

  const handleCloseKomponenDialog = () => {
    setKomponenDialogOpen(false);
    setEditingKomponen(null);
    setKomponenForm({
      nama_komponen: '',
      kode_komponen: '',
      tarif_per_bulan: '',
      is_wajib: true
    });
  };

  const toggleProgramStatus = async (program: Program) => {
    try {
      const { error } = await supabase
        .from('program_santri')
        .update({ is_active: !program.is_active })
        .eq('id', program.id);

      if (error) throw error;

      toast.success(`Program ${program.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
      fetchPrograms();
    } catch (error: any) {
      toast.error('Gagal mengubah status: ' + error.message);
    }
  };

  const deleteProgram = async (id: string) => {
    if (!confirm('Yakin ingin menghapus program ini?')) return;

    try {
      const { error } = await supabase
        .from('program_santri')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Program berhasil dihapus');
      fetchPrograms();
      if (selectedProgram?.id === id) {
        setSelectedProgram(null);
      }
    } catch (error: any) {
      toast.error('Gagal menghapus program: ' + error.message);
    }
  };

  const getTotalTarif = () => {
    return komponenBiaya
      .filter(k => k.is_wajib)
      .reduce((sum, k) => sum + parseFloat(k.tarif_per_bulan.toString()), 0);
  };

  const filteredPrograms = programs.filter(p =>
    p.nama_program.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.kode_program.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Program Santri</h1>
          <p className="text-muted-foreground">Kelola program dan tarif komponen</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Program Baru</DialogTitle>
              <DialogDescription>
                Buat program santri baru dengan tarif komponen
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitProgram} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Program *</Label>
                  <Input
                    required
                    value={formData.nama_program}
                    onChange={(e) => setFormData({...formData, nama_program: e.target.value})}
                    placeholder="Santri Mukim SD/SMP/SMA"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kode Program *</Label>
                  <Input
                    required
                    value={formData.kode_program}
                    onChange={(e) => setFormData({...formData, kode_program: e.target.value})}
                    placeholder="SANTRI-MUKIM"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select
                    value={formData.kategori}
                    onValueChange={(value) => setFormData({...formData, kategori: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pondok">Pondok</SelectItem>
                      <SelectItem value="TPQ">TPQ</SelectItem>
                      <SelectItem value="Madin">Madin</SelectItem>
                      <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                      <SelectItem value="Umum">Umum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jenjang</Label>
                  <Input
                    value={formData.jenjang}
                    onChange={(e) => setFormData({...formData, jenjang: e.target.value})}
                    placeholder="SD, SMP, SMA, Mahasiswa"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tingkat</Label>
                  <Input
                    value={formData.tingkat}
                    onChange={(e) => setFormData({...formData, tingkat: e.target.value})}
                    placeholder="Dasar, Menengah, Tinggi"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kapasitas Maksimal</Label>
                  <Input
                    type="number"
                    value={formData.kapasitas_maksimal}
                    onChange={(e) => setFormData({...formData, kapasitas_maksimal: e.target.value})}
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  placeholder="Deskripsi program..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan Program</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Programs List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className={selectedProgram?.id === program.id ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{program.nama_program}</CardTitle>
                      <Badge variant={program.is_active ? 'default' : 'secondary'}>
                        {program.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {program.kode_program} • {program.kategori} • {program.jenjang || '-'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleProgramStatus(program)}
                    >
                      {program.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteProgram(program.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Peserta</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {program.jumlah_peserta_saat_ini} / {program.kapasitas_maksimal || '∞'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Deskripsi</p>
                    <p className="text-sm">{program.deskripsi || '-'}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setSelectedProgram(program)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Kelola Komponen Biaya
                </Button>
              </CardContent>
            </Card>
          ))}

          {filteredPrograms.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada program</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Komponen Biaya Panel */}
        <div className="lg:col-span-3 space-y-4">
          {selectedProgram ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Komponen Biaya</CardTitle>
                  <CardDescription>{selectedProgram.nama_program}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Tarif per Bulan</p>
                          <p className="text-lg font-semibold">Program {selectedProgram.nama_program}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-primary">
                            Rp {getTotalTarif().toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-muted-foreground">untuk semua komponen wajib</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Dialog open={komponenDialogOpen} onOpenChange={(open) => {
                    if (!open) handleCloseKomponenDialog();
                    else setKomponenDialogOpen(true);
                  }}>
                    <DialogTrigger asChild>
                      <Button className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors" variant="outline" size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        <span className="font-medium">Tambah Komponen Biaya</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingKomponen ? 'Edit Komponen Biaya' : 'Tambah Komponen Biaya'}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmitKomponen} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nama Komponen *</Label>
                          <Input
                            required
                            value={komponenForm.nama_komponen}
                            onChange={(e) => setKomponenForm({...komponenForm, nama_komponen: e.target.value})}
                            placeholder="Pendidikan Formal"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Kode Komponen *</Label>
                          <Input
                            required
                            value={komponenForm.kode_komponen}
                            onChange={(e) => setKomponenForm({...komponenForm, kode_komponen: e.target.value})}
                            placeholder="PENDIDIKAN_FORMAL"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tarif per Bulan (Rp) *</Label>
                          <Input
                            required
                            type="number"
                            value={komponenForm.tarif_per_bulan}
                            onChange={(e) => setKomponenForm({...komponenForm, tarif_per_bulan: e.target.value})}
                            placeholder="500000"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_wajib"
                            checked={komponenForm.is_wajib}
                            onChange={(e) => setKomponenForm({...komponenForm, is_wajib: e.target.checked})}
                            className="rounded"
                          />
                          <Label htmlFor="is_wajib" className="cursor-pointer">
                            Komponen Wajib
                          </Label>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={handleCloseKomponenDialog}>
                            Batal
                          </Button>
                          <Button type="submit">
                            {editingKomponen ? 'Update' : 'Simpan'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-3">
                    {komponenBiaya.map((komponen) => (
                      <Card key={komponen.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-base">{komponen.nama_komponen}</h4>
                                {komponen.is_wajib && (
                                  <Badge variant="secondary" className="text-xs px-2 py-1">
                                    Wajib
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground font-mono">
                                {komponen.kode_komponen}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-right flex-1">
                                <p className="text-lg font-bold text-primary">
                                  Rp {parseFloat(komponen.tarif_per_bulan.toString()).toLocaleString('id-ID')}
                                </p>
                                <p className="text-xs text-muted-foreground">per bulan</p>
                              </div>
                              
                              <div className="flex gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditKomponen(komponen)}
                                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteKomponen(komponen.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {komponenBiaya.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2" />
                        <p>Belum ada komponen biaya</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Pilih program untuk melihat komponen biaya</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramSantri;

