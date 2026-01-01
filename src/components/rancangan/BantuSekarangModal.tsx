import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Heart } from 'lucide-react';
import { type RancanganPelayanan, PILAR_PELAYANAN_CONFIG, type PilarPelayanan } from '@/services/rancanganPelayanan.service';
import { toast } from 'sonner';

interface BantuSekarangModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rancangan: RancanganPelayanan;
  onSuccess: (pilar: PilarPelayanan, nominal: number) => Promise<void>;
}

const BantuSekarangModal: React.FC<BantuSekarangModalProps> = ({
  open,
  onOpenChange,
  rancangan,
  onSuccess
}) => {
  const [selectedPilar, setSelectedPilar] = useState<PilarPelayanan>('pendidikan_formal');
  const [nominal, setNominal] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers
    const cleaned = value.replace(/[^\d]/g, '');
    setNominal(cleaned);
  };

  const handleSubmit = async () => {
    const nominalValue = parseCurrency(nominal);
    
    if (nominalValue <= 0) {
      toast.error('Nominal harus lebih dari 0');
      return;
    }

    try {
      setLoading(true);
      await onSuccess(selectedPilar, nominalValue);
      toast.success('Terima kasih! Bantuan Anda akan diproses.');
      setNominal('');
      setSelectedPilar('pendidikan_formal');
    } catch (error) {
      console.error('Error processing donation:', error);
      toast.error('Gagal memproses bantuan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const displayNominal = nominal ? formatCurrency(parseCurrency(nominal)) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-emerald-600" />
            Bantu {rancangan.santri?.nama_lengkap || 'Santri'}
          </DialogTitle>
          <DialogDescription>
            Pilih pilar pelayanan dan masukkan nominal bantuan Anda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pilih Pilar */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Pilih Pilar Pelayanan
            </Label>
            <RadioGroup
              value={selectedPilar}
              onValueChange={(value) => setSelectedPilar(value as PilarPelayanan)}
              className="space-y-2"
            >
              {Object.entries(PILAR_PELAYANAN_CONFIG).map(([key, config]) => (
                <div
                  key={key}
                  className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RadioGroupItem value={key} id={key} />
                  <Label
                    htmlFor={key}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium text-gray-900">{config.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{config.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Nominal */}
          <div className="space-y-2">
            <Label htmlFor="nominal" className="text-sm font-semibold text-gray-700">
              Nominal Bantuan
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                Rp
              </span>
              <Input
                id="nominal"
                type="text"
                value={displayNominal}
                onChange={handleNominalChange}
                placeholder="0"
                className="pl-10 text-right font-mono text-lg"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500">
              Masukkan nominal bantuan yang ingin Anda berikan
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading || !nominal || parseCurrency(nominal) <= 0}
            >
              {loading ? 'Memproses...' : 'Proses Pembayaran'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BantuSekarangModal;

