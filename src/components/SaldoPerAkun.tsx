import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  RefreshCw,
  DollarSign,
  Building2,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Edit,
  Trash2,
  History,
  MoreHorizontal
} from 'lucide-react';
import { AkunKasService, AkunKas } from '../services/akunKas.service';
import { toast } from 'sonner';

interface SaldoPerAkunProps {
  accounts: AkunKas[];
  onEditAccount: (account: AkunKas) => void;
  onAddAccount: () => void;
  onViewTransactions: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onRefreshBalances?: () => void;
}

const SaldoPerAkun: React.FC<SaldoPerAkunProps> = ({
  accounts,
  onEditAccount,
  onAddAccount,
  onViewTransactions,
  onDeleteAccount,
  onRefreshBalances
}) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefreshBalances) {
        await onRefreshBalances();
      }
      toast.success('Saldo berhasil diperbarui');
    } catch (error) {
      console.error('Error refreshing balances:', error);
      toast.error('Gagal memperbarui saldo');
    } finally {
      setRefreshing(false);
    }
  };

  const getAccountIcon = (tipe: string) => {
    switch (tipe) {
      case 'Kas':
        return <Wallet className="h-5 w-5" />;
      case 'Bank':
        return <Building2 className="h-5 w-5" />;
      case 'Tabungan':
        return <PiggyBank className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getAccountColor = (tipe: string) => {
    switch (tipe) {
      case 'Kas':
        return 'bg-green-100 text-green-800';
      case 'Bank':
        return 'bg-blue-100 text-blue-800';
      case 'Tabungan':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotals = () => {
    const totalBalance = accounts.reduce((sum, account) => sum + account.saldo_saat_ini, 0);
    const balancesByType = accounts.reduce((acc, account) => {
      acc[account.tipe] = (acc[account.tipe] || 0) + account.saldo_saat_ini;
      return acc;
    }, {} as { [key: string]: number });

    return { totalBalance, balancesByType };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat data saldo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Saldo Per Akun</h2>
          <p className="text-muted-foreground">
            Monitor saldo real-time untuk semua akun kas dan bank
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddAccount}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Akun
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Saldo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Semua akun aktif
            </p>
          </CardContent>
        </Card>

        {Object.entries(totals.balancesByType).map(([type, balance]) => (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{type}</CardTitle>
              {getAccountIcon(type)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
              <p className="text-xs text-muted-foreground">
                {accounts.filter(account => account.tipe === type).length} akun
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Details - Compact Design */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-full ${getAccountColor(account.tipe)}`}>
                    {getAccountIcon(account.tipe)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-medium truncate">{account.nama}</CardTitle>
                    <p className="text-xs text-muted-foreground">{account.kode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {account.is_default && (
                    <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800">
                      Default
                    </Badge>
                  )}
                  {/* Three Dots Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEditAccount(account)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Akun
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewTransactions(account.id)}>
                        <History className="h-4 w-4 mr-2" />
                        Lihat Riwayat
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteAccount(account.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus Akun
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Balance - Compact */}
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(account.saldo_saat_ini)}
                </div>
                <p className="text-xs text-muted-foreground">Saldo Saat Ini</p>
              </div>

              {/* Account Details - Compact */}
              <div className="space-y-1 text-xs">
                {account.nomor_rekening && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Rek:</span>
                    <span className="font-medium truncate ml-2">{account.nomor_rekening}</span>
                  </div>
                )}
                {account.nama_bank && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium truncate ml-2">{account.nama_bank}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo Awal:</span>
                  <span className="font-medium">{formatCurrency(account.saldo_awal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buka:</span>
                  <span className="font-medium">
                    {new Date(account.tanggal_buka).toLocaleDateString('id-ID', { 
                      day: '2-digit', 
                      month: '2-digit' 
                    })}
                  </span>
                </div>
              </div>

              {/* Status - Compact */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center space-x-1">
                  <Badge 
                    variant={account.status === 'aktif' ? 'default' : 'secondary'}
                    className={`text-xs px-1.5 py-0.5 ${
                      account.status === 'aktif' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {account.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${getAccountColor(account.tipe)}`}>
                    {account.tipe}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
};

export default SaldoPerAkun;
