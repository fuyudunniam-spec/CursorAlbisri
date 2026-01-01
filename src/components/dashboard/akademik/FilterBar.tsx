import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, X } from 'lucide-react';
import { Semester } from '@/services/akademikSemester.service';

interface FilterBarProps {
  semester: Semester | null;
  semesters: Semester[];
  onSemesterChange: (semesterId: string) => void;
  program: string;
  programs: string[];
  onProgramChange: (program: string) => void;
  onReset: () => void;
  loading?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  semester,
  semesters,
  onSemesterChange,
  program,
  programs,
  onProgramChange,
  onReset,
  loading = false,
}) => {
  const isLocked = semester?.is_locked ?? false;
  const activeFilters: string[] = [];
  if (semester) activeFilters.push(`Semester: ${semester.nama}`);
  if (program !== 'all') activeFilters.push(`Program: ${program}`);

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4">
          {/* Main Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Semester Selector (Primary) */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Semester/Term
              </label>
              <Select
                value={semester?.id || ''}
                onValueChange={onSemesterChange}
                disabled={loading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nama} • {s.tahun_ajaran?.nama || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Program Selector (Secondary, Optional) */}
            <div className="min-w-[150px]">
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Program
              </label>
              <Select value={program} onValueChange={onProgramChange} disabled={loading}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Semua Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Program</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={loading}
                className="h-9"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>

            {/* Status Badge */}
            {semester && (
              <div className="flex items-end">
                <Badge
                  variant={isLocked ? 'destructive' : 'default'}
                  className="h-9 px-3 flex items-center"
                >
                  {isLocked ? 'LOCKED' : 'ACTIVE'}
                </Badge>
              </div>
            )}
          </div>

          {/* Active Filters Chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Filter aktif:</span>
              {activeFilters.map((filter, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {filter}
                </Badge>
              ))}
            </div>
          )}

          {/* Lock Warning */}
          {isLocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="text-xs text-amber-800">
                <strong>Semester terkunci:</strong> Jurnal, presensi, dan nilai tidak dapat diubah.
                Silakan unlock semester terlebih dahulu jika perlu koreksi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

