import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Loader2, Users, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { MasterDataKeuanganService } from '@/services/masterDataKeuangan.service';

interface MappingSantriDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
    deskripsi?: string;
    santri_ids?: string[];
  }) => Promise<void>;
  initialData?: {
    tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
    deskripsi?: string;
    santri_list?: Array<{
      santri_id: string;
      santri_nama: string;
      santri_id_santri?: string;
    }>;
  };
  title?: string;
  isSubKategori?: boolean;
}

const MappingSantriDialog: React.FC<MappingSantriDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  initialData,
  title = 'Pengaturan Alokasi Santri',
  isSubKategori = false,
}) => {
  const [tipeAlokasi, setTipeAlokasi] = useState<'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri'>(
    initialData?.tipe_alokasi || 'tidak_dialokasikan'
  );
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || '');
  const [selectedSantriIds, setSelectedSantriIds] = useState<Set<string>>(
    new Set(initialData?.santri_list?.map(s => s.santri_id) || [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [saving, setSaving] = useState(false);

  // Fetch santri untuk pencarian
  const {
    data: santriList,
    isLoading: loadingSantri,
    refetch: refetchSantri,
  } = useQuery({
    queryKey: ['santri-for-mapping', searchQuery, filterKategori, filterStatus],
    queryFn: () =>
      MasterDataKeuanganService.searchSantriForMapping({
        search: searchQuery || undefined,
        kategori: filterKategori !== 'Semua' ? filterKategori : undefined,
        status: filterStatus !== 'Semua' ? filterStatus : undefined,
      }),
    enabled: tipeAlokasi === 'pilih_santri',
  });

  // Fetch semua binaan mukim untuk preview
  const { data: allBinaanMukim } = useQuery({
    queryKey: ['all-binaan-mukim'],
    queryFn: () => MasterDataKeuanganService.getAllBinaanMukimAktif(),
    enabled: tipeAlokasi === 'seluruh_binaan_mukim',
  });

  // Reset form saat dialog dibuka
  useEffect(() => {
    if (open) {
      setTipeAlokasi(initialData?.tipe_alokasi || 'tidak_dialokasikan');
      setDeskripsi(initialData?.deskripsi || '');
      setSelectedSantriIds(new Set(initialData?.santri_list?.map(s => s.santri_id) || []));
      setSearchQuery('');
      setFilterKategori('Semua');
      setFilterStatus('Semua');
    }
  }, [open, initialData]);

  // Toggle select santri
  const handleToggleSantri = (santriId: string) => {
    const newSet = new Set(selectedSantriIds);
    if (newSet.has(santriId)) {
      newSet.delete(santriId);
    } else {
      newSet.add(santriId);
    }
    setSelectedSantriIds(newSet);
  };

  // Select all
  const handleSelectAll = () => {
    if (!santriList) return;
    const allIds = new Set(santriList.map(s => s.id));
    setSelectedSantriIds(allIds);
  };

  // Clear all
  const handleClearAll = () => {
    setSelectedSantriIds(new Set());
  };

  // Handle save
  const handleSave = async () => {
    if (tipeAlokasi === 'pilih_santri' && selectedSantriIds.size === 0) {
      toast.error('Pilih minimal 1 santri untuk tipe "Pilih Santri"');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        tipe_alokasi: tipeAlokasi,
        deskripsi: deskripsi || undefined,
        santri_ids: tipeAlokasi === 'pilih_santri' ? Array.from(selectedSantriIds) : undefined,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      toast.error(error.message || 'Gagal menyimpan mapping santri');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </DialogTitle>
          {isSubKategori && (
            <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">
                Mapping ini akan override mapping dari kategori
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Tipe Alokasi */}
          <div className="space-y-3">
            <Label>Tipe Alokasi</Label>
            <RadioGroup value={tipeAlokasi} onValueChange={(v) => setTipeAlokasi(v as any)}>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="tidak_dialokasikan" id="tidak_dialokasikan" />
                <Label htmlFor="tidak_dialokasikan" className="flex-1 cursor-pointer">
                  <div className="font-medium">Tidak Dialokasikan</div>
                  <div className="text-sm text-muted-foreground">
                    Tidak ada santri yang terpilih secara default
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="seluruh_binaan_mukim" id="seluruh_binaan_mukim" />
                <Label htmlFor="seluruh_binaan_mukim" className="flex-1 cursor-pointer">
                  <div className="font-medium">Seluruh Santri Binaan Mukim</div>
                  <div className="text-sm text-muted-foreground">
                    Semua santri Binaan Mukim aktif otomatis terpilih
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="pilih_santri" id="pilih_santri" />
                <Label htmlFor="pilih_santri" className="flex-1 cursor-pointer">
                  <div className="font-medium">Pilih Santri</div>
                  <div className="text-sm text-muted-foreground">
                    Pilih santri secara manual dari daftar
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview untuk Seluruh Binaan Mukim */}
          {tipeAlokasi === 'seluruh_binaan_mukim' && allBinaanMukim && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">
                  {allBinaanMukim.length} santri Binaan Mukim aktif akan terpilih
                </span>
              </div>
            </div>
          )}

          {/* Pilih Santri Section */}
          {tipeAlokasi === 'pilih_santri' && (
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Pilih Santri</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={!santriList || santriList.length === 0}
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={selectedSantriIds.size === 0}
                  >
                    Hapus Semua
                  </Button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari santri..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Filter Kategori</Label>
                    <Select value={filterKategori} onValueChange={setFilterKategori}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Semua">Semua</SelectItem>
                        <SelectItem value="Binaan Mukim">Binaan Mukim</SelectItem>
                        <SelectItem value="Binaan Non-Mukim">Binaan Non-Mukim</SelectItem>
                        <SelectItem value="Reguler">Reguler</SelectItem>
                        <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Filter Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Semua">Semua</SelectItem>
                        <SelectItem value="Aktif">Aktif</SelectItem>
                        <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Santri List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daftar Santri</span>
                  <Badge variant="secondary">
                    Terpilih: {selectedSantriIds.size} santri
                  </Badge>
                </div>
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  {loadingSantri ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !santriList || santriList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Users className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'Tidak ada santri yang sesuai dengan pencarian' : 'Tidak ada santri'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {santriList.map((santri) => {
                        const isSelected = selectedSantriIds.has(santri.id);
                        return (
                          <div
                            key={santri.id}
                            className={`flex items-center space-x-3 p-2 rounded-md border cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleToggleSantri(santri.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSantri(santri.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{santri.nama_lengkap}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                {santri.id_santri && (
                                  <code className="bg-muted px-1 rounded">{santri.id_santri}</code>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {santri.kategori}
                                </Badge>
                                <Badge
                                  variant={santri.status === 'Aktif' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {santri.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Deskripsi */}
          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi (Optional)</Label>
            <Textarea
              id="deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Catatan tambahan tentang mapping ini..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MappingSantriDialog;

