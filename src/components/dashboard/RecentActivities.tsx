import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';

interface Transaction {
  id: string;
  tanggal: string;
  jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  deskripsi: string;
  jumlah: number;
  akun_kas_id: string;
  akun_kas_nama: string;
  status: string;
  created_at: string;
  sub_kategori?: string;
  penerima_pembayar?: string;
  rincian_items?: any[];
  alokasi_santri?: any[];
  display_category?: string;
  source_type?: string;
  display_description?: string;
}

interface RecentActivitiesProps {
  transactions: Transaction[];
  selectedAccountId?: string;
  selectedAccountName?: string;
  onClearFilter?: () => void;
  onViewDetail?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transaction: Transaction) => void;
  onViewAll?: () => void;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({
  transactions,
  selectedAccountId,
  selectedAccountName,
  onClearFilter,
  onViewDetail,
  onEditTransaction,
  onDeleteTransaction,
  onViewAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (jenis: string) => {
    return jenis === 'Pemasukan' ? 
      <ArrowUpRight className="h-4 w-4 text-green-600" /> : 
      <ArrowDownLeft className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Posted': { color: 'bg-green-100 text-green-800', label: 'Posted' },
      'Pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'Draft': { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'Cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Draft'];
    return <Badge className={config.color} variant="secondary">{config.label}</Badge>;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const s = (searchTerm || '').toLowerCase();
    const desc = ((transaction.deskripsi ?? '') as string).toString().toLowerCase();
    const kat = ((transaction.kategori ?? '') as string).toString().toLowerCase();
    const matchesSearch = desc.includes(s) || kat.includes(s);
    const matchesFilter = filterType === 'all' || transaction.jenis_transaksi === filterType;
    const matchesAccount = !selectedAccountId || transaction.akun_kas_id === selectedAccountId;
    return matchesSearch && matchesFilter && matchesAccount;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, selectedAccountId]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Get account name for filter badge
  const getFilteredAccountName = () => {
    if (!selectedAccountId) return null;
    const transaction = transactions.find(t => t.akun_kas_id === selectedAccountId);
    return transaction?.akun_kas_nama || 'Unknown Account';
  };

  return (
    <Card id="recent-activities" className="rounded-2xl shadow-md border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Riwayat transaksi terbaru
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectedAccountId && selectedAccountName && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                {selectedAccountName}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onViewAll}>
              View All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter */}
        <div className="flex space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter by Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filterType === 'all' ? 'Semua Jenis' : filterType}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                Semua Jenis
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Pemasukan')}>
                Pemasukan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('Pengeluaran')}>
                Pengeluaran
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Active Filter Badge */}
        {selectedAccountId && selectedAccountName && (
          <div className="mb-4 flex items-center space-x-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Filter: {selectedAccountName}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilter}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {/* Transactions Table */}
        <div className="space-y-2">
          {currentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada transaksi ditemukan
            </div>
          ) : (
            currentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`flex items-center space-x-4 p-4 rounded-2xl border hover:bg-gray-50 transition-all duration-200 ${
                  transaction.jenis_transaksi === 'Pemasukan' 
                    ? 'bg-green-50 border-green-100' 
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                />
                
                {/* Transaction Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {getTransactionIcon(transaction.jenis_transaksi)}
                    <span className="font-medium text-sm">
                      {formatDate(transaction.tanggal)}
                    </span>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{transaction.display_category || transaction.kategori}</span>
                    {transaction.source_type && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {transaction.source_type}
                      </Badge>
                    )}
                    {transaction.display_description && (
                      <div className="mt-1 text-xs">
                        {transaction.display_description}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Amount and Account */}
                <div className="text-right">
                  <div className={`font-semibold ${
                    transaction.jenis_transaksi === 'Pemasukan' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(transaction.jumlah)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {transaction.akun_kas_nama}
                  </div>
                </div>
                
                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetail?.(transaction)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Lihat Detail
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditTransaction?.(transaction)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDeleteTransaction?.(transaction)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>

        {/* Pagination Info */}
        {filteredTransactions.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
            </span>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                ← Sebelumnya
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Selanjutnya →
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivities;
