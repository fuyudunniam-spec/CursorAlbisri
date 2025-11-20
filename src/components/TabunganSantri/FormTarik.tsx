import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, DollarSign, AlertTriangle } from 'lucide-react';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { useToast } from '@/hooks/use-toast';

interface FormTarikProps {
  santriId: string;
  santriName: string;
  saldoSaatIni: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export const FormTarik: React.FC<FormTarikProps> = ({
  santriId,
  santriName,
  saldoSaatIni,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nominal: '',
    deskripsi: '',
    catatan: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nominal = parseFloat(formData.nominal);
    
    if (!formData.nominal || nominal <= 0) {
      toast({
        title: 'Error',
        description: 'Nominal harus lebih dari 0',
        variant: 'destructive'
      });
      return;
    }

    if (nominal > saldoSaatIni) {
      toast({
        title: 'Error',
        description: `Saldo tidak mencukupi. Saldo saat ini: ${formatCurrency(saldoSaatIni)}`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await TabunganSantriService.tarikTabungan({
        santri_id: santriId,
        nominal: nominal,
        deskripsi: formData.deskripsi || `Penarikan tunai dari ${santriName}`,
        catatan: formData.catatan || null
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error tarik tabungan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal melakukan penarikan',
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

  const nominal = parseFloat(formData.nominal) || 0;
  const saldoSesudah = saldoSaatIni - nominal;
  const isInsufficient = nominal > saldoSaatIni;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tarik Tabungan Santri</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Santri Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{santriName}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Saldo saat ini: <span className="font-medium">{formatCurrency(saldoSaatIni)}</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="nominal">Nominal Penarikan *</Label>
              <Input
                id="nominal"
                type="number"
                placeholder="Masukkan nominal penarikan"
                value={formData.nominal}
                onChange={(e) => setFormData(prev => ({ ...prev, nominal: e.target.value }))}
                required
                min="1"
                max={saldoSaatIni}
                step="1"
              />
              {formData.nominal && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(nominal)}
                </p>
              )}
            </div>

            {/* Saldo Preview */}
            {formData.nominal && (
              <Card className={isInsufficient ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
                <CardContent className="p-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Saldo saat ini:</span>
                      <span>{formatCurrency(saldoSaatIni)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Penarikan:</span>
                      <span className="text-red-600">-{formatCurrency(nominal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Saldo setelah penarikan:</span>
                      <span className={isInsufficient ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(saldoSesudah)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning if insufficient */}
            {isInsufficient && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Saldo tidak mencukupi untuk penarikan ini.
                </AlertDescription>
              </Alert>
            )}

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
          </div>

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
              disabled={loading || !formData.nominal || isInsufficient}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <DollarSign className="h-4 w-4 mr-2" />
              Tarik
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
