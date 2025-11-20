import React, { useEffect, useState } from 'react';
import { AkademikKelasService, KelasMasterInput } from '@/services/akademikKelas.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const MasterKelasPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState<Array<any>>([]);
  const [form, setForm] = useState<KelasMasterInput>({
    nama_kelas: '',
    program: 'Madin',
    rombel: '',
    tingkat: '',
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil',
    status: 'Aktif'
  });
  const [level, setLevel] = useState<string>('');
  const [rombelMassal, setRombelMassal] = useState<string>('');

  const LEVEL_OPTIONS: Record<string, string[]> = {
    Madin: ["I’dad", 'Wustho', 'Ulya'],
    TPQ: ['Iqra 1', 'Iqra 2', 'Iqra 3', 'Iqra 4', 'Iqra 5', 'Iqra 6', 'Qur’an'],
    Tahfid: Array.from({ length: 30 }, (_, i) => `Juz ${i + 1}`),
    Tahsin: ['Level 1', 'Level 2', 'Level 3']
  };

  const buildAutoName = (p: string, lvl: string, r?: string) => {
    const suffix = r ? ` ${r}` : '';
    if (p === 'Madin') return `Madin ${lvl}${suffix}`.trim();
    if (p === 'TPQ') return `TPQ ${lvl}${suffix}`.trim();
    if (p === 'Tahfid') return `Tahfid ${lvl}${suffix}`.trim();
    if (p === 'Tahsin') return `Tahsin ${lvl}${suffix}`.trim();
    return `${p} ${lvl}${suffix}`.trim();
  };

  const loadKelas = async () => {
    try {
      setLoading(true);
      const rows = await AkademikKelasService.listKelas();
      setKelas(rows);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKelas(); }, []);

  const handleCreate = async () => {
    // Jika rombel massal diisi, buat banyak kelas sekaligus
    try {
      const program = form.program;
      const namaAuto = buildAutoName(program, level || form.tingkat || '', form.rombel || undefined);
      const base: KelasMasterInput = {
        ...form,
        nama_kelas: form.nama_kelas?.trim() || namaAuto,
        tingkat: level || form.tingkat || ''
      };

      if (rombelMassal.trim()) {
        const rombels = rombelMassal.split(',').map(r => r.trim()).filter(Boolean);
        if (rombels.length === 0) {
          toast.error('Format Rombel Massal tidak valid');
          return;
        }
        const payloads = rombels.map((r) => ({
          ...base,
          rombel: r,
          nama_kelas: buildAutoName(program, base.tingkat || '', r)
        }));
        await AkademikKelasService.createKelasBulk(payloads);
        toast.success(`Berhasil membuat ${payloads.length} kelas`);
      } else {
        if (!base.nama_kelas?.trim()) {
          toast.error('Nama kelas atau Level wajib diisi');
          return;
        }
        await AkademikKelasService.createKelas(base);
        toast.success('Kelas berhasil dibuat');
      }

      setForm({ ...form, nama_kelas: '', rombel: '' });
      setLevel('');
      setRombelMassal('');
      loadKelas();
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat kelas');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kelas ini? Kelas dan keanggotaan akan ikut terhapus.')) return;
    try {
      await AkademikKelasService.deleteKelas(id);
      toast.success('Kelas dihapus');
      loadKelas();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus kelas');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Kelas</h1>
          <p className="text-muted-foreground">Buat kelas (mis. Madin I’dad) dan kelola daftar kelas.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buat Kelas</CardTitle>
          <CardDescription>Isi data kelas lalu klik Buat.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-6">
          <div>
            <Label>Program</Label>
            <Select value={form.program} onValueChange={(v: any) => { setForm({ ...form, program: v }); setLevel(''); }}>
              <SelectTrigger><SelectValue placeholder="Pilih program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Madin">Madin</SelectItem>
                <SelectItem value="TPQ">TPQ</SelectItem>
                <SelectItem value="Tahfid">Tahfid</SelectItem>
                <SelectItem value="Tahsin">Tahsin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Level/Template</Label>
            <Select value={level} onValueChange={(v: any) => { setLevel(v); setForm({ ...form, nama_kelas: buildAutoName(form.program, v, form.rombel || undefined), tingkat: v }); }}>
              <SelectTrigger><SelectValue placeholder="Pilih level/template" /></SelectTrigger>
              <SelectContent>
                {(LEVEL_OPTIONS[form.program] || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Nama Kelas (otomatis dari Program+Level+Rombel, bisa diedit)</Label>
            <Input value={form.nama_kelas} onChange={(e) => setForm({ ...form, nama_kelas: e.target.value })} placeholder="Madin I’dad A" />
          </div>
          <div>
            <Label>Rombel</Label>
            <Input value={form.rombel} onChange={(e) => { setForm({ ...form, rombel: e.target.value }); setForm(f => ({ ...f, nama_kelas: buildAutoName(f.program, level || f.tingkat || '', e.target.value) } as any)); }} placeholder="A/B/C" />
          </div>
          <div>
            <Label>Tingkat</Label>
            <Input value={form.tingkat || level} onChange={(e) => { setForm({ ...form, tingkat: e.target.value }); setLevel(e.target.value); }} placeholder="I’dad/Dasar/Menengah" />
          </div>
          <div>
            <Label>Tahun Ajaran</Label>
            <Input value={form.tahun_ajaran} onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })} />
          </div>
          <div>
            <Label>Semester</Label>
            <Select value={form.semester} onValueChange={(v: any) => setForm({ ...form, semester: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ganjil">Ganjil</SelectItem>
                <SelectItem value="Genap">Genap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Rombel Massal (opsional)</Label>
            <Input value={rombelMassal} onChange={(e) => setRombelMassal(e.target.value)} placeholder="Contoh: A,B,C" />
            <p className="text-xs text-muted-foreground mt-1">Pisahkan dengan koma untuk membuat banyak kelas sekaligus.</p>
          </div>
          <div className="md:col-span-3 flex items-end">
            <Button onClick={handleCreate} className="gap-2"><Plus className="w-4 h-4" />Buat Kelas</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kelas</CardTitle>
          <CardDescription>{loading ? 'Memuat...' : `${kelas.length} kelas ditemukan`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Rombel</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>TA/Semester</TableHead>
                  <TableHead>Anggota</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelas.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nama_kelas}</TableCell>
                    <TableCell>{row.program}</TableCell>
                    <TableCell>{row.rombel || '-'}</TableCell>
                    <TableCell>{row.tingkat || '-'}</TableCell>
                    <TableCell>{row.tahun_ajaran} / {row.semester}</TableCell>
                    <TableCell>{row.jumlah_anggota}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
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
  );
};

export default MasterKelasPage;


