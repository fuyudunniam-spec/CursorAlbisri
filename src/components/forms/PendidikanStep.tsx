import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { RiwayatPendidikan } from '@/types/santri.types';

interface PendidikanStepProps {
  riwayatPendidikan: RiwayatPendidikan[];
  onChange: (data: RiwayatPendidikan[]) => void;
}

const PendidikanStep: React.FC<PendidikanStepProps> = ({
  riwayatPendidikan,
  onChange
}) => {
  const updateRiwayat = (index: number, field: keyof RiwayatPendidikan, value: any) => {
    const updated = [...riwayatPendidikan];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addRiwayat = () => {
    onChange([
      ...riwayatPendidikan,
      { jenjang: '', nama_sekolah: '', tahun_masuk: '', tahun_lulus: '' }
    ]);
  };

  const removeRiwayat = (index: number) => {
    if (riwayatPendidikan.length === 1) {
      toast.error('Minimal 1 riwayat pendidikan harus diisi');
      return;
    }
    onChange(riwayatPendidikan.filter((_, i) => i !== index));
  };

  return (
    <Card className="rounded-xl shadow-sm border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          Riwayat Pendidikan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {riwayatPendidikan.map((riwayat, index) => (
          <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700">
                Riwayat Pendidikan {index + 1}
              </h4>
              {riwayatPendidikan.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRiwayat(index)}
                  className="h-7 text-xs text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Hapus
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Jenjang *</Label>
                <Input 
                  value={riwayat.jenjang || ''}
                  onChange={(e) => updateRiwayat(index, 'jenjang', e.target.value)}
                  placeholder="SD, SMP, SMA, TK"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Nama Sekolah *</Label>
                <Input 
                  value={riwayat.nama_sekolah || ''}
                  onChange={(e) => updateRiwayat(index, 'nama_sekolah', e.target.value)}
                  placeholder="SDN 01, SMPN 02, dll"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Tahun Masuk</Label>
                <Input 
                  value={riwayat.tahun_masuk || ''}
                  onChange={(e) => updateRiwayat(index, 'tahun_masuk', e.target.value)}
                  placeholder="2018"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Tahun Lulus</Label>
                <Input 
                  value={riwayat.tahun_lulus || ''}
                  onChange={(e) => updateRiwayat(index, 'tahun_lulus', e.target.value)}
                  placeholder="2024"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">Nilai Rata-rata</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={riwayat.nilai_rata_rata || ''}
                  onChange={(e) => updateRiwayat(index, 'nilai_rata_rata', parseFloat(e.target.value) || undefined)}
                  placeholder="85.5"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Prestasi (Opsional)</Label>
              <Textarea 
                value={riwayat.prestasi || ''}
                onChange={(e) => updateRiwayat(index, 'prestasi', e.target.value)}
                placeholder="Juara 1 Lomba Matematika, Ranking 5 besar, dll"
                rows={2}
              />
            </div>
          </div>
        ))}
        
        <Button 
          type="button"
          variant="outline"
          onClick={addRiwayat}
          className="w-full border-dashed border-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Riwayat Pendidikan
        </Button>
      </CardContent>
    </Card>
  );
};

export default PendidikanStep;

