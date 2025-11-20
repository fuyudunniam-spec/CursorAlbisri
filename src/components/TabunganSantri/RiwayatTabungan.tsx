import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { TabunganSantriWithSantri, TabunganFilter } from '@/types/tabungan.types';
import { useToast } from '@/hooks/use-toast';

interface RiwayatTabunganProps {
  santriId: string;
  santriName: string;
  onClose: () => void;
}

export const RiwayatTabungan: React.FC<RiwayatTabunganProps> = ({
  santriId,
  santriName,
  onClose
}) => {
  const [riwayat, setRiwayat] = useState<TabunganSantriWithSantri[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabunganFilter>({
    santri_id: santriId,
    limit: 20,
    offset: 0
  });
  const { toast } = useToast();

  const loadRiwayat = async () => {
    try {
      setLoading(true);
      const data = await TabunganSantriService.getRiwayatTabungan(filter);
      setRiwayat(data);
    } catch (error: any) {
      console.error('Error loading riwayat:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat riwayat tabungan',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiwayat();
  }, [filter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getJenisBadgeVariant = (jenis: string) => {
    switch (jenis) {
      case 'Setoran':
        return 'default';
      case 'Penarikan':
        return 'destructive';
      case 'Reward Prestasi':
      case 'Reward Akademik':
      case 'Reward Non-Akademik':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleFilterChange = (key: keyof TabunganFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset offset when filter changes
    }));
  };

  const handleSearch = () => {
    loadRiwayat();
  };

  const handleRefresh = () => {
    loadRiwayat();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Riwayat Tabungan - {santriName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Cari</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Cari deskripsi atau catatan..."
                      value={filter.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="jenis">Jenis Transaksi</Label>
                  <Select
                    value={filter.jenis || 'all'}
                    onValueChange={(value) => handleFilterChange('jenis', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua jenis</SelectItem>
                      <SelectItem value="Setoran">Setoran</SelectItem>
                      <SelectItem value="Penarikan">Penarikan</SelectItem>
                      <SelectItem value="Reward Prestasi">Reward Prestasi</SelectItem>
                      <SelectItem value="Reward Akademik">Reward Akademik</SelectItem>
                      <SelectItem value="Reward Non-Akademik">Reward Non-Akademik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
                  <Input
                    id="tanggal_mulai"
                    type="date"
                    value={filter.tanggal_mulai || ''}
                    onChange={(e) => handleFilterChange('tanggal_mulai', e.target.value || undefined)}
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
                  <Input
                    id="tanggal_selesai"
                    type="date"
                    value={filter.tanggal_selesai || ''}
                    onChange={(e) => handleFilterChange('tanggal_selesai', e.target.value || undefined)}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleSearch} size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : riwayat.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada riwayat tabungan
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Saldo Sebelum</TableHead>
                    <TableHead>Saldo Sesudah</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Petugas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riwayat.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getJenisBadgeVariant(item.jenis)}>
                          {item.jenis}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {item.jenis === 'Penarikan' ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          )}
                          <span className={item.jenis === 'Penarikan' ? 'text-red-600' : 'text-green-600'}>
                            {item.jenis === 'Penarikan' ? '-' : '+'}
                            {formatCurrency(item.nominal)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(item.saldo_sebelum)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(item.saldo_sesudah)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-xs truncate" title={item.deskripsi}>
                          {item.deskripsi}
                        </div>
                        {item.catatan && (
                          <div className="text-xs text-muted-foreground mt-1 truncate" title={item.catatan}>
                            {item.catatan}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.petugas_nama || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan {riwayat.length} transaksi
            </div>
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
