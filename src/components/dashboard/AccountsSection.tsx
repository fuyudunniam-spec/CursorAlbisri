import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Wallet, Building2, Trash2 } from 'lucide-react';

interface AkunKas {
  id: string;
  nama: string;
  kode: string;
  tipe: string;
  saldo_saat_ini: number;
  is_default: boolean;
  status: string;
}

interface AccountsSectionProps {
  accounts: AkunKas[];
  onEditAccount?: (account: AkunKas) => void;
  onAddAccount?: () => void;
  onViewTransactions?: (accountId: string) => void;
  onDeleteAccount?: (account: AkunKas) => void;
}

const AccountsSection: React.FC<AccountsSectionProps> = ({ 
  accounts, 
  onEditAccount, 
  onAddAccount,
  onViewTransactions,
  onDeleteAccount
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAccountIcon = (tipe: string) => {
    const t = (tipe || '').toLowerCase();
    switch (t) {
      case 'kas':
        return <Wallet className="h-6 w-6" />;
      case 'bank':
        return <Building2 className="h-6 w-6" />;
      default:
        return <Wallet className="h-6 w-6" />;
    }
  };

  const getStatusColor = (status: string, isDefault: boolean) => {
    if (isDefault) return 'bg-green-100 text-green-800';
    if (status === 'aktif') return 'bg-blue-100 text-blue-800';
    if (status === 'ditutup') return 'bg-red-100 text-red-800';
    if (status === 'suspended') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string, isDefault: boolean) => {
    if (isDefault) return 'Default';
    if (status === 'aktif') return 'Aktif';
    if (status === 'ditutup') return 'Ditutup';
    if (status === 'suspended') return 'Suspended';
    return status;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saldo Per Akun</h2>
        <span className="text-sm text-muted-foreground">
          {accounts.length} akun aktif
        </span>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {accounts.map((account) => (
          <Card key={account.id} className="min-w-[280px] flex-shrink-0 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-blue-600">
                    {getAccountIcon(account.tipe)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{account.nama}</h3>
                    <p className="text-sm text-muted-foreground">{account.kode}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditAccount?.(account)}>
                      Edit Akun
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewTransactions?.(account.id)}>
                      Riwayat Transaksi
                    </DropdownMenuItem>
                    {!account.is_default && (
                      <DropdownMenuItem 
                        onClick={() => onDeleteAccount?.(account)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus Akun
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {formatCurrency(account.saldo_saat_ini)}
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    className={getStatusColor(account.status, account.is_default)}
                    variant="secondary"
                  >
                    {getStatusText(account.status, account.is_default)}
                  </Badge>
                  
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      account.is_default || account.status === 'aktif' 
                        ? 'bg-green-500' 
                        : account.status === 'ditutup'
                        ? 'bg-red-500'
                        : account.status === 'suspended'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`} />
                    <span className="text-xs text-muted-foreground">
                      {account.is_default || account.status === 'aktif' ? 'Active' : 
                       account.status === 'ditutup' ? 'Closed' :
                       account.status === 'suspended' ? 'Suspended' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Add Account Button */}
        <Card className="min-w-[280px] flex-shrink-0 border-dashed border-2 hover:border-blue-400 transition-colors duration-200">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[140px]">
            <Button 
              variant="outline" 
              className="w-full h-full flex flex-col items-center justify-center space-y-2"
              onClick={onAddAccount}
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Tambah Akun</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountsSection;
