import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface AkunKas {
  id: string;
  nama: string;
  kode: string;
  tipe: string;
  saldo_saat_ini: number;
}

interface AkunKasFilterProps {
  value: string;
  onChange: (akunKasId: string) => void;
  label?: string;
  showBalance?: boolean;
}

export function AkunKasFilter({ value, onChange, label = "Akun Kas", showBalance = true }: AkunKasFilterProps) {
  const [accounts, setAccounts] = useState<AkunKas[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('akun_kas')
        .select('id, nama, kode, tipe, saldo_saat_ini')
        .eq('status', 'aktif')
        .order('is_default', { ascending: false })
        .order('nama');

      if (error) throw error;
      setAccounts(data || []);

      // Auto-select first account if no value
      if (!value && data && data.length > 0) {
        onChange(data[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const selectedAccount = accounts.find(acc => acc.id === value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Memuat..." : "Pilih akun kas"} />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center justify-between w-full">
                <span>{account.nama}</span>
                {showBalance && (
                  <span className="text-xs text-muted-foreground ml-4">
                    {formatCurrency(account.saldo_saat_ini)}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showBalance && selectedAccount && (
        <p className="text-sm text-muted-foreground">
          Saldo: <strong className="text-primary">{formatCurrency(selectedAccount.saldo_saat_ini)}</strong>
        </p>
      )}
    </div>
  );
}
