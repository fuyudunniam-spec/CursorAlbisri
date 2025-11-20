import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Users, 
  DollarSign, 
  CheckCircle,
  Search,
  User,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { SaldoTabunganSantri, TarikMassalResult } from '@/types/tabungan.types';
import { useToast } from '@/hooks/use-toast';

interface FormTarikMassalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const FormTarikMassal: React.FC<FormTarikMassalProps> = ({
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingSantri, setLoadingSantri] = useState(true);
  const [santriList, setSantriList] = useState<SaldoTabunganSantri[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nominal: '',
    deskripsi: '',
    catatan: ''
  });
  const { toast } = useToast();
  const onCancelRef = useRef(onCancel);
  
  // Update ref when onCancel changes
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const loadSantriList = async () => {
    try {
      setLoadingSantri(true);
      const data = await TabunganSantriService.getSantriWithSaldo();
      // Filter hanya santri yang memiliki saldo > 0
      const santriWithSaldo = data.filter(santri => santri.saldo > 0);
      setSantriList(santriWithSaldo);
    } catch (error: any) {
      console.error('Error loading santri:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat daftar santri',
        variant: 'destructive'
      });
    } finally {
      setLoadingSantri(false);
    }
  };

  useEffect(() => {
    loadSantriList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSantri.length === 0) {
      toast({
        title: 'Error',
        description: 'Pilih minimal satu santri',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.nominal || parseFloat(formData.nominal) <= 0) {
      toast({
        title: 'Error',
        description: 'Nominal harus lebih dari 0',
        variant: 'destructive'
      });
      return;
    }

    // Validasi saldo sebelum submit
    const insufficientSaldo = selectedSantri.filter(santriId => {
      const santri = santriList.find(s => s.santri_id === santriId);
      return santri && santri.saldo < parseFloat(formData.nominal);
    });

    if (insufficientSaldo.length > 0) {
      toast({
        title: 'Error',
        description: `${insufficientSaldo.length} santri memiliki saldo tidak mencukupi`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const result: TarikMassalResult = await TabunganSantriService.tarikMassal({
        santri_ids: selectedSantri,
        nominal: parseFloat(formData.nominal),
        deskripsi: formData.deskripsi || undefined,
        catatan: formData.catatan || undefined
      });
      
      onSuccess();
      
      if (result.failed_count > 0) {
        toast({
          title: 'Sebagian Berhasil',
          description: `${result.success_count} berhasil, ${result.failed_count} gagal (saldo tidak mencukupi)`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Berhasil',
          description: `Penarikan massal berhasil untuk ${result.success_count} santri`
        });
      }
    } catch (error: any) {
      console.error('Error tarik massal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal melakukan penarikan massal',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredSantri = useMemo(() => {
    return santriList.filter(santri =>
      santri.santri.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      santri.santri.id_santri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      santri.santri.nisn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      santri.santri.kelas?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [santriList, searchTerm]);

  const handleSelectAll = useCallback(() => {
    setSelectedSantri(prev => {
      if (prev.length === filteredSantri.length) {
        return [];
      } else {
        return filteredSantri.map(santri => santri.santri_id);
      }
    });
  }, [filteredSantri]);

  const handleSelectSantri = useCallback((santriId: string) => {
    setSelectedSantri(prev => 
      prev.includes(santriId) 
        ? prev.filter(id => id !== santriId)
        : [...prev, santriId]
    );
  }, []);

  const totalNominal = parseFloat(formData.nominal) * selectedSantri.length;
  const nominal = parseFloat(formData.nominal) || 0;

  // Check which selected santri have insufficient saldo
  const insufficientSaldo = selectedSantri.filter(santriId => {
    const santri = santriList.find(s => s.santri_id === santriId);
    return santri && santri.saldo < nominal;
  });

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onCancelRef.current();
    }
  }, []);

  return (
    <Dialog open={true} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Tarik Tabungan Massal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nominal">Nominal per Santri *</Label>
              <Input
                id="nominal"
                type="number"
                placeholder="Masukkan nominal penarikan"
                value={formData.nominal}
                onChange={(e) => setFormData(prev => ({ ...prev, nominal: e.target.value }))}
                required
                min="1"
                step="any"
              />
              {formData.nominal && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(parseFloat(formData.nominal) || 0)} per santri
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                placeholder="Contoh: Penarikan untuk kebutuhan pribadi, dll"
                value={formData.deskripsi}
                onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="catatan">Catatan Tambahan</Label>
            <Textarea
              id="catatan"
              placeholder="Catatan internal (opsional)"
              value={formData.catatan}
              onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
              rows={2}
            />
          </div>

          <Separator />

          {/* Santri Selection */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">Pilih Santri ({selectedSantri.length} terpilih)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedSantri.length === filteredSantri.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4 flex-shrink-0">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari santri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Santri List */}
            <div className="max-h-[50vh] border rounded-md overflow-y-auto">
                {loadingSantri ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredSantri.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    {searchTerm ? 'Tidak ada santri yang cocok dengan pencarian' : 'Tidak ada santri dengan saldo > 0'}
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredSantri.map((santri) => {
                      const isInsufficient = santri.saldo < nominal;
                      const isSelected = selectedSantri.includes(santri.santri_id);
                      
                      return (
                        <Card 
                          key={santri.santri_id} 
                          className={`p-3 hover:bg-muted/50 transition-colors ${isInsufficient && isSelected ? 'border-red-200 bg-red-50' : ''}`}
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                if (!isInsufficient) {
                                  handleSelectSantri(santri.santri_id);
                                }
                              }}
                              disabled={isInsufficient}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                {santri.santri.id_santri && (
                                  <Badge variant="secondary" className="text-xs font-mono flex-shrink-0">
                                    {santri.santri.id_santri}
                                  </Badge>
                                )}
                                <span className="font-medium">{santri.santri.nama_lengkap}</span>
                                {santri.santri.nisn && (
                                  <Badge variant="outline" className="text-xs">
                                    {santri.santri.nisn}
                                  </Badge>
                                )}
                                {santri.santri.kategori && (
                                  <Badge variant="secondary" className="text-xs">
                                    {santri.santri.kategori}
                                  </Badge>
                                )}
                                {isInsufficient && (
                                  <Badge variant="destructive" className="text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Saldo Tidak Cukup
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {santri.santri.kelas && `${santri.santri.kelas} • `}
                                Saldo: <span className={santri.saldo > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>{formatCurrency(santri.saldo)}</span>
                                {isInsufficient && (
                                  <span className="text-red-600 ml-2 font-medium">
                                    (Kurang {formatCurrency(nominal - santri.saldo)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>

          {/* Warning for insufficient saldo */}
          {insufficientSaldo.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {insufficientSaldo.length} santri terpilih memiliki saldo tidak mencukupi. 
                Mereka akan dilewati saat penarikan massal.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {selectedSantri.length > 0 && formData.nominal && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Ringkasan Penarikan Massal</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Jumlah Santri:</span>
                    <span className="font-medium ml-2">{selectedSantri.length} santri</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nominal per Santri:</span>
                    <span className="font-medium ml-2">{formatCurrency(parseFloat(formData.nominal))}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Total Penarikan:</span>
                    <span className="font-bold text-lg ml-2">{formatCurrency(totalNominal)}</span>
                  </div>
                  {insufficientSaldo.length > 0 && (
                    <div className="col-span-2 text-red-600">
                      <span className="text-muted-foreground">Santri dengan saldo tidak cukup:</span>
                      <span className="font-medium ml-2">{insufficientSaldo.length} santri</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !formData.nominal || selectedSantri.length === 0}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <DollarSign className="h-4 w-4 mr-2" />
              Tarik Massal ({selectedSantri.length} santri)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
