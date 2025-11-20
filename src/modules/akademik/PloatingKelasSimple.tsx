import React, { useEffect, useMemo, useState } from 'react';
import { AkademikPloatingService, KelasOption, SantriLite } from '@/services/akademikPloating.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Users } from 'lucide-react';

const PloatingKelasSimple: React.FC = () => {
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [kelasId, setKelasId] = useState<string>('');
  const [anggota, setAnggota] = useState<SantriLite[]>([]);
  const [query, setQuery] = useState('');
  const [hasilCari, setHasilCari] = useState<SantriLite[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedKelas = useMemo(() => kelasOptions.find(k => k.id === kelasId), [kelasOptions, kelasId]);

  const loadKelas = async () => {
    try {
      const list = await AkademikPloatingService.getKelasOptions();
      setKelasOptions(list);
      if (!kelasId && list.length > 0) setKelasId(list[0].id);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat kelas');
    }
  };

  const loadAnggota = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const rows = await AkademikPloatingService.listAnggota(id);
      setAnggota(rows);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat anggota kelas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKelas(); }, []);
  useEffect(() => { if (kelasId) loadAnggota(kelasId); }, [kelasId]);

  const handleSearch = async () => {
    try {
      const res = await AkademikPloatingService.searchSantri(query);
      setHasilCari(res);
    } catch (e: any) {
      toast.error(e.message || 'Gagal mencari santri');
    }
  };

  const toggleSelect = (sid: string) => {
    setSelectedSantri(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]);
  };

  const addSelected = async () => {
    if (!kelasId || selectedSantri.length === 0) {
      toast.error('Pilih kelas dan minimal satu santri');
      return;
    }
    try {
      await AkademikPloatingService.addMembers(kelasId, selectedSantri);
      toast.success(`Ditambahkan ${selectedSantri.length} santri ke kelas`);
      setSelectedSantri([]);
      loadAnggota(kelasId);
    } catch (e: any) {
      toast.error(e.message || 'Gagal menambahkan santri');
    }
  };

  const removeMember = async (sid: string) => {
    if (!confirm('Hapus santri dari kelas ini?')) return;
    try {
      await AkademikPloatingService.removeMember(kelasId, sid);
      toast.success('Santri dihapus dari kelas');
      loadAnggota(kelasId);
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus santri');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ploating Kelas</h1>
          <p className="text-muted-foreground">Pilih kelas lalu tambahkan santri ke kelas tersebut.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pilih Kelas</CardTitle>
          <CardDescription>Pilih kelas tujuan sebelum menambahkan santri.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Kelas</Label>
            <Select value={kelasId} onValueChange={(v: any) => setKelasId(v)}>
              <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>
                {kelasOptions.map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.nama_kelas} {k.rombel ? `- ${k.rombel}` : ''} ({k.program})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Cari Santri</Label>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nama atau NISN" />
              </div>
              <Button onClick={handleSearch}>Cari</Button>
              <Button variant="secondary" onClick={addSelected}><Plus className="w-4 h-4 mr-2" />Tambah Terpilih</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hasil Pencarian</CardTitle>
            <CardDescription>Pilih beberapa santri untuk ditambahkan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Kategori</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasilCari.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Checkbox checked={selectedSantri.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{s.nama_lengkap}</TableCell>
                      <TableCell>{s.nisn || '-'}</TableCell>
                      <TableCell>{s.kategori || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anggota Kelas</CardTitle>
            <CardDescription>{selectedKelas ? `${selectedKelas.nama_kelas}${selectedKelas.rombel ? ' - '+selectedKelas.rombel : ''}` : 'Pilih kelas'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{loading ? 'Memuat...' : `${anggota.length} santri dalam kelas`}</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anggota.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nama_lengkap}</TableCell>
                      <TableCell>{s.nisn || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeMember(s.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PloatingKelasSimple;


