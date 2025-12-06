import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface AkunKas {
  id: string;
  nama: string;
  kode: string;
  tipe: 'Kas' | 'Bank' | 'Tabungan';
  nomor_rekening?: string;
  nama_bank?: string;
  atas_nama?: string;
  saldo_awal: number;
  saldo_saat_ini: number;
  is_default: boolean;
  status: 'aktif' | 'ditutup' | 'suspended';
  deskripsi?: string;
  created_at: string;
}

interface AkunKasFormData {
  nama: string;
  kode: string;
  tipe: 'Kas' | 'Bank' | 'Tabungan';
  nomor_rekening?: string;
  nama_bank?: string;
  atas_nama?: string;
  saldo_awal: number;
  is_default: boolean;
  status: 'aktif' | 'ditutup' | 'suspended';
  deskripsi?: string;
}

export function AkunKasManagement() {
  const [accounts, setAccounts] = useState<AkunKas[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AkunKas | null>(null);
  const [formData, setFormData] = useState<AkunKasFormData>({
    nama: '',
    kode: '',
    tipe: 'Kas',
    saldo_awal: 0,
    is_default: false,
    status: 'aktif',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('akun_kas')
        .select('*')
        .order('is_default', { ascending: false })
        .order('nama');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error('Gagal memuat akun kas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAccount) {
        // Update
        const { error } = await supabase
          .from('akun_kas')
          .update(formData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast.success('Akun kas berhasil diupdate');
      } else {
        // Insert
        const { error } = await supabase
          .from('akun_kas')
          .insert([formData]);

        if (error) throw error;
        toast.success('Akun kas berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      loadAccounts();
    } catch (error: any) {
      toast.error('Gagal menyimpan akun kas: ' + error.message);
    }
  };

  const handleEdit = (account: AkunKas) => {
    setEditingAccount(account);
    setFormData({
      nama: account.nama,
      kode: account.kode,
      tipe: account.tipe,
      nomor_rekening: account.nomor_rekening,
      nama_bank: account.nama_bank,
      atas_nama: account.atas_nama,
      saldo_awal: account.saldo_awal,
      is_default: account.is_default,
      status: account.status,
      deskripsi: account.deskripsi,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus akun kas ini?')) return;

    try {
      const { error } = await supabase
        .from('akun_kas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Akun kas berhasil dihapus');
      loadAccounts();
    } catch (error: any) {
      toast.error('Gagal menghapus akun kas: ' + error.message);
    }
  };

  const toggleStatus = async (account: AkunKas) => {
    const newStatus = account.status === 'aktif' ? 'suspended' : 'aktif';

    try {
      const { error } = await supabase
        .from('akun_kas')
        .update({ status: newStatus })
        .eq('id', account.id);

      if (error) throw error;
      toast.success(`Akun kas ${newStatus === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}`);
      loadAccounts();
    } catch (error: any) {
      toast.error('Gagal mengubah status: ' + error.message);
    }
  };

  const resetForm = () => {
    setEditingAccount(null);
    setFormData({
      nama: '',
      kode: '',
      tipe: 'Kas',
      saldo_awal: 0,
      is_default: false,
      status: 'aktif',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manajemen Akun Kas</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Akun Kas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Edit Akun Kas' : 'Tambah Akun Kas Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nama">Nama Akun *</Label>
                  <Input
                    id="nama"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Kas Koperasi"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="kode">Kode *</Label>
                  <Input
                    id="kode"
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                    placeholder="KAS-KOP-001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipe">Tipe *</Label>
                  <Select
                    value={formData.tipe}
                    onValueChange={(value: any) => setFormData({ ...formData, tipe: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kas">Kas</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                      <SelectItem value="Tabungan">Tabungan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="saldo_awal">Saldo Awal</Label>
                  <Input
                    id="saldo_awal"
                    type="number"
                    value={formData.saldo_awal}
                    onChange={(e) => setFormData({ ...formData, saldo_awal: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              {formData.tipe === 'Bank' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nama_bank">Nama Bank</Label>
                    <Input
                      id="nama_bank"
                      value={formData.nama_bank || ''}
                      onChange={(e) => setFormData({ ...formData, nama_bank: e.target.value })}
                      placeholder="BCA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nomor_rekening">Nomor Rekening</Label>
                    <Input
                      id="nomor_rekening"
                      value={formData.nomor_rekening || ''}
                      onChange={(e) => setFormData({ ...formData, nomor_rekening: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="atas_nama">Atas Nama</Label>
                    <Input
                      id="atas_nama"
                      value={formData.atas_nama || ''}
                      onChange={(e) => setFormData({ ...formData, atas_nama: e.target.value })}
                      placeholder="Koperasi Yayasan"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Input
                  id="deskripsi"
                  value={formData.deskripsi || ''}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Keterangan tambahan"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_default" className="cursor-pointer">
                  Jadikan akun kas default
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Memuat...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada akun kas. Klik tombol "Tambah Akun Kas" untuk membuat akun baru.
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{account.nama}</h4>
                    <Badge variant="outline" className="text-xs">
                      {account.kode}
                    </Badge>
                    <Badge variant={account.tipe === 'Kas' ? 'default' : account.tipe === 'Bank' ? 'secondary' : 'outline'}>
                      {account.tipe}
                    </Badge>
                    {account.is_default && (
                      <Badge variant="default">Default</Badge>
                    )}
                    <Badge variant={account.status === 'aktif' ? 'default' : 'destructive'}>
                      {account.status}
                    </Badge>
                  </div>
                  {account.tipe === 'Bank' && account.nama_bank && (
                    <p className="text-sm text-muted-foreground">
                      {account.nama_bank} - {account.nomor_rekening} a.n. {account.atas_nama}
                    </p>
                  )}
                  {account.deskripsi && (
                    <p className="text-sm text-muted-foreground mt-1">{account.deskripsi}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>
                      Saldo Awal: <strong>{formatCurrency(account.saldo_awal)}</strong>
                    </span>
                    <span>
                      Saldo Saat Ini: <strong className="text-primary">{formatCurrency(account.saldo_saat_ini)}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleStatus(account)}
                    title={account.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {account.status === 'aktif' ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(account)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(account.id)}
                    disabled={account.is_default}
                    title={account.is_default ? 'Tidak bisa hapus akun default' : 'Hapus'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
