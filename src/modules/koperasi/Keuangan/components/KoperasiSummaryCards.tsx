import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Building2, TrendingUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KoperasiSummaryCardsProps {
  saldoKas: number;
  hakYayasan: number;
  labaPeriode: number;
  periodLabel: string;
}

export default function KoperasiSummaryCards({
  saldoKas,
  hakYayasan,
  labaPeriode,
  periodLabel
}: KoperasiSummaryCardsProps) {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Saldo Kas Koperasi */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            Saldo Kas Koperasi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(saldoKas)}
            </p>
            <p className="text-xs text-gray-500">
              Total kas masuk - kas keluar untuk akun kas koperasi
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Hak Yayasan di Kas */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            Hak Yayasan di Kas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(hakYayasan)}
            </p>
            <p className="text-xs text-gray-500">
              Total bagian yayasan yang belum disetor
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/koperasi/keuangan/kelola-hpp')}
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Lihat Detail
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Laba Periode Ini */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100">
          <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${labaPeriode >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            Laba {periodLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            <p className={`text-2xl font-bold ${labaPeriode >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(labaPeriode)}
            </p>
            <p className="text-xs text-gray-500">
              Penjualan - HPP - Beban Operasional
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


