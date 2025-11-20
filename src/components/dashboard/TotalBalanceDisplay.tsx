import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, MoreHorizontal, Eye } from 'lucide-react';
import { AkunKas } from '../../services/akunKas.service';

interface TotalBalanceDisplayProps {
  totalBalance: number;
  accountCount: number;
  selectedAccount?: AkunKas | null;
  onTransfer?: () => void;
  onRequest?: () => void;
  onViewAllAccounts?: () => void;
}

const TotalBalanceDisplay: React.FC<TotalBalanceDisplayProps> = ({
  totalBalance,
  accountCount,
  selectedAccount,
  onTransfer,
  onRequest,
  onViewAllAccounts
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSubtitle = () => {
    if (selectedAccount) {
      return `Saldo dari ${selectedAccount.nama}`;
    }
    return `Total semua akun (${accountCount} akun)`;
  };

  const getCapitalDescription = () => {
    if (selectedAccount) {
      return `Akun ${selectedAccount.tipe} dengan saldo terkini`;
    }
    return `Modal terdiri dari ${accountCount} sumber`;
  };

  return (
    <div className="space-y-6">
      {/* Simplified Total Balance Card */}
      <Card className="rounded-2xl shadow-md border-0 bg-white">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Total Balance</h2>
            {selectedAccount && onViewAllAccounts && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onViewAllAccounts}
                className="text-gray-600 hover:text-gray-900"
              >
                Lihat Semua
              </Button>
            )}
          </div>

          {/* Balance Display */}
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-gray-600">
              {getCapitalDescription()}
            </p>
          </div>

          {/* Simple Action Buttons */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onTransfer}
            >
              Transfer
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onRequest}
            >
              Request
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simplified Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-xl border-0 shadow-sm bg-white">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-gray-900">
              {accountCount}
            </div>
            <div className="text-xs text-gray-600">
              Akun Aktif
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-0 shadow-sm bg-white">
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-blue-600">
              {selectedAccount ? '1' : accountCount}
            </div>
            <div className="text-xs text-gray-600">
              {selectedAccount ? 'Dipilih' : 'Total'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TotalBalanceDisplay;
