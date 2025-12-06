import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CalendarRange, Users, Activity } from 'lucide-react';

interface AkademikTotalDisplayProps {
  totalKelas: number;
  totalSantri: number;
  rataKehadiran: number;
  monthLabel?: string;
  onNavigateToPresensi?: () => void;
  onNavigateToKelas?: () => void;
}

const AkademikTotalDisplay: React.FC<AkademikTotalDisplayProps> = ({
  totalKelas,
  totalSantri,
  rataKehadiran,
  monthLabel,
  onNavigateToPresensi,
  onNavigateToKelas
}) => {
  return (
    <div className="space-y-4">
      {/* Clean Total Display Card */}
      <Card className="border border-gray-200 rounded-xl shadow-sm bg-white">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ringkasan Akademik</h2>
            {monthLabel && (
              <span className="text-xs text-gray-500">
                {monthLabel}
              </span>
            )}
          </div>

          {/* Main Display */}
          <div className="mb-5">
            <div className="text-3xl font-semibold text-gray-900 mb-1.5 tracking-tight">
              {rataKehadiran.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">
              Rata-rata kehadiran dari {totalSantri} santri di {totalKelas} kelas
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={onNavigateToPresensi}
            >
              <CalendarRange className="h-3.5 w-3.5 mr-1.5" />
              Presensi
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs border-gray-200 hover:bg-gray-50 text-gray-700"
              onClick={onNavigateToKelas}
            >
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Master Kelas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="text-xl font-semibold text-gray-900 mb-0.5">
            {totalKelas}
          </div>
          <div className="text-xs text-gray-500">
            Total Kelas
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="text-xl font-semibold text-gray-900 mb-0.5">
            {totalSantri}
          </div>
          <div className="text-xs text-gray-500">
            Total Santri
          </div>
        </div>
      </div>
    </div>
  );
};

export default AkademikTotalDisplay;





