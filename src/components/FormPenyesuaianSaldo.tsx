import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { AkunKasService, AkunKas } from '../services/akunKas.service';
import { toast } from 'sonner';

interface FormPenyesuaianSaldoProps {
  onSuccess?: () => void;
}

const FormPenyesuaianSaldo: React.FC<FormPenyesuaianSaldoProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [akunKasId, setAkunKasId] = useState<string>('');
  const [saldoAktual, setSaldoAktual] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [akunKasOptions, setAkunKasOptions] = useState<AkunKas[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AkunKas | null>(null);

  useEffect(() => {
    loadAkunKas();
  }, []);

  useEffect(() => {
    if (akunKasId) {
      const account = akunKasOptions.find(acc => acc.id === akunKasId);
      setSelectedAccount(account || null);
    } else {
      setSelectedAccount(null);
    }
  }, [akunKasId, akunKasOptions]);

  const loadAkunKas = async () => {
    try {
      const accounts = await AkunKasService.getAll();
      const activeAccounts = accounts.filter(acc => acc.status === 'aktif');
      setAkunKasOptions(activeAccounts);
    } catch (error) {
      console.error('Error loading akun kas:', error);
      toast.error('Gagal memuat akun kas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!akunKasId || !saldoAktual) {
      toast.error('Mohon pilih akun kas dan masukkan saldo aktual');
      return;
    }

    const saldoAktualNum = parseFloat(saldoAktual.replace(/\./g, '').replace(',', '.'));
    if (isNaN(saldoAktualNum)) {
      toast.error('Saldo aktual harus berupa angka');
      return;
    }

    if (!selectedAccount) {
      toast.error('Akun kas tidak ditemukan');
      return;
    }

    // Show confirmation dialog
    const selisih = saldoAktualNum - selectedAccount.saldo_saat_ini;
    const isIncrease = selisih > 0;
    
    const confirmed = window.confirm(
      `Konfirmasi Penyesuaian Saldo:\n\n` +
      `Akun: ${selectedAccount.nama}\n` +
      `Saldo Sistem: ${formatCurrency(selectedAccount.saldo_saat_ini)}\n` +
      `Saldo Aktual: ${formatCurrency(saldoAktualNum)}\n` +
      `Selisih: ${isIncrease ? '+' : ''}${formatCurrency(selisih)}\n\n` +
      `Apakah Anda yakin ingin melakukan penyesuaian saldo ini?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Call adjustment function
      console.log('[FormPenyesuaianSaldo] Calling adjust_akun_kas_saldo with:', {
        p_akun_kas_id: akunKasId,
        p_saldo_aktual: saldoAktualNum,
        p_keterangan: keterangan || null,
        p_user_id: user?.id || null
      });

      const { data, error } = await supabase.rpc('adjust_akun_kas_saldo', {
        p_akun_kas_id: akunKasId,
        p_saldo_aktual: saldoAktualNum,
        p_keterangan: keterangan || null,
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('[FormPenyesuaianSaldo] Error from adjust_akun_kas_saldo:', error);
        throw error;
      }

      console.log('[FormPenyesuaianSaldo] Result from adjust_akun_kas_saldo:', data);

      if (data && !data.success) {
        throw new Error(data.message || 'Gagal melakukan penyesuaian saldo');
      }

      // Reload akun kas list to get updated balance
      await loadAkunKas();

      // Reset form
      setAkunKasId('');
      setSaldoAktual('');
      setKeterangan('');
      setSelectedAccount(null);

      toast.success('Penyesuaian saldo berhasil dilakukan');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adjusting saldo:', error);
      toast.error('Gagal melakukan penyesuaian saldo: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' 
      ? parseFloat(amount.replace(/\./g, '').replace(',', '.')) 
      : amount;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleSaldoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setSaldoAktual(value);
  };

  const calculateDifference = () => {
    if (!selectedAccount || !saldoAktual) return null;
    const saldoAktualNum = parseFloat(saldoAktual.replace(/\./g, '').replace(',', '.'));
    if (isNaN(saldoAktualNum)) return null;
    return saldoAktualNum - selectedAccount.saldo_saat_ini;
  };

  const difference = calculateDifference();
  const isIncrease = difference !== null && difference > 0;
  const isDecrease = difference !== null && difference < 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Penyesuaian Saldo Akun Kas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Catatan Penting:</p>
                <p>Penyesuaian saldo digunakan untuk menyelaraskan saldo sistem dengan saldo aktual di bank/kas.</p>
                <p className="mt-1">Ini bukan transaksi pemasukan/pengeluaran, melainkan koreksi saldo.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="akunKas">Akun Kas *</Label>
                <Select value={akunKasId} onValueChange={setAkunKasId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun kas" />
                  </SelectTrigger>
                  <SelectContent>
                    {akunKasOptions.map(akun => (
                      <SelectItem key={akun.id} value={akun.id}>
                        {akun.nama} ({akun.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccount && (
                <div className="space-y-2">
                  <Label>Saldo Sistem Saat Ini</Label>
                  <div className="p-3 bg-gray-50 border rounded-md">
                    <p className="text-lg font-semibold text-gray-700">
                      {formatCurrency(selectedAccount.saldo_saat_ini)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="saldoAktual">Saldo Aktual (dari Bank/Kas) *</Label>
                <Input
                  id="saldoAktual"
                  type="text"
                  value={saldoAktual ? formatCurrency(saldoAktual) : ''}
                  onChange={handleSaldoChange}
                  placeholder="Masukkan saldo aktual"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Masukkan saldo aktual yang tercatat di bank atau kas fisik
                </p>
              </div>

              {difference !== null && (
                <div className="md:col-span-2">
                  <div className={`p-4 border rounded-lg ${
                    isIncrease ? 'bg-green-50 border-green-200' : 
                    isDecrease ? 'bg-red-50 border-red-200' : 
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isIncrease && <TrendingUp className="h-5 w-5 text-green-600" />}
                      {isDecrease && <TrendingDown className="h-5 w-5 text-red-600" />}
                      <div>
                        <p className="text-sm font-medium text-gray-700">Selisih:</p>
                        <p className={`text-lg font-semibold ${
                          isIncrease ? 'text-green-700' : 
                          isDecrease ? 'text-red-700' : 
                          'text-gray-700'
                        }`}>
                          {isIncrease ? '+' : ''}{formatCurrency(difference)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isIncrease 
                            ? 'Saldo aktual lebih besar dari saldo sistem' 
                            : isDecrease 
                            ? 'Saldo aktual lebih kecil dari saldo sistem'
                            : 'Saldo aktual sama dengan saldo sistem'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Rekonsiliasi bulanan, penyesuaian setelah audit, dll."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="submit"
                disabled={loading || difference === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Memproses...' : 'Lakukan Penyesuaian'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormPenyesuaianSaldo;



