import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AkademikAgenda } from '@/services/akademikAgenda.service';

export interface AgendaTableRow {
  agenda: AkademikAgenda;
  pertemuanSelesai: number;
  pertemuanTotal: number;
  presensiPercent: number;
  nilaiStatus: 'draft' | 'published' | 'none';
  raporGenerated: boolean;
}

interface AgendaTableProps {
  data: AgendaTableRow[];
  loading?: boolean;
  pageSize?: number;
  semesterLocked?: boolean;
}

export const AgendaTable: React.FC<AgendaTableProps> = ({
  data,
  loading = false,
  pageSize = 20,
  semesterLocked = false,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);

  // Filter data berdasarkan search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((row) => {
      const agenda = row.agenda;
      return (
        agenda.nama_agenda?.toLowerCase().includes(query) ||
        agenda.mapel_nama?.toLowerCase().includes(query) ||
        agenda.kelas?.nama_kelas?.toLowerCase().includes(query) ||
        agenda.pengajar_nama?.toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getNilaiBadge = (status: 'draft' | 'published' | 'none') => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="text-xs">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary" className="text-xs">Draft</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Belum ada</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Daftar Agenda</CardTitle>
          <CardDescription className="text-xs">Ringkasan agenda per kelas dan mapel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span className="text-sm">Memuat...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Daftar Agenda</CardTitle>
            <CardDescription className="text-xs">
              {filteredData.length} agenda ditemukan
            </CardDescription>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari agenda, mapel, kelas, pengajar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {paginatedData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              {searchQuery ? 'Tidak ada agenda yang cocok dengan pencarian' : 'Tidak ada agenda'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="text-xs font-medium text-gray-700 sticky left-0 bg-white z-10 min-w-[150px]">
                      Kelas
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 min-w-[150px]">
                      Mapel
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 min-w-[150px]">
                      Pengajar
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-center min-w-[100px]">
                      Pertemuan
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-center min-w-[100px]">
                      Presensi%
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-center min-w-[100px]">
                      Nilai
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-center min-w-[100px]">
                      Rapor
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-right min-w-[100px]">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row) => {
                    const agenda = row.agenda;
                    return (
                      <TableRow key={agenda.id} className="border-gray-100">
                        <TableCell className="sticky left-0 bg-white z-10">
                          <div className="font-medium text-sm text-gray-900">
                            {agenda.kelas?.nama_kelas || '-'}
                          </div>
                          {agenda.kelas?.program && (
                            <div className="text-xs text-gray-500">{agenda.kelas.program}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">
                            {agenda.mapel_nama || agenda.nama_agenda || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700">
                            {agenda.pengajar_nama || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm text-gray-700">
                            {row.pertemuanSelesai} / {row.pertemuanTotal}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              row.presensiPercent >= 75
                                ? 'default'
                                : row.presensiPercent >= 60
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="text-xs"
                          >
                            {row.presensiPercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getNilaiBadge(row.nilaiStatus)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.raporGenerated ? (
                            <Badge variant="default" className="text-xs">Ada</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Belum</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/akademik/kelas?agendaId=${agenda.id}`)}
                            disabled={semesterLocked}
                            className="h-7 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Lihat
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                  Halaman {currentPage} dari {totalPages} ({filteredData.length} agenda)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

