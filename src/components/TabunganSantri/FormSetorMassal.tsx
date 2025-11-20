import React, { useState, useEffect } from 'react';
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
import { 
  Loader2, 
  Users, 
  DollarSign, 
  CheckCircle,
  Search,
  User
} from 'lucide-react';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { SaldoTabunganSantri } from '@/types/tabungan.types';
import { useToast } from '@/hooks/use-toast';

interface FormSetorMassalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const FormSetorMassal: React.FC<FormSetorMassalProps> = ({
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
    catatan: ''
  });
  const { toast } = useToast();

  const loadSantriList = async () => {
    try {
      setLoadingSantri(true);
      const data = await TabunganSantriService.getSantriWithSaldo();
      setSantriList(data);
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

    try {
      setLoading(true);
      await TabunganSantriService.setorMassal({
        santri_ids: selectedSantri,
        nominal: parseFloat(formData.nominal),
        deskripsi: 'Setoran massal',
        catatan: formData.catatan || undefined
      });
      
      onSuccess();
      toast({
        title: 'Berhasil',
        description: `Setoran massal berhasil untuk ${selectedSantri.length} santri`
      });
    } catch (error: any) {
      console.error('Error setor massal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal melakukan setoran massal',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedSantri.length === filteredSantri.length) {
      setSelectedSantri([]);
    } else {
      setSelectedSantri(filteredSantri.map(santri => santri.santri_id));
    }
  };

  const handleSelectSantri = (santriId: string) => {
    setSelectedSantri(prev => 
      prev.includes(santriId) 
        ? prev.filter(id => id !== santriId)
        : [...prev, santriId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredSantri = santriList.filter(santri =>
    santri.santri.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    santri.santri.id_santri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    santri.santri.nisn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    santri.santri.kelas?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNominal = parseFloat(formData.nominal) * selectedSantri.length;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Setor Tabungan Massal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nominal">Nominal per Santri *</Label>
              <Input
                id="nominal"
                type="number"
                placeholder="Masukkan nominal setoran"
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
              ) : (
                <div className="p-2 space-y-2">
                  {filteredSantri.map((santri) => (
                    <Card key={santri.santri_id} className="p-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedSantri.includes(santri.santri_id)}
                          onCheckedChange={() => handleSelectSantri(santri.santri_id)}
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
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {santri.santri.kelas && `${santri.santri.kelas} • `}
                            Saldo saat ini: {formatCurrency(santri.saldo)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {selectedSantri.length > 0 && formData.nominal && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Ringkasan Setoran Massal</span>
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
                    <span className="text-muted-foreground">Total Setoran:</span>
                    <span className="font-bold text-lg ml-2">{formatCurrency(totalNominal)}</span>
                  </div>
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
              Setor Massal ({selectedSantri.length} santri)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
