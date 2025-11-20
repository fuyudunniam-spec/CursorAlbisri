import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Save, 
  Edit, 
  Trash2, 
  DollarSign, 
  BookOpen, 
  Settings,
  Info,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatRupiah } from '@/utils/inventaris.utils';

interface TarifSPP {
  id: string;
  nama_tarif: string;
  jenjang: string;
  kelas?: string;
  nominal_bulanan: number;
  status: 'aktif' | 'nonaktif';
  created_at: string;
}

const MasterTarifSPP: React.FC = () => {
  const [tarifList, setTarifList] = useState<TarifSPP[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama_tarif: '',
    jenjang: '',
    kelas: '',
    nominal_bulanan: 0,
    status: 'aktif' as 'aktif' | 'nonaktif'
  });

  useEffect(() => {
    loadTarifList();
  }, []);

  const loadTarifList = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tarif_spp')
        .select('*')
        .order('jenjang, kelas');

      if (error) throw error;
      setTarifList(data || []);
    } catch (error) {
      console.error('Error loading tarif SPP:', error);
      toast.error('Gagal memuat data tarif SPP');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'nominal_bulanan' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (!formData.nama_tarif || !formData.jenjang || formData.nominal_bulanan <= 0) {
        toast.error('Nama tarif, jenjang, dan nominal harus diisi dengan benar.');
        return;
      }

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('tarif_spp')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Tarif SPP berhasil diperbarui!');
      } else {
        // Create new
        const { error } = await supabase
          .from('tarif_spp')
          .insert([formData]);

        if (error) throw error;
        toast.success('Tarif SPP berhasil ditambahkan!');
      }

      // Reset form
      setFormData({
        nama_tarif: '',
        jenjang: '',
        kelas: '',
        nominal_bulanan: 0,
        status: 'aktif'
      });
      setEditingId(null);
      loadTarifList();
    } catch (error) {
      console.error('Error saving tarif SPP:', error);
      toast.error('Gagal menyimpan tarif SPP');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (tarif: TarifSPP) => {
    setFormData({
      nama_tarif: tarif.nama_tarif,
      jenjang: tarif.jenjang,
      kelas: tarif.kelas || '',
      nominal_bulanan: tarif.nominal_bulanan,
      status: tarif.status
    });
    setEditingId(tarif.id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Anda yakin ingin menghapus tarif SPP ini?')) return;
    
    try {
      const { error } = await supabase
        .from('tarif_spp')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Tarif SPP berhasil dihapus!');
      loadTarifList();
    } catch (error) {
      console.error('Error deleting tarif SPP:', error);
      toast.error('Gagal menghapus tarif SPP');
    }
  };

  const handleCancel = () => {
    setFormData({
      nama_tarif: '',
      jenjang: '',
      kelas: '',
      nominal_bulanan: 0,
      status: 'aktif'
    });
    setEditingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat data tarif SPP...</span>
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
            <DollarSign className="w-5 h-5 text-green-600" />
            Master Tarif SPP
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Kelola tarif SPP untuk berbagai jenjang dan kelas
          </p>
        </CardHeader>
      </Card>

      {/* Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? 'Edit Tarif SPP' : 'Tambah Tarif SPP Baru'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nama_tarif">Nama Tarif</Label>
              <Input
                id="nama_tarif"
                name="nama_tarif"
                placeholder="Contoh: SPP SD Kelas 1"
                value={formData.nama_tarif}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jenjang">Jenjang</Label>
              <Select 
                name="jenjang" 
                value={formData.jenjang} 
                onValueChange={(value) => handleSelectChange('jenjang', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenjang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="SMP">SMP</SelectItem>
                  <SelectItem value="SMA">SMA</SelectItem>
                  <SelectItem value="SMK">SMK</SelectItem>
                  <SelectItem value="MA">MA</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kelas">Kelas (Opsional)</Label>
              <Input
                id="kelas"
                name="kelas"
                placeholder="Contoh: 1, 2, 3, X, XI, XII"
                value={formData.kelas}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nominal_bulanan">Nominal Bulanan</Label>
              <Input
                id="nominal_bulanan"
                name="nominal_bulanan"
                type="number"
                placeholder="Contoh: 500000"
                value={formData.nominal_bulanan || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select 
                name="status" 
                value={formData.status} 
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-6">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Menyimpan...' : (editingId ? 'Update' : 'Simpan')}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={handleCancel}>
                  Batal
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarif List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Daftar Tarif SPP</CardTitle>
        </CardHeader>
        <CardContent>
          {tarifList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Belum ada tarif SPP</p>
              <p className="text-sm">Tambahkan tarif SPP pertama Anda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Tarif</TableHead>
                  <TableHead>Jenjang</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifList.map(tarif => (
                  <TableRow key={tarif.id}>
                    <TableCell className="font-medium">{tarif.nama_tarif}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tarif.jenjang}</Badge>
                    </TableCell>
                    <TableCell>{tarif.kelas || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(tarif.nominal_bulanan)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={tarif.status === 'aktif' ? 'default' : 'secondary'}
                        className={tarif.status === 'aktif' ? 'bg-green-600' : ''}
                      >
                        {tarif.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(tarif)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(tarif.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Catatan:</strong> Tarif SPP yang nonaktif tidak akan muncul dalam generator tagihan. 
          Pastikan untuk mengatur status yang sesuai dengan kebutuhan.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MasterTarifSPP;
