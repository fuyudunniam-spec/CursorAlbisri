import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

interface TransactionFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedTipe: 'all' | 'Masuk' | 'Keluar' | 'Stocktake';
  onTipeChange: (value: 'all' | 'Masuk' | 'Keluar' | 'Stocktake') => void;
  selectedKeluarMode: 'all' | 'Penjualan' | 'Distribusi';
  onKeluarModeChange: (value: 'all' | 'Penjualan' | 'Distribusi') => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  selectedItem: string;
  onItemChange: (value: string) => void;
  selectedPenerima: string;
  onPenerimaChange: (value: string) => void;
}

const TransactionFilter: React.FC<TransactionFilterProps> = ({
  searchTerm,
  onSearchChange,
  selectedTipe,
  onTipeChange,
  selectedKeluarMode,
  onKeluarModeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedItem,
  onItemChange,
  selectedPenerima,
  onPenerimaChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter & Pencarian
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Cari Transaksi</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Nama barang, penerima..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tipe */}
          <div className="space-y-2">
            <Label htmlFor="tipe">Tipe Transaksi</Label>
            <Select value={selectedTipe} onValueChange={onTipeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="Masuk">Masuk</SelectItem>
                <SelectItem value="Keluar">Keluar</SelectItem>
                <SelectItem value="Stocktake">Stocktake</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Keluar Mode */}
          <div className="space-y-2">
            <Label htmlFor="keluar-mode">Mode Keluar</Label>
            <Select value={selectedKeluarMode} onValueChange={onKeluarModeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mode</SelectItem>
                <SelectItem value="Penjualan">Penjualan</SelectItem>
                <SelectItem value="Distribusi">Distribusi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label htmlFor="date-range">Periode</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                placeholder="Dari"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Sampai"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Item */}
          <div className="space-y-2">
            <Label htmlFor="item">Item Spesifik</Label>
            <Input
              id="item"
              placeholder="ID atau nama item"
              value={selectedItem}
              onChange={(e) => onItemChange(e.target.value)}
            />
          </div>

          {/* Penerima */}
          <div className="space-y-2">
            <Label htmlFor="penerima">Penerima</Label>
            <Input
              id="penerima"
              placeholder="Nama penerima"
              value={selectedPenerima}
              onChange={(e) => onPenerimaChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionFilter;
