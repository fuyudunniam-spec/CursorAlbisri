import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  DollarSign,
  Building2,
  PiggyBank,
  Wallet,
  Plus,
  Edit,
  Trash2,
  History,
  MoreHorizontal,
  Check,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { AkunKas } from '../../services/akunKas.service';

interface StackedAccountCardsProps {
  accounts: AkunKas[];
  selectedAccountId?: string;
  onSelectAccount: (accountId: string | undefined) => void;
  onAddAccount: () => void;
  onEditAccount?: (account: AkunKas) => void;
  onDeleteAccount?: (account: AkunKas) => void;
  onViewTransactions?: (accountId: string) => void;
  onSetDefaultAccount?: (accountId: string) => void;
}

const StackedAccountCards: React.FC<StackedAccountCardsProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onViewTransactions,
  onSetDefaultAccount
}) => {
  const [stackOrder, setStackOrder] = useState<string[]>([]);

  // Create stable navigation order (doesn't change on click - used for prev/next logic)
  const navigationOrder = useMemo(() => {
    const activeAccounts = accounts.filter(account => account.status === 'aktif');
    return activeAccounts
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(account => account.id);
  }, [accounts]);

  // Initialize stack order when accounts change
  useEffect(() => {
    const activeAccounts = accounts.filter(account => account.status === 'aktif');
    const sortedAccounts = [...activeAccounts].sort((a, b) => {
      // Put selected account first, then by default status, then by creation date
      if (selectedAccountId) {
        if (a.id === selectedAccountId) return -1;
        if (b.id === selectedAccountId) return 1;
      }
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    setStackOrder(sortedAccounts.map(account => account.id));
    
    // Debug logging
    console.log('StackedAccountCards - Stack order updated:', {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      accountNames: activeAccounts.map(a => a.nama),
      stackOrder: sortedAccounts.map(account => account.id),
      navigationOrder,
      selectedAccountId,
      navigationIndex: navigationOrder.findIndex(id => id === selectedAccountId),
      willShowNavigation: activeAccounts.length > 1
    });
  }, [accounts, selectedAccountId]);

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

  const getAccountColors = (tipe: string) => {
    switch (tipe) {
      case 'Kas':
        return {
          bg: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
          text: 'text-yellow-900',
          border: 'border-yellow-300',
          shadow: 'shadow-yellow-100'
        };
      case 'Bank':
        return {
          bg: 'bg-gradient-to-br from-slate-700 to-slate-800',
          text: 'text-white',
          border: 'border-slate-600',
          shadow: 'shadow-slate-100'
        };
      case 'Tabungan':
        return {
          bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
          text: 'text-white',
          border: 'border-purple-400',
          shadow: 'shadow-purple-100'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-400 to-gray-500',
          text: 'text-white',
          border: 'border-gray-300',
          shadow: 'shadow-gray-100'
        };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCardClick = (accountId: string) => {
    // Move clicked card to front of stack
    const newOrder = [
      accountId,
      ...stackOrder.filter(id => id !== accountId)
    ];
    setStackOrder(newOrder);
    
    // Trigger selection
    onSelectAccount(accountId);
  };

  const handleAddAccount = () => {
    onAddAccount();
  };

  const handleEditAccount = (account: AkunKas, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditAccount) {
      onEditAccount(account);
    }
  };

  const handleDeleteAccount = (account: AkunKas, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteAccount) {
      onDeleteAccount(account);
    }
  };

  const handleViewTransactions = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewTransactions) {
      onViewTransactions(accountId);
    }
  };

  // Get accounts in stack order
  const stackedAccounts = stackOrder
    .map(id => accounts.find(account => account.id === id))
    .filter(Boolean) as AkunKas[];

  if (stackedAccounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Akun Kas</h3>
          <Button size="sm" onClick={handleAddAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Akun
          </Button>
        </div>
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada akun kas</p>
            <p className="text-sm">Klik "Tambah Akun" untuk membuat akun pertama</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Akun Kas</h3>
          <p className="text-sm text-muted-foreground">
            {stackedAccounts.length} akun aktif (Sistem Unified)
          </p>
        </div>
        <Button size="sm" onClick={handleAddAccount}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Akun
        </Button>
      </div>

      {/* Enhanced Navigation Controls */}
      {stackedAccounts.length > 1 && (
        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const currentIndex = navigationOrder.findIndex(id => id === selectedAccountId);
                if (currentIndex > 0) {
                  const prevIndex = currentIndex - 1;
                  handleCardClick(navigationOrder[prevIndex]);
                }
              }}
              disabled={navigationOrder.findIndex(id => id === selectedAccountId) === 0}
              className="h-8 px-3 border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title={navigationOrder.findIndex(id => id === selectedAccountId) === 0 ? "Sudah di akun pertama" : "Akun Sebelumnya"}
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Prev
            </Button>
            
            <div className="flex flex-col items-center space-y-2">
              {/* Positioned Pagination Dots */}
              <div className="relative w-20 h-4 flex items-center justify-center">
                {navigationOrder.map((accountId, navigationIndex) => {
                  const account = accounts.find(acc => acc.id === accountId);
                  const currentNavigationIndex = navigationOrder.findIndex(id => id === selectedAccountId);
                  const isSelected = selectedAccountId === accountId;
                  
                  if (!account) return null;
                  
                  // Calculate position based on navigation sequence and total accounts
                  let position = 'translate-x-0'; // center by default
                  
                  if (navigationOrder.length === 2) {
                    // For 2 accounts: left and right positions
                    position = navigationIndex === 0 ? 'translate-x-[-16px]' : 'translate-x-[16px]';
                  } else if (navigationOrder.length === 3) {
                    // For 3 accounts: left, center, right positions based on navigation index
                    position = navigationIndex === 0 ? 'translate-x-[-20px]' 
                             : navigationIndex === 1 ? 'translate-x-0' 
                             : 'translate-x-[20px]';
                  } else {
                    // For more than 3 accounts: distribute evenly
                    const spacing = 32 / (navigationOrder.length - 1);
                    position = `translate-x-[${-16 + (navigationIndex * spacing)}px]`;
                  }
                  
                  return (
                    <button
                      key={accountId}
                      className={`absolute w-3 h-3 rounded-full transition-all duration-300 ease-in-out border-2 transform ${position} ${
                        isSelected 
                          ? 'bg-blue-500 border-blue-600 scale-125 shadow-lg' 
                          : 'bg-gray-200 border-gray-300 hover:bg-gray-300 hover:border-gray-400 hover:scale-110'
                      }`}
                      onClick={() => handleCardClick(accountId)}
                      title={`Pilih ${account.nama}`}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {navigationOrder.findIndex(id => id === selectedAccountId) + 1} of {navigationOrder.length}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const currentIndex = navigationOrder.findIndex(id => id === selectedAccountId);
                if (currentIndex < navigationOrder.length - 1) {
                  const nextIndex = currentIndex + 1;
                  handleCardClick(navigationOrder[nextIndex]);
                }
              }}
              disabled={navigationOrder.findIndex(id => id === selectedAccountId) === navigationOrder.length - 1}
              className="h-8 px-3 border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title={navigationOrder.findIndex(id => id === selectedAccountId) === navigationOrder.length - 1 ? "Sudah di akun terakhir" : "Akun Selanjutnya"}
            >
              Next
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Stacked Cards Container - Thin Design */}
      <div className="relative h-80 max-w-xs mx-auto">
        {stackedAccounts.map((account, index) => {
          const colors = getAccountColors(account.tipe);
          const isSelected = selectedAccountId === account.id;
          const isTop = index === 0;
          
          // Calculate positioning and z-index for stacking effect
          const translateY = index * 12;
          const translateX = index * 2;
          const zIndex = stackedAccounts.length - index;
          const opacity = isTop ? 1 : 0.85 - (index * 0.1);
          
          return (
            <div
              key={account.id}
              className={`absolute w-full cursor-pointer transition-all duration-300 ease-in-out hover:translate-y-[-4px] hover:shadow-xl ${
                isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
              }`}
              style={{
                transform: `translateY(${translateY}px) translateX(${translateX}px)`,
                zIndex,
                opacity
              }}
              onClick={() => handleCardClick(account.id)}
            >
              <Card className={`${colors.bg} ${colors.border} border-2 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300`}>
                <CardContent className="p-4 text-white">
                  {/* Compact Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getAccountIcon(account.tipe)}
                      <div>
                        <h4 className="font-bold text-sm">{account.nama}</h4>
                        <p className="text-xs opacity-80">**{account.kode.slice(-4)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {isSelected && (
                        <Badge className="bg-green-500 text-white text-xs px-1.5 py-0.5">
                          <Check className="h-2 w-2 mr-1" />
                          Active
                        </Badge>
                      )}
                      
                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-white hover:bg-white/20"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {!account.is_default && onSetDefaultAccount && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetDefaultAccount(account.id); }}>
                              {/* Star icon inline to avoid import churn */}
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 mr-2"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.462 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.563 0 00-.182-.557L2.52 10.385a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L10.96 3.5z"/></svg>
                              Jadikan Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => handleEditAccount(account, e)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Edit Akun
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleViewTransactions(account.id, e)}>
                            <History className="h-3 w-3 mr-2" />
                            Lihat Riwayat
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteAccount(account, e)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Hapus Akun
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Compact Balance Display */}
                  <div className="text-center">
                    <div className="text-lg font-bold mb-1">
                      {formatCurrency(account.saldo_saat_ini)}
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-2 py-0.5">
                      {account.tipe}
                    </Badge>
                  </div>

                  {/* Compact Account Details */}
                  {account.nomor_rekening && (
                    <div className="mt-3 pt-2 border-t border-white/20">
                      <div className="text-xs opacity-80">
                        <div className="flex justify-between">
                          <span>No. Rek:</span>
                          <span className="font-medium">{account.nomor_rekening}</span>
                        </div>
                        {account.nama_bank && (
                          <div className="flex justify-between mt-1">
                            <span>Bank:</span>
                            <span className="font-medium">{account.nama_bank}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default StackedAccountCards;
