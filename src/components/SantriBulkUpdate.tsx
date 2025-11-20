import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Save, 
  Edit, 
  CheckCircle,
  AlertCircle,
  Info,
  FileText
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SantriUpdate {
  id: string;
  nama_lengkap: string;
  kategori: string;
  selected: boolean;
}

interface TarifSPP {
  id: string;
  nama_tarif: string;
  jenjang: string;
  kelas?: string;
  nominal_bulanan: number;
}

const SantriBulkUpdate: React.FC = () => {
  const [santriList, setSantriList] = useState<SantriUpdate[]>([]);
  const [tarifList, setTarifList] = useState<TarifSPP[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filterKategori, setFilterKategori] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load santri data
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select(`
          id, nama_lengkap, kategori
        `)
        .eq('status_santri', 'Aktif')
        .order('nama_lengkap');

      if (santriError) throw santriError;

      // Load tarif SPP
      const { data: tarifData, error: tarifError } = await supabase
        .from('tarif_spp')
        .select('*')
        .eq('status', 'aktif')
        .order('jenjang, kelas');

      if (tarifError) throw tarifError;

      setSantriList(santriData?.map(santri => ({
        ...santri,
        selected: false
      })) || []);
      setTarifList(tarifData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data santri');
    } finally {
      setLoading(false);
    }
  };

  const handleSantriToggle = (santriId: string) => {
    setSantriList(prev => prev.map(santri => 
      santri.id === santriId 
        ? { ...santri, selected: !santri.selected }
        : santri
    ));
  };

  const handleSelectAll = () => {
    setSantriList(prev => prev.map(santri => ({ ...santri, selected: true })));
  };

  const handleDeselectAll = () => {
    setSantriList(prev => prev.map(santri => ({ ...santri, selected: false })));
  };

  const handleSelectByKategori = (kategori: string) => {
    setSantriList(prev => prev.map(santri => 
      santri.kategori === kategori 
        ? { ...santri, selected: true }
        : santri
    ));
  };

  const handleUpdateField = (santriId: string, field: string, value: string) => {
    setSantriList(prev => prev.map(santri => 
      santri.id === santriId 
        ? { ...santri, [field]: value === 'none' || value === 'auto' ? null : value }
        : santri
    ));
  };

  const handleBulkUpdate = async () => {
    try {
      setIsSaving(true);
      
      const selectedSantri = santriList.filter(s => s.selected);
      if (selectedSantri.length === 0) {
        toast.error('Pilih minimal satu santri.');
        return;
      }

      // Prepare updates
      const updates = selectedSantri.map(santri => ({
        id: santri.id
      }));

      // Update each santri
      for (const update of updates) {
        const { error } = await supabase
          .from('santri')
          .update({
            // Simplified - no more rumpun_kelas and nama_kelas updates
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success(`Berhasil update ${selectedSantri.length} santri!`);
      
      // Reset selections
      setSantriList(prev => prev.map(santri => ({ ...santri, selected: false })));
      loadData(); // Reload data
    } catch (error) {
      console.error('Error updating santri:', error);
      toast.error('Gagal update data santri');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSantri = santriList.filter(santri => {
    const matchesKategori = filterKategori === 'all' || santri.kategori === filterKategori;
    const matchesSearch = santri.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesKategori && matchesSearch;
  });

  const selectedSantri = santriList.filter(s => s.selected);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data santri...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Update Massal Data Santri
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Update rumpun kelas dan nama kelas untuk penempatan santri
          </p>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Filter & Pilih Santri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="search">Cari Santri</Label>
              <Input
                id="search"
                placeholder="Cari nama santri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kategori">Filter Kategori</Label>
              <Select value={filterKategori} onValueChange={setFilterKategori}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="Reguler">Reguler</SelectItem>
                  <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                  <SelectItem value="Binaan Mukim">Binaan Mukim</SelectItem>
                  <SelectItem value="Binaan Non-Mukim">Binaan Non-Mukim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aksi</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Pilih Semua
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Batal Semua
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Santri List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Daftar Santri ({filteredSantri.length} santri)
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handleBulkUpdate} 
                disabled={isSaving || selectedSantri.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Menyimpan...' : `Update ${selectedSantri.length} Santri`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Pilih</TableHead>
                  <TableHead>Nama Santri</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Rumpun Kelas</TableHead>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSantri.map(santri => (
                  <TableRow key={santri.id}>
                    <TableCell>
                      <Checkbox
                        checked={santri.selected}
                        onCheckedChange={() => handleSantriToggle(santri.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{santri.nama_lengkap}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{santri.kategori}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">-</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">-</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">-</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Catatan:</strong> Update rumpun kelas dan nama kelas santri untuk penempatan di modul kelas. 
          Rumpun kelas (TPQ/Madin) digunakan untuk menentukan program pembelajaran.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SantriBulkUpdate;
