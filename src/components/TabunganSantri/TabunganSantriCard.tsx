import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus, 
  History,
  AlertCircle
} from 'lucide-react';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { SaldoTabunganSantri } from '@/types/tabungan.types';
import { useToast } from '@/hooks/use-toast';
import { FormSetor } from './FormSetor';
import { FormTarik } from './FormTarik';
import { RiwayatTabungan } from './RiwayatTabungan';

interface TabunganSantriCardProps {
  santriId: string;
  santriName: string;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

export const TabunganSantriCard: React.FC<TabunganSantriCardProps> = ({
  santriId,
  santriName,
  isAdmin = false,
  onRefresh
}) => {
  const [saldoData, setSaldoData] = useState<SaldoTabunganSantri | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetorForm, setShowSetorForm] = useState(false);
  const [showTarikForm, setShowTarikForm] = useState(false);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const { toast } = useToast();

  const loadSaldo = async () => {
    try {
      setLoading(true);
      const saldo = await TabunganSantriService.getSaldoTabungan(santriId);
      setSaldoData({
        santri_id: santriId,
        saldo,
        santri: {
          id: santriId,
          nama_lengkap: santriName,
          nisn: '',
          kelas: '',
          kategori: ''
        }
      });
    } catch (error) {
      console.error('Error loading saldo:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat saldo tabungan',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaldo();
  }, [santriId]);

  const handleSetorSuccess = () => {
    setShowSetorForm(false);
    loadSaldo();
    onRefresh?.();
    toast({
      title: 'Berhasil',
      description: 'Setoran tabungan berhasil dicatat'
    });
  };

  const handleTarikSuccess = () => {
    setShowTarikForm(false);
    loadSaldo();
    onRefresh?.();
    toast({
      title: 'Berhasil',
      description: 'Penarikan tabungan berhasil dicatat'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const saldo = saldoData?.saldo || 0;
  const hasSaldo = saldo > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Tabungan Santri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saldo Display */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(saldo)}
            </div>
            <div className="text-sm text-muted-foreground">
              Saldo Tabungan {santriName}
            </div>
          </div>

          <Separator />

          {/* Status Badge */}
          <div className="flex justify-center">
            {hasSaldo ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Belum Ada Tabungan
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSetorForm(true)}
                className="flex-1"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Setor
              </Button>
              <Button
                onClick={() => setShowTarikForm(true)}
                variant="outline"
                className="flex-1"
                size="sm"
                disabled={!hasSaldo}
              >
                <Minus className="h-4 w-4 mr-1" />
                Tarik
              </Button>
            </div>
          )}

          {/* Riwayat Button */}
          <Button
            onClick={() => setShowRiwayat(true)}
            variant="ghost"
            className="w-full"
            size="sm"
          >
            <History className="h-4 w-4 mr-1" />
            Lihat Riwayat
          </Button>
        </CardContent>
      </Card>

      {/* Modals */}
      {showSetorForm && (
        <FormSetor
          santriId={santriId}
          santriName={santriName}
          onSuccess={handleSetorSuccess}
          onCancel={() => setShowSetorForm(false)}
        />
      )}

      {showTarikForm && (
        <FormTarik
          santriId={santriId}
          santriName={santriName}
          saldoSaatIni={saldo}
          onSuccess={handleTarikSuccess}
          onCancel={() => setShowTarikForm(false)}
        />
      )}

      {showRiwayat && (
        <RiwayatTabungan
          santriId={santriId}
          santriName={santriName}
          onClose={() => setShowRiwayat(false)}
        />
      )}
    </>
  );
};
