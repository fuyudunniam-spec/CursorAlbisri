import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileText, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportFormatter, PeriodFilter } from '../../utils/export/reportFormatter';

interface DetailedReportsProps {
  onExportPDF?: (reportType: string, period?: PeriodFilter) => void;
  onExportExcel?: (reportType: string, period?: PeriodFilter) => void;
  onExportAll?: (format: 'pdf' | 'excel', period?: PeriodFilter) => void;
}

const DetailedReports: React.FC<DetailedReportsProps> = ({
  onExportPDF,
  onExportExcel,
  onExportAll
}) => {
  // Period filter state
  const [selectedPeriod, setSelectedPeriod] = useState<string>('bulan-ini');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const getCurrentPeriod = (): PeriodFilter => {
    const presets = ReportFormatter.getPeriodPresets();
    
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    
    const presetMap: { [key: string]: number } = {
      'bulan-ini': 0,
      '3-bulan': 1,
      '6-bulan': 2,
      '1-tahun': 3,
      'tahun-ini': 4
    };
    
    const presetIndex = presetMap[selectedPeriod] || 0;
    const preset = presets[presetIndex];
    
    return { start: preset.start, end: preset.end };
  };

  const handleExportAll = (format: 'pdf' | 'excel') => {
    const period = getCurrentPeriod();
    onExportAll?.(format, period);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Laporan Keuangan
          </CardTitle>
          
          <div className="flex items-center gap-4">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                  <SelectItem value="3-bulan">3 Bulan</SelectItem>
                  <SelectItem value="6-bulan">6 Bulan</SelectItem>
                  <SelectItem value="1-tahun">1 Tahun</SelectItem>
                  <SelectItem value="tahun-ini">Tahun Ini</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedPeriod === 'custom' && (
                <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
                  <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customStartDate && customEndDate 
                        ? `${customStartDate.toLocaleDateString('id-ID')} - ${customEndDate.toLocaleDateString('id-ID')}`
                        : 'Pilih Periode'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Tanggal Mulai:</label>
                          <Calendar
                            mode="single"
                            selected={customStartDate}
                            onSelect={setCustomStartDate}
                            className="rounded-md border"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tanggal Akhir:</label>
                          <Calendar
                            mode="single"
                            selected={customEndDate}
                            onSelect={setCustomEndDate}
                            className="rounded-md border"
                          />
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => setShowCustomDatePicker(false)}
                          disabled={!customStartDate || !customEndDate}
                        >
                          Terapkan
            </Button>
          </div>
        </div>
                  </PopoverContent>
                </Popover>
              )}
                        </div>
            
            {/* Export All Buttons */}
            <div className="flex space-x-2">
                          <Button
                variant="outline" 
                            size="sm"
                onClick={() => handleExportAll('pdf')}
                          >
                <Download className="h-4 w-4 mr-2" />
                Export All PDF
                          </Button>
                          <Button
                variant="outline" 
                            size="sm"
                onClick={() => handleExportAll('excel')}
                          >
                <Download className="h-4 w-4 mr-2" />
                Export All Excel
                          </Button>
                        </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">Laporan Keuangan Siap Diekspor</h3>
              <p className="text-sm">
                Gunakan tombol Export di atas untuk mendapatkan laporan lengkap dalam format PDF atau Excel.
                Laporan mencakup Cash Flow, Per Kategori, Per Santri, dan Audit Trail.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Fitur Export All:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Semua laporan dalam satu file</li>
                    <li>Data real-time dari database</li>
                    <li>Format profesional siap cetak</li>
                    <li>Filter periode yang fleksibel</li>
                  </ul>
                </div>
              </div>
            </div>
                      </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedReports;
