import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Shield,
  AlertCircle,
  FileText,
  DollarSign,
  Users,
  BookOpen,
  HandCoins
} from "lucide-react";
import SantriDataValidator, { ValidationResult } from './SantriDataValidator';

interface SantriDataValidationPanelProps {
  santriId: string;
  santriName: string;
  onRefresh?: () => void;
}

const SantriDataValidationPanel: React.FC<SantriDataValidationPanelProps> = ({
  santriId,
  santriName,
  onRefresh
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);

  const validateData = async () => {
    setLoading(true);
    try {
      const result = await SantriDataValidator.validateSantriData(santriId);
      setValidationResult(result);
      setLastValidated(new Date());
    } catch (error) {
      console.error('Error validating data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateData();
  }, [santriId]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'core':
        return <Shield className="w-4 h-4" />;
      case 'academic':
        return <BookOpen className="w-4 h-4" />;
      case 'financial':
        return <DollarSign className="w-4 h-4" />;
      case 'documents':
        return <FileText className="w-4 h-4" />;
      case 'wali':
        return <Users className="w-4 h-4" />;
      case 'bantuan':
        return <HandCoins className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    if (score >= 50) return 'bg-orange-100';
    return 'bg-red-100';
  };

  if (!validationResult) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Validasi Data Santri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Memvalidasi data santri...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations = SantriDataValidator.getValidationRecommendations(validationResult);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Validasi Data Santri
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={validateData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Validasi Ulang
          </Button>
        </div>
        {lastValidated && (
          <p className="text-sm text-muted-foreground">
            Terakhir divalidasi: {lastValidated.toLocaleString('id-ID')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${getScoreBgColor(validationResult.summary.score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Skor Validasi</p>
                <p className={`text-2xl font-bold ${getScoreColor(validationResult.summary.score)}`}>
                  {validationResult.summary.score}%
                </p>
              </div>
              <Shield className={`w-8 h-8 ${getScoreColor(validationResult.summary.score)}`} />
            </div>
            <Progress 
              value={validationResult.summary.score} 
              className="mt-2"
            />
          </div>

          <div className="p-4 rounded-lg bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Berhasil</p>
                <p className="text-2xl font-bold text-green-800">
                  {validationResult.summary.passed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Gagal</p>
                <p className="text-2xl font-bold text-red-800">
                  {validationResult.summary.failed}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-yellow-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Warning</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {validationResult.summary.warnings}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <Alert className={validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-center gap-2">
            {validationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <AlertDescription className="font-medium">
              {validationResult.isValid 
                ? 'Data santri valid dan siap digunakan' 
                : 'Terdapat masalah pada data santri yang perlu diperbaiki'
              }
            </AlertDescription>
          </div>
        </Alert>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Rekomendasi:</h4>
            {recommendations.map((rec, index) => (
              <Alert key={index} className="border-blue-200 bg-blue-50">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">{rec}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Errors */}
        {validationResult.errors.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Error yang Ditemukan:</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {validationResult.errors.map((error, index) => (
                <div key={index} className="p-3 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(error.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getModuleIcon(error.module)}
                        <Badge className={getSeverityBadgeColor(error.severity)}>
                          {error.severity}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-red-800">{error.message}</p>
                      <p className="text-xs text-red-600 mt-1">
                        Modul: {error.module} • Field: {error.field}
                      </p>
                      {error.suggestion && (
                        <p className="text-xs text-red-700 mt-1 italic">
                          Saran: {error.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {validationResult.warnings.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Warning:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validationResult.warnings.map((warning, index) => (
                <div key={index} className="p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getModuleIcon(warning.module)}
                        <span className="text-xs font-medium text-yellow-800">Warning</span>
                      </div>
                      <p className="text-sm font-medium text-yellow-800">{warning.message}</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Modul: {warning.module} • Field: {warning.field}
                      </p>
                      {warning.suggestion && (
                        <p className="text-xs text-yellow-700 mt-1 italic">
                          Saran: {warning.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Ringkasan Validasi:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Pengecekan:</p>
              <p className="font-medium">{validationResult.summary.total_checks}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Berhasil:</p>
              <p className="font-medium text-green-600">{validationResult.summary.passed}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Gagal:</p>
              <p className="font-medium text-red-600">{validationResult.summary.failed}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Warning:</p>
              <p className="font-medium text-yellow-600">{validationResult.summary.warnings}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SantriDataValidationPanel;

