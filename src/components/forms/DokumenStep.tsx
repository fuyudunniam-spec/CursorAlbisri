import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DokumenData } from '@/types/santri.types';

interface DokumenStepProps {
  dokumenData: DokumenData[];
  uploadingFiles: { [key: string]: boolean };
  onFileSelect: (index: number, file: File) => void;
  onFileRemove: (index: number) => void;
}

const DokumenStep: React.FC<DokumenStepProps> = ({
  dokumenData,
  uploadingFiles,
  onFileSelect,
  onFileRemove
}) => {
  const isUploaded = (d: DokumenData) => Boolean(d.file || d.uploaded || d.nama_file);
  const requiredDocs = dokumenData.filter(d => d.required);
  const uploadedRequiredDocs = dokumenData.filter(d => d.required && isUploaded(d));
  const uploadedTotal = dokumenData.filter(isUploaded).length;

  return (
    <Card className="rounded-xl shadow-sm border border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Dokumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary (neutral) */}
        <div className="text-xs text-slate-600 border border-slate-200 rounded-md p-3 bg-white">
          <div className="flex items-center justify-between">
            <span>Wajib: {uploadedRequiredDocs.length}/{requiredDocs.length}</span>
            <span>Total: {uploadedTotal} file</span>
          </div>
          <p className="mt-1">Format: PDF, JPG, PNG, DOC • Max 10MB</p>
        </div>

        {/* Document List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dokumenData.map((dokumen, index) => (
            <Card 
              key={index}
              className={`border border-slate-200 bg-white hover:bg-slate-50/60 transition-colors`}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{dokumen.label || dokumen.jenis_dokumen}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{dokumen.required ? 'Wajib' : 'Opsional'}</div>
                    </div>
                  </div>

                  {/* File Info */}
                  {isUploaded(dokumen) && (
                    <div className="text-xs text-slate-600 border border-slate-200 p-2 rounded bg-white">
                      <p className="truncate">{dokumen.file?.name ?? dokumen.nama_file}</p>
                      {dokumen.file && (<p className="mt-1">{(dokumen.file.size / 1024).toFixed(1)} KB</p>)}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id={`file-${index}`}
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onFileSelect(index, file);
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`file-${index}`)?.click()}
                      disabled={uploadingFiles[dokumen.jenis_dokumen]}
                      className="flex-1"
                    >
                      {uploadingFiles[dokumen.jenis_dokumen] ? 'Mengunggah...' : isUploaded(dokumen) ? 'Ganti File' : 'Pilih File'}
                    </Button>
                    
                    {dokumen.file && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileRemove(index)}
                        disabled={uploadingFiles[dokumen.jenis_dokumen]}
                      >Hapus</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Validation Message (subtle) */}
        {requiredDocs.length > 0 && uploadedRequiredDocs.length < requiredDocs.length && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            Masih ada {requiredDocs.length - uploadedRequiredDocs.length} dokumen wajib yang belum diunggah.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DokumenStep;

