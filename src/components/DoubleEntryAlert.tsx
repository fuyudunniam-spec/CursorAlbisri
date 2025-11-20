import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDuplicateKeuanganReport } from '@/services/keuangan.service';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function DoubleEntryAlert() {
  const { data: duplicates } = useQuery({
    queryKey: ['duplicate-keuangan'],
    queryFn: getDuplicateKeuanganReport,
    refetchInterval: 60000, // Check every minute
    retry: 1,
    staleTime: 30000
  });

  if (!duplicates || duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Duplicate Entries Detected</AlertTitle>
      <AlertDescription>
        Found {duplicates.length} potential duplicate entries in keuangan.
        <a href="/admin/keuangan-audit" className="underline ml-2 hover:text-red-800">
          Review now
        </a>
      </AlertDescription>
    </Alert>
  );
}

export default DoubleEntryAlert;
