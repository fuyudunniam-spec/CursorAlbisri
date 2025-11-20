import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, DollarSign } from 'lucide-react';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { useToast } from '@/hooks/use-toast';

interface FormSetorProps {
  santriId: string;
  santriName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const FormSetor: React.FC<FormSetorProps> = ({
  santriId,
  santriName,
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
      await TabunganSantriService.setorTabungan({
        santri_id: santriId,
        nominal: parseFloat(formData.nominal),
        deskripsi: formData.deskripsi || `Setoran tunai untuk ${santriName}`,
        catatan: formData.catatan || null
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error setor tabungan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal melakukan setoran',
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

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setor Tabungan Santri</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Santri Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{santriName}</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="nominal">Nominal Setoran *</Label>
              <Input
                id="nominal"
                type="number"
                placeholder="Masukkan nominal setoran"
                value={formData.nominal}
                onChange={(e) => setFormData(prev => ({ ...prev, nominal: e.target.value }))}
                required
                min="1"
                step="1"
              />
              {formData.nominal && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(parseFloat(formData.nominal) || 0)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                placeholder="Contoh: Setoran dari orang tua, reward prestasi, dll"
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
              disabled={loading || !formData.nominal}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <DollarSign className="h-4 w-4 mr-2" />
              Setor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
