import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";
import { KondisiKesehatan } from '@/types/santri.types';

interface KesehatanStepProps {
  kondisiKesehatan: KondisiKesehatan;
  onChange: (data: Partial<KondisiKesehatan>) => void;
}

const KesehatanStep: React.FC<KesehatanStepProps> = ({
  kondisiKesehatan,
  onChange
}) => {
  console.log('🏥 KesehatanStep rendered with data:', kondisiKesehatan);
  return (
    <Card className="rounded-xl shadow-sm border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Kondisi Kesehatan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Health Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Golongan Darah *</Label>
            <Select 
              value={kondisiKesehatan.golongan_darah || ''}
              onValueChange={(value) => onChange({ golongan_darah: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih golongan darah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="AB">AB</SelectItem>
                <SelectItem value="O">O</SelectItem>
                <SelectItem value="Tidak Tahu">Tidak Tahu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Tinggi Badan (cm)</Label>
            <Input 
              type="number"
              step="0.1"
              value={kondisiKesehatan.tinggi_badan || ''}
              onChange={(e) => onChange({ tinggi_badan: parseFloat(e.target.value) || undefined })}
              placeholder="150"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Berat Badan (kg)</Label>
            <Input 
              type="number"
              step="0.1"
              value={kondisiKesehatan.berat_badan || ''}
              onChange={(e) => onChange({ berat_badan: parseFloat(e.target.value) || undefined })}
              placeholder="45"
            />
          </div>
        </div>

        {/* Medical History */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Riwayat Penyakit</Label>
          <Textarea 
            value={kondisiKesehatan.riwayat_penyakit || ''}
            onChange={(e) => onChange({ riwayat_penyakit: e.target.value })}
            placeholder="Penyakit yang pernah atau sedang diderita (kosongkan jika tidak ada)"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Alergi</Label>
          <Textarea 
            value={kondisiKesehatan.alergi || ''}
            onChange={(e) => onChange({ alergi: e.target.value })}
            placeholder="Alergi makanan, obat, atau lainnya (kosongkan jika tidak ada)"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Kondisi Khusus</Label>
          <Textarea 
            value={kondisiKesehatan.kondisi_khusus || ''}
            onChange={(e) => onChange({ kondisi_khusus: e.target.value })}
            placeholder="Kondisi kesehatan khusus yang perlu diperhatikan (kosongkan jika tidak ada)"
            rows={2}
          />
        </div>

      </CardContent>
    </Card>
  );
};

export default KesehatanStep;

