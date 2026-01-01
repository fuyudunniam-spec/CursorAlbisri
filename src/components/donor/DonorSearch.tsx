import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Plus, User, Phone, Mail, Loader2 } from 'lucide-react';
import { DonorService, type DonorSearchResult, type JenisDonatur } from '@/services/donor.service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DonorSearchProps {
  value?: string; // donor_id
  onSelect: (donor: DonorSearchResult | null) => void;
  onAddNew?: () => void;
  placeholder?: string;
  className?: string;
  allowManual?: boolean; // Allow manual input if donor not found
}

const JENIS_DONATUR_LABELS: Record<JenisDonatur, string> = {
  individu: 'Individu',
  perusahaan: 'Perusahaan',
  yayasan: 'Yayasan',
  komunitas: 'Komunitas',
  lembaga: 'Lembaga'
};

const DonorSearch: React.FC<DonorSearchProps> = ({
  value,
  onSelect,
  onAddNew,
  placeholder = 'Cari donatur...',
  className,
  allowManual = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<DonorSearchResult[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<DonorSearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await DonorService.searchDonors(searchTerm, 10);
        setResults(data);
        setIsOpen(data.length > 0 || allowManual);
      } catch (error) {
        console.error('Error searching donors:', error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [searchTerm, allowManual]);

  const handleSelect = (donor: DonorSearchResult) => {
    setSelectedDonor(donor);
    setSearchTerm(donor.nama_lengkap);
    setIsOpen(false);
    onSelect(donor);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedDonor(null);
    setResults([]);
    setIsOpen(false);
    onSelect(null);
  };

  const handleManualInput = () => {
    setManualMode(true);
    setIsOpen(false);
    onSelect(null);
  };

  const handleAddNewClick = () => {
    if (onAddNew) {
      onAddNew();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedDonor(null);
            if (e.target.value.length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (searchTerm.length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="pl-9 pr-9"
          disabled={manualMode}
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Mencari...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="p-2">
                {results.map((donor) => (
                  <button
                    key={donor.id}
                    type="button"
                    onClick={() => handleSelect(donor)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-900 truncate">
                            {donor.nama_lengkap}
                          </span>
                          {donor.nama_panggilan && (
                            <span className="text-sm text-gray-500">
                              ({donor.nama_panggilan})
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                          {donor.nomor_telepon && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="font-mono">{donor.nomor_telepon}</span>
                            </div>
                          )}
                          {donor.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{donor.email}</span>
                            </div>
                          )}
                        </div>
                        {donor.total_donasi !== undefined && donor.total_donasi > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {donor.total_donasi} donasi • {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(donor.total_nominal_donasi || 0)}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {JENIS_DONATUR_LABELS[donor.jenis_donatur] || donor.jenis_donatur}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
              {allowManual && (
                <div className="border-t border-gray-200 p-2">
                  <button
                    type="button"
                    onClick={handleManualInput}
                    className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Input manual (donatur baru/sekali)
                  </button>
                </div>
              )}
              {onAddNew && (
                <div className="border-t border-gray-200 p-2">
                  <button
                    type="button"
                    onClick={handleAddNewClick}
                    className="w-full flex items-center gap-2 p-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Donatur Baru
                  </button>
                </div>
              )}
            </>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-3">Donatur tidak ditemukan</p>
              {allowManual && (
                <button
                  type="button"
                  onClick={handleManualInput}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Input manual
                </button>
              )}
              {onAddNew && (
                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="text-sm text-emerald-600 hover:text-emerald-700 ml-3"
                >
                  Tambah donatur baru
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Manual Mode Indicator */}
      {manualMode && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
          <span>Mode input manual aktif</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setManualMode(false);
              setSearchTerm('');
            }}
            className="h-6 text-xs"
          >
            Kembali ke pencarian
          </Button>
        </div>
      )}
    </div>
  );
};

export default DonorSearch;

