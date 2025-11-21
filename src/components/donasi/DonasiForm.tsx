import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { DonaturForm } from './DonaturForm';

interface DonasiFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DonasiForm: React.FC<DonasiFormProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [donaturList, setDonaturList] = useState<any[]>([]);
  const [akunKasList, setAkunKasList] = useState<any[]>([]);
  const [showDonaturForm, setShowDonaturForm] = useState(false);
  const [formData, setFormData] = useState({
    donatur_id: '',
    jenis_donasi: 'Uang',
    jumlah: 0,
    jenis_barang: '',
    jumlah_barang: 0,
    satuan_barang: '',
    deskripsi: '',
    hajat_doa: '',
    tanggal_donasi: new Date().toISOString().split('T')[0],
    status: 'Diterima',
    akun_kas_id: '' // Will be set to default account
  });

  useEffect(() => {
    if (open) {
      loadDonatur();
      loadAkunKas();
    }
  }, [open]);

  const loadDonatur = async () => {
    try {
      const { data, error } = await supabase
        .from('donatur' as any)
        .select('*')
        .order('nama_lengkap');

      if (error) throw error;
      setDonaturList(data || []);
    } catch (error) {
      console.error('Error loading donatur:', error);
      toast.error('Gagal memuat data donatur');
    }
  };

  const loadAkunKas = async () => {
    try {
      const { data, error } = await supabase
        .from('akun_kas')
        .select('*')
        .eq('status', 'aktif')
        .neq('managed_by', 'tabungan')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAkunKasList(data || []);
      
      // Set default account if available
      const defaultAccount = data?.find(a => a.is_default) || data?.[0];
      if (defaultAccount && !formData.akun_kas_id) {
        setFormData(prev => ({ ...prev, akun_kas_id: defaultAccount.id }));
      }
    } catch (error) {
      console.error('Error loading akun kas:', error);
      toast.error('Gagal memuat data akun kas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate akun_kas_id for cash donations
      if (formData.jenis_donasi === 'Uang' && !formData.akun_kas_id) {
        toast.error('Pilih akun kas untuk donasi tunai');
        setLoading(false);
        return;
      }

      const donatur = donaturList.find(d => d.id === formData.donatur_id);
      
      const dataToInsert = {
        ...formData,
        nama_donatur: donatur?.nama_lengkap || '',
        email_donatur: donatur?.email || null,
        no_telepon: donatur?.no_telepon || null,
        alamat_donatur: donatur?.alamat || null,
        tanggal_diterima: formData.status === 'Diterima' ? formData.tanggal_donasi : null,
        // Only include akun_kas_id for cash donations
        akun_kas_id: formData.jenis_donasi === 'Uang' ? formData.akun_kas_id : null
      };

      const { error } = await supabase
        .from('donasi')
        .insert([dataToInsert]);

      if (error) throw error;

      // Show success message with auto-posting info for cash donations
      if (formData.jenis_donasi === 'Uang' && formData.status === 'Diterima') {
        const akunKas = akunKasList.find(a => a.id === formData.akun_kas_id);
        toast.success(`Donasi berhasil dicatat! Otomatis masuk ke ${akunKas?.nama || 'akun kas'}.`);
      } else {
        toast.success('Donasi berhasil dicatat!');
      }
      
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      const defaultAccount = akunKasList.find(a => a.is_default) || akunKasList[0];
      setFormData({
        donatur_id: '',
        jenis_donasi: 'Uang',
        jumlah: 0,
        jenis_barang: '',
        jumlah_barang: 0,
        satuan_barang: '',
        deskripsi: '',
        hajat_doa: '',
        tanggal_donasi: new Date().toISOString().split('T')[0],
        status: 'Diterima',
        akun_kas_id: defaultAccount?.id || ''
      });
    } catch (error) {
      console.error('Error saving donasi:', error);
      toast.error('Gagal menyimpan data donasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catat Donasi Baru</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="donatur_id">Donatur *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.donatur_id}
                  onValueChange={(value) => setFormData({ ...formData, donatur_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih donatur" />
                  </SelectTrigger>
                  <SelectContent>
                    {donaturList.map((donatur) => (
                      <SelectItem key={donatur.id} value={donatur.id}>
                        {donatur.nama_lengkap} - {donatur.no_telepon || 'No telp tidak ada'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDonaturForm(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_donasi">Jenis Donasi *</Label>
                <Select
                  value={formData.jenis_donasi}
                  onValueChange={(value) => setFormData({ ...formData, jenis_donasi: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uang">Uang</SelectItem>
                    <SelectItem value="Barang">Barang</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Diterima">Diterima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.jenis_donasi === 'Uang' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="jumlah">Jumlah Uang *</Label>
                  <Input
                    id="jumlah"
                    type="number"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({ ...formData, jumlah: parseFloat(e.target.value) || 0 })}
                    placeholder="Rp"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="akun_kas_id">Akun Kas Tujuan *</Label>
                  <Select
                    value={formData.akun_kas_id}
                    onValueChange={(value) => setFormData({ ...formData, akun_kas_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih akun kas" />
                    </SelectTrigger>
                    <SelectContent>
                      {akunKasList.map((akun) => (
                        <SelectItem key={akun.id} value={akun.id}>
                          {akun.nama} {akun.is_default ? '(Default)' : ''} - {akun.tipe}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.status === 'Diterima' && (
                    <p className="text-xs text-blue-600">
                      💡 Donasi tunai dengan status "Diterima" akan otomatis tercatat di akun kas yang dipilih
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jenis_barang">Jenis Barang *</Label>
                  <Input
                    id="jenis_barang"
                    value={formData.jenis_barang}
                    onChange={(e) => setFormData({ ...formData, jenis_barang: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jumlah_barang">Jumlah *</Label>
                  <Input
                    id="jumlah_barang"
                    type="number"
                    value={formData.jumlah_barang}
                    onChange={(e) => setFormData({ ...formData, jumlah_barang: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="satuan_barang">Satuan *</Label>
                  <Input
                    id="satuan_barang"
                    value={formData.satuan_barang}
                    onChange={(e) => setFormData({ ...formData, satuan_barang: e.target.value })}
                    placeholder="Unit, Kg, Box"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hajat_doa">Hajat / Doa</Label>
              <Textarea
                id="hajat_doa"
                value={formData.hajat_doa}
                onChange={(e) => setFormData({ ...formData, hajat_doa: e.target.value })}
                placeholder="Contoh: Untuk kesehatan keluarga, keberhasilan usaha, dll"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Donasi *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(new Date(formData.tanggal_donasi), 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(formData.tanggal_donasi)}
                    onSelect={(date) => setFormData({ ...formData, tanggal_donasi: date?.toISOString().split('T')[0] || '' })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DonaturForm
        open={showDonaturForm}
        onOpenChange={setShowDonaturForm}
        onSuccess={loadDonatur}
      />
    </>
  );
};
