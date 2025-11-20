// =====================================================
// DONASI / INFAQ WIDGET
// Widget untuk menerima donasi dengan social mission message
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Users, 
  BookOpen, 
  Home, 
  DollarSign, 
  Gift,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DonasiInfaqWidgetProps {
  compact?: boolean;
}

export const DonasiInfaqWidget: React.FC<DonasiInfaqWidgetProps> = ({ compact = false }) => {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    donatur_name: '',
    donatur_email: '',
    donatur_phone: '',
    jenis: 'Umum',
    jumlah: '',
    metode_bayar: '',
    pesan_donatur: '',
    doa_donatur: '',
    is_anonim: false
  });

  const jenisOptions = [
    { value: 'Umum', label: 'Donasi Umum', icon: Heart, color: 'text-red-500' },
    { value: 'Bantuan', label: 'Bantuan Santri', icon: Users, color: 'text-blue-500' },
    { value: 'Operasional', label: 'Operasional Yayasan', icon: Home, color: 'text-green-500' },
    { value: 'Pembangunan', label: 'Pembangunan Fasilitas', icon: Home, color: 'text-orange-500' },
    { value: 'Qurban', label: 'Qurban', icon: Gift, color: 'text-purple-500' },
  ];

  const handleSubmit = async () => {
    if (!formData.donatur_name || !formData.jumlah) {
      toast.error('Mohon lengkapi data yang diperlukan');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('donasi_infaq')
        .insert([{
          donatur_name: formData.donatur_name,
          donatur_email: formData.donatur_email,
          donatur_phone: formData.donatur_phone,
          jenis: formData.jenis,
          jumlah: parseFloat(formData.jumlah),
          metode_bayar: formData.metode_bayar,
          pesan_donatur: formData.pesan_donatur,
          doa_donatur: formData.doa_donatur,
          is_anonim: formData.is_anonim,
          status: 'Pending',
          tanggal_donasi: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      toast.success('Terima kasih atas donasi Anda! Tim kami akan segera memverifikasi.');
      setShowForm(false);
      setFormData({
        donatur_name: '',
        donatur_email: '',
        donatur_phone: '',
        jenis: 'Umum',
        jumlah: '',
        metode_bayar: '',
        pesan_donatur: '',
        doa_donatur: '',
        is_anonim: false
      });
    } catch (error: any) {
      console.error('Error submitting donation:', error);
      toast.error('Gagal mengirim donasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowForm(true)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Donasi / Infaq</h3>
                <p className="text-sm text-green-600">Dukung Pendidikan Anak Yatim</p>
              </div>
              <Button className="bg-green-600 hover:bg-green-700">
                Donasi Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
        {showForm && <DonasiFormDialog isOpen={showForm} onClose={() => setShowForm(false)} />}
      </>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Heart className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" />
            Donasi & Infaq
          </CardTitle>
          <p className="text-sm text-green-700 mt-2">
            Dukung pendidikan anak yatim, piatu, dan dhuafa
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Social Mission Message */}
          <Alert className="bg-white/80 border-green-300">
            <Users className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800">
              <strong>Sedekah Jariyah untuk Pendidikan</strong>
              <p className="mt-1">
                Setiap donasi Anda akan membantu anak-anak yatim, piatu, dan dhuafa 
                untuk mendapatkan pendidikan agama yang berkualitas. Insya Allah menjadi 
                amal jariyah yang terus mengalir.
              </p>
            </AlertDescription>
          </Alert>

          {/* Quick Donate Amounts */}
          <div className="grid grid-cols-2 gap-3">
            {[50000, 100000, 250000, 500000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                className="h-auto py-3 flex-col items-start border-green-300 hover:bg-green-100"
                onClick={() => {
                  setFormData({ ...formData, jumlah: amount.toString() });
                  setShowForm(true);
                }}
              >
                <span className="text-xs text-slate-600">Nominal</span>
                <span className="text-lg font-bold text-green-700">
                  Rp {amount.toLocaleString('id-ID')}
                </span>
              </Button>
            ))}
          </div>

          {/* Custom Amount */}
          <Button 
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => setShowForm(true)}
          >
            <Gift className="w-4 h-4 mr-2" />
            Donasi Jumlah Lain
          </Button>

          {/* Impact Stats (dummy for now) */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-green-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">127</p>
              <p className="text-xs text-green-600">Santri Terbantu</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">Rp 45jt</p>
              <p className="text-xs text-green-600">Dana Terkumpul</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && <DonasiFormDialog isOpen={showForm} onClose={() => setShowForm(false)} />}
    </>
  );
};

// Separate Dialog Component
const DonasiFormDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    donatur_name: '',
    donatur_email: '',
    donatur_phone: '',
    jenis: 'Umum',
    jumlah: '',
    metode_bayar: 'Transfer',
    pesan_donatur: '',
    doa_donatur: '',
    is_anonim: false
  });

  const handleSubmit = async () => {
    if (!formData.donatur_name || !formData.jumlah) {
      toast.error('Mohon lengkapi nama dan jumlah donasi');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('donasi_infaq')
        .insert([{
          ...formData,
          jumlah: parseFloat(formData.jumlah),
          status: 'Pending',
          tanggal_donasi: new Date().toISOString()
        }]);

      if (error) throw error;

      toast.success('Jazakumullah khairan! Donasi Anda akan segera diproses.');
      onClose();
    } catch (error: any) {
      console.error('Error submitting donation:', error);
      toast.error('Gagal mengirim donasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            Form Donasi & Infaq
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Semoga Allah membalas kebaikan Anda dengan yang lebih baik
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Social Mission */}
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800">
              Donasi Anda akan membantu:
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Bantuan untuk anak yatim dan piatu</li>
                <li>Operasional pendidikan agama berkualitas</li>
                <li>Konsumsi dan kebutuhan santri dhuafa</li>
                <li>Pembangunan fasilitas pendidikan</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label>Nama Donatur *</Label>
              <Input
                value={formData.donatur_name}
                onChange={(e) => setFormData({ ...formData, donatur_name: e.target.value })}
                placeholder="Nama lengkap Anda"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.donatur_email}
                  onChange={(e) => setFormData({ ...formData, donatur_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label>No. WhatsApp</Label>
                <Input
                  value={formData.donatur_phone}
                  onChange={(e) => setFormData({ ...formData, donatur_phone: e.target.value })}
                  placeholder="+62..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jenis Donasi *</Label>
                <Select value={formData.jenis} onValueChange={(value) => setFormData({ ...formData, jenis: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Umum">Donasi Umum</SelectItem>
                    <SelectItem value="Bantuan">Bantuan Santri</SelectItem>
                    <SelectItem value="Operasional">Operasional</SelectItem>
                    <SelectItem value="Pembangunan">Pembangunan</SelectItem>
                    <SelectItem value="Qurban">Qurban</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jumlah Donasi (Rp) *</Label>
                <Input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                  placeholder="50000"
                />
              </div>
            </div>

            <div>
              <Label>Metode Pembayaran</Label>
              <Select value={formData.metode_bayar} onValueChange={(value) => setFormData({ ...formData, metode_bayar: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transfer">Transfer Bank</SelectItem>
                  <SelectItem value="Tunai">Tunai</SelectItem>
                  <SelectItem value="QRIS">QRIS</SelectItem>
                  <SelectItem value="Virtual Account">Virtual Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pesan untuk Yayasan (Opsional)</Label>
              <Textarea
                value={formData.pesan_donatur}
                onChange={(e) => setFormData({ ...formData, pesan_donatur: e.target.value })}
                placeholder="Tuliskan pesan Anda..."
                rows={3}
              />
            </div>

            <div>
              <Label>Titip Doa (Opsional)</Label>
              <Textarea
                value={formData.doa_donatur}
                onChange={(e) => setFormData({ ...formData, doa_donatur: e.target.value })}
                placeholder="Mohon didoakan untuk..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonim"
                checked={formData.is_anonim}
                onChange={(e) => setFormData({ ...formData, is_anonim: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="anonim" className="text-sm">Sembunyikan nama saya (Anonim)</Label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              Batal
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Kirim Donasi'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonasiInfaqWidget;

