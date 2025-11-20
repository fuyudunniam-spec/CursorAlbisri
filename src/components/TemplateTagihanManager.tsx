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
  Calendar
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemplateTagihan {
  id: string;
  nama_template: string;
  kategori_santri: string;
  deskripsi?: string;
  komponen_tagihan: Record<string, number>;
  total_template: number;
  periode_generate: number;
  tanggal_jatuh_tempo: number;
  is_active: boolean;
  created_at: string;
}

interface KomponenForm {
  nama: string;
  nominal: number;
}

const TemplateTagihanManager = () => {
  const [templates, setTemplates] = useState<TemplateTagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateTagihan | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nama_template: '',
    kategori_santri: '',
    deskripsi: '',
    periode_generate: 12,
    tanggal_jatuh_tempo: 10,
    is_active: true
  });

  const [komponenList, setKomponenList] = useState<KomponenForm[]>([
    { nama: 'SPP', nominal: 0 },
    { nama: 'Buku', nominal: 0 },
    { nama: 'Seragam', nominal: 0 },
    { nama: 'Makan', nominal: 0 }
  ]);

  // Load templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('template_tagihan')
        .select('*')
        .order('kategori_santri', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Gagal memuat template tagihan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Calculate total
  const totalTemplate = komponenList.reduce((sum, komponen) => sum + komponen.nominal, 0);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const komponenObj = komponenList.reduce((acc, komponen) => {
        if (komponen.nominal > 0) {
          acc[komponen.nama.toLowerCase().replace(/\s+/g, '_')] = komponen.nominal;
        }
        return acc;
      }, {} as Record<string, number>);

      const payload = {
        ...formData,
        komponen_tagihan: komponenObj,
        total_template: totalTemplate
      };

      if (editingTemplate) {
        // Update
        const { error } = await supabase
          .from('template_tagihan')
          .update(payload)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template berhasil diperbarui');
      } else {
        // Create
        const { error } = await supabase
          .from('template_tagihan')
          .insert(payload);

        if (error) throw error;
        toast.success('Template berhasil dibuat');
      }

      setShowDialog(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Gagal menyimpan template');
    }
  };

  // Handle edit
  const handleEdit = (template: TemplateTagihan) => {
    setEditingTemplate(template);
    setFormData({
      nama_template: template.nama_template,
      kategori_santri: template.kategori_santri,
      deskripsi: template.deskripsi || '',
      periode_generate: template.periode_generate,
      tanggal_jatuh_tempo: template.tanggal_jatuh_tempo,
      is_active: template.is_active
    });

    // Convert komponen_tagihan to komponenList
    const komponenArray: KomponenForm[] = [];
    Object.entries(template.komponen_tagihan).forEach(([key, value]) => {
      komponenArray.push({
        nama: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        nominal: value
      });
    });

    // Fill remaining slots
    while (komponenArray.length < 4) {
      komponenArray.push({ nama: '', nominal: 0 });
    }

    setKomponenList(komponenArray);
    setShowDialog(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('template_tagihan')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template berhasil dihapus');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Gagal menghapus template');
    } finally {
      setDeleteDialog(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      nama_template: '',
      kategori_santri: '',
      deskripsi: '',
      periode_generate: 12,
      tanggal_jatuh_tempo: 10,
      is_active: true
    });
    setKomponenList([
      { nama: 'SPP', nominal: 0 },
      { nama: 'Buku', nominal: 0 },
      { nama: 'Seragam', nominal: 0 },
      { nama: 'Makan', nominal: 0 }
    ]);
  };

  // Add komponen
  const addKomponen = () => {
    setKomponenList([...komponenList, { nama: '', nominal: 0 }]);
  };

  // Remove komponen
  const removeKomponen = (index: number) => {
    setKomponenList(komponenList.filter((_, i) => i !== index));
  };

  // Update komponen
  const updateKomponen = (index: number, field: keyof KomponenForm, value: string | number) => {
    const newList = [...komponenList];
    newList[index] = { ...newList[index], [field]: value };
    setKomponenList(newList);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat template...</p>
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
            <Settings className="w-6 h-6" />
            Template Tagihan
          </h2>
          <p className="text-muted-foreground">
            Kelola template tagihan untuk kategori santri yang berbeda
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Template
        </Button>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{template.nama_template}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={template.kategori_santri === 'Reguler' ? 'default' : 'secondary'}>
                      {template.kategori_santri}
                    </Badge>
                    <Badge variant={template.is_active ? 'default' : 'outline'}>
                      {template.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialog(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {template.deskripsi && (
                <p className="text-muted-foreground mb-4">{template.deskripsi}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tagihan</p>
                    <p className="font-semibold">Rp {template.total_template.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Periode Generate</p>
                    <p className="font-semibold">{template.periode_generate} bulan</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
                    <p className="font-semibold">Tanggal {template.tanggal_jatuh_tempo}</p>
                  </div>
                </div>
              </div>

              {/* Komponen Detail */}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Komponen Tagihan:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(template.komponen_tagihan).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: Rp {value.toLocaleString()}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Tambah Template Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nama_template">Nama Template</Label>
                <Input
                  id="nama_template"
                  value={formData.nama_template}
                  onChange={(e) => setFormData({ ...formData, nama_template: e.target.value })}
                  placeholder="Template Reguler Standard"
                />
              </div>
              <div>
                <Label htmlFor="kategori_santri">Kategori Santri</Label>
                <Select
                  value={formData.kategori_santri}
                  onValueChange={(value) => setFormData({ ...formData, kategori_santri: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reguler">Reguler</SelectItem>
                    <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                placeholder="Deskripsi template tagihan..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="periode_generate">Periode Generate (bulan)</Label>
                <Input
                  id="periode_generate"
                  type="number"
                  value={formData.periode_generate}
                  onChange={(e) => setFormData({ ...formData, periode_generate: parseInt(e.target.value) || 12 })}
                  min="1"
                  max="24"
                />
              </div>
              <div>
                <Label htmlFor="tanggal_jatuh_tempo">Tanggal Jatuh Tempo</Label>
                <Input
                  id="tanggal_jatuh_tempo"
                  type="number"
                  value={formData.tanggal_jatuh_tempo}
                  onChange={(e) => setFormData({ ...formData, tanggal_jatuh_tempo: parseInt(e.target.value) || 10 })}
                  min="1"
                  max="31"
                />
              </div>
            </div>

            {/* Komponen Tagihan */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Komponen Tagihan</Label>
                <Button variant="outline" size="sm" onClick={addKomponen}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah
                </Button>
              </div>
              
              <div className="space-y-2">
                {komponenList.map((komponen, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Nama komponen"
                      value={komponen.nama}
                      onChange={(e) => updateKomponen(index, 'nama', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Nominal"
                      value={komponen.nominal || ''}
                      onChange={(e) => updateKomponen(index, 'nominal', parseInt(e.target.value) || 0)}
                      className="w-32"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeKomponen(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-2 p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  Total: Rp {totalTemplate.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? 'Update' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplateTagihanManager;
