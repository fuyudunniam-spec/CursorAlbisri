import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, User, Loader2 } from 'lucide-react';
import { SantriService } from '@/services/santri.service';
import { cn } from '@/lib/utils';

interface SantriSearchResult {
  id: string;
  nama_lengkap: string;
  id_santri?: string;
  kategori?: string;
}

interface SantriSearchProps {
  value?: string; // santri_id
  onSelect: (santri: SantriSearchResult | null) => void;
  placeholder?: string;
  className?: string;
}

const SantriSearch: React.FC<SantriSearchProps> = ({
  value,
  onSelect,
  placeholder = 'Cari santri...',
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SantriSearchResult[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<SantriSearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
        const data = await SantriService.search(searchTerm);
        setResults(data.map(s => ({
          id: s.id,
          nama_lengkap: s.nama_lengkap || '',
          id_santri: s.id_santri,
          kategori: s.kategori
        })));
        setIsOpen(data.length > 0);
      } catch (error) {
        console.error('Error searching santri:', error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [searchTerm]);

  const handleSelect = (santri: SantriSearchResult) => {
    setSelectedSantri(santri);
    setSearchTerm(santri.nama_lengkap);
    setIsOpen(false);
    onSelect(santri);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedSantri(null);
    setResults([]);
    setIsOpen(false);
    onSelect(null);
  };

  const getKategoriBadgeColor = (kategori?: string) => {
    if (!kategori) return 'bg-gray-50 text-gray-700 border-gray-200';
    const kategoriLower = kategori.toLowerCase();
    if (kategoriLower.includes('binaan')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (kategoriLower.includes('mahasantri')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (kategoriLower.includes('tpq')) return 'bg-green-50 text-green-700 border-green-200';
    if (kategoriLower.includes('madin')) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
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
            setSelectedSantri(null);
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
            <div className="p-2">
              {results.map((santri) => (
                <button
                  key={santri.id}
                  type="button"
                  onClick={() => handleSelect(santri)}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {santri.nama_lengkap}
                        </div>
                        {santri.id_santri && (
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {santri.id_santri}
                          </div>
                        )}
                      </div>
                    </div>
                    {santri.kategori && (
                      <Badge 
                        variant="outline" 
                        className={cn('shrink-0 text-xs', getKategoriBadgeColor(santri.kategori))}
                      >
                        {santri.kategori.split(' ')[0]}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">Santri tidak ditemukan</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Selected Indicator */}
      {selectedSantri && !isOpen && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <User className="h-3 w-3 mr-1" />
            {selectedSantri.nama_lengkap}
            {selectedSantri.id_santri && (
              <span className="ml-1 font-mono text-xs">({selectedSantri.id_santri})</span>
            )}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default SantriSearch;





