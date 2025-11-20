import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Package, TrendingUp, Search, Edit, Trash2, Eye } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';

const DistribusiPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    jumlah: '',
    penerima: '',
    santri_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    catatan: ''
  });
  
  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Penjualan', path: '/inventaris/sales' },
    { label: 'Distribusi', path: '/inventaris/distribution' },
    { label: 'Riwayat', path: '/inventaris/transactions' }
  ];

  // Sample data
  const sampleItems = [
    { id: 1, nama: 'Beras Cap Bandeng 25Kg', kategori: 'Makanan', stok: 15 },
    { id: 2, nama: 'Minyak Goreng 1L', kategori: 'Makanan', stok: 5 },
    { id: 3, nama: 'Gula Pasir 1Kg', kategori: 'Makanan', stok: 20 }
  ];

  const sampleSantri = [
    { id: 1, nama: 'Ahmad Fauzi', kelas: 'XII IPA 1', program: 'Reguler' },
    { id: 2, nama: 'Siti Nurhaliza', kelas: 'XI IPS 2', program: 'Reguler' },
    { id: 3, nama: 'Muhammad Rizki', kelas: 'X IPA 3', program: 'Tahfidz' }
  ];

  const sampleDistributions = [
    {
      id: 1,
      item: 'Beras Cap Bandeng 25Kg',
      jumlah: 1,
      penerima: 'Ahmad Fauzi',
      santri_id: 1,
      tanggal: '2025-01-25',
      catatan: 'Distribusi untuk kebutuhan asrama',
      status: 'Selesai'
    },
    {
      id: 2,
      item: 'Minyak Goreng 1L',
      jumlah: 2,
      penerima: 'Siti Nurhaliza',
      santri_id: 2,
      tanggal: '2025-01-24',
      catatan: 'Distribusi untuk dapur asrama',
      status: 'Selesai'
    }
  ];

  const filteredDistributions = sampleDistributions.filter(dist => 
    dist.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dist.penerima.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setShowForm(false);
    setFormData({
      item: '',
      jumlah: '',
      penerima: '',
      santri_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: ''
    });
  };

  return (
    <div className="space-y-6">
      <ModuleHeader title="Distribusi Inventaris" tabs={tabs} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribusi Hari Ini</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">12</div>
            <p className="text-xs text-muted-foreground">
              Item didistribusikan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribusi Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">156</div>
            <p className="text-xs text-muted-foreground">
              Item didistribusikan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penerima Aktif</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">45</div>
            <p className="text-xs text-muted-foreground">
              Santri/Unit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              className="flex items-center gap-2"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Batal' : 'Distribusi Single'}
            </Button>
            <Button variant="outline">
              Distribusi Massal
            </Button>
            <Button variant="outline">
              Lihat Riwayat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Form Distribusi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item">Pilih Item</Label>
                  <Select value={formData.item} onValueChange={(value) => setFormData({...formData, item: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleItems.map(item => (
                        <SelectItem key={item.id} value={item.nama}>
                          {item.nama} (Stok: {item.stok})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="jumlah">Jumlah</Label>
                  <Input
                    id="jumlah"
                    type="number"
                    value={formData.jumlah}
                    onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                    placeholder="Masukkan jumlah"
                  />
                </div>

                <div>
                  <Label htmlFor="penerima">Penerima</Label>
                  <Input
                    id="penerima"
                    value={formData.penerima}
                    onChange={(e) => setFormData({...formData, penerima: e.target.value})}
                    placeholder="Nama penerima"
                  />
                </div>

                <div>
                  <Label htmlFor="santri_id">Santri (Opsional)</Label>
                  <Select value={formData.santri_id} onValueChange={(value) => setFormData({...formData, santri_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih santri" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleSantri.map(santri => (
                        <SelectItem key={santri.id} value={santri.id.toString()}>
                          {santri.nama} - {santri.kelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tanggal">Tanggal Distribusi</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="catatan">Catatan</Label>
                  <Input
                    id="catatan"
                    value={formData.catatan}
                    onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                    placeholder="Catatan distribusi (opsional)"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Simpan Distribusi</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Distribution List */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Distribusi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Cari Distribusi</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari item atau penerima..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Item</th>
                    <th className="text-left p-4 font-medium">Jumlah</th>
                    <th className="text-left p-4 font-medium">Penerima</th>
                    <th className="text-left p-4 font-medium">Tanggal</th>
                    <th className="text-left p-4 font-medium">Catatan</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistributions.map((dist) => (
                    <tr key={dist.id} className="border-t hover:bg-muted/25">
                      <td className="p-4 font-medium">{dist.item}</td>
                      <td className="p-4">{dist.jumlah}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{dist.penerima}</div>
                          {dist.santri_id && (
                            <div className="text-sm text-muted-foreground">Santri ID: {dist.santri_id}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{dist.tanggal}</td>
                      <td className="p-4">{dist.catatan}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-green-600">
                          {dist.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredDistributions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada distribusi yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DistribusiPage;