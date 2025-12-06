import { Card, CardContent } from '@/components/ui/card';
import { PackageCheck } from 'lucide-react';

export default function PenerimaanBarangList() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <PackageCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Fitur penerimaan barang akan segera hadir</p>
        <p className="text-sm mt-2">
          Untuk tracking kondisi barang yang diterima dari supplier
        </p>
      </CardContent>
    </Card>
  );
}
