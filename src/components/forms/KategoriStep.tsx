import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Heart, User, GraduationCap, Home, Users } from "lucide-react";
import { KategoriSantri } from '@/types/santri.types';

interface KategoriStepProps {
  selectedKategori: KategoriSantri | '';
  selectedSubKategori: 'Mukim' | 'Non-Mukim' | '';
  onKategoriSelect: (kategori: KategoriSantri) => void;
  onSubKategoriSelect: (subKategori: 'Mukim' | 'Non-Mukim') => void;
}

const KategoriStep: React.FC<KategoriStepProps> = ({
  selectedKategori,
  selectedSubKategori,
  onKategoriSelect,
  onSubKategoriSelect
}) => {
  return (
    <Card className="rounded-xl shadow-sm border border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Pilih Kategori Santri</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Kategori Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Binaan */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedKategori?.includes('Binaan') 
                ? 'ring-2 ring-green-500 bg-green-50' 
                : 'hover:border-green-300'
            }`}
            onClick={() => onKategoriSelect('Binaan Mukim')}
          >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div>
                <h3 className="font-semibold text-lg">Binaan</h3>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Reguler */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedKategori === 'Reguler' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:border-blue-300'
            }`}
            onClick={() => onKategoriSelect('Reguler')}
          >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div>
                <h3 className="font-semibold text-lg">Reguler</h3>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Mahasiswa */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedKategori === 'Mahasiswa' 
                ? 'ring-2 ring-purple-500 bg-purple-50' 
                : 'hover:border-purple-300'
            }`}
            onClick={() => onKategoriSelect('Mahasiswa')}
          >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div>
                <h3 className="font-semibold text-lg">Mahasiswa</h3>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>

        {/* Sub-Kategori for Binaan */}
        {selectedKategori?.includes('Binaan') && (
          <div className="pt-4 border-t">
            <Label className="text-base font-semibold mb-3 block">Pilih Jenis Binaan:</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedSubKategori === 'Mukim' 
                    ? 'ring-2 ring-emerald-500 bg-emerald-50' 
                    : 'hover:border-emerald-300'
                }`}
                onClick={() => onSubKategoriSelect('Mukim')}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-base">Mukim</h4>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedSubKategori === 'Non-Mukim' 
                    ? 'ring-2 ring-teal-500 bg-teal-50' 
                    : 'hover:border-teal-300'
                }`}
                onClick={() => onSubKategoriSelect('Non-Mukim')}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-base">Non-Mukim</h4>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KategoriStep;

