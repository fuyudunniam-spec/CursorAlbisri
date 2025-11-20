import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign,
  CreditCard,
  TrendingUp,
  Users,
  Calendar,
  Phone,
  MapPin,
  GraduationCap,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Upload,
  Eye,
  Edit,
  Plus,
  Search,
  Filter,
  Settings,
  HandCoins,
  FileText
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeAvatarUrl } from '@/utils/url.utils';
import TemplateTagihanManager from '@/components/TemplateTagihanManager';
import LaporanKeuanganManager from '@/components/LaporanKeuanganManager';
import ProgramSantriBiayaManager from '@/components/ProgramSantriBiayaManager';
// New finance components
import MasterTarifSPP from '@/components/MasterTarifSPP';
import MassBillingGenerator from '@/components/MassBillingGenerator';
import CollectivePaymentTool from '@/components/CollectivePaymentTool';
import FinanceReports from '@/components/FinanceReports';
import SantriBulkUpdate from '@/components/SantriBulkUpdate';

interface SantriData {
  id: string;
  nisn?: string;
  nama_lengkap: string;
  kategori: string;
  tipe_pembayaran: string;
  status_santri: string;
  no_whatsapp?: string;
  foto_profil?: string;
  created_at?: string;
}

// Removed TagihanData interface - consolidated into Pembayaran Santri


const Keuangan = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [isLoading, setIsLoading] = useState(true);

  // Removed loadTagihanData - consolidated into Pembayaran Santri


  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Removed filteredTagihan - consolidated into Pembayaran Santri


  // Generate initials
  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'lunas':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'belum_lunas':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'aktif':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'nonaktif':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Tagihan Card Component
  const TagihanCard = ({ tagihan }: { tagihan: TagihanData }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={getSafeAvatarUrl(tagihan.santri?.foto_profil)} />
            <AvatarFallback className="text-sm">
              {generateInitials(tagihan.santri?.nama_lengkap || '')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{tagihan.santri?.nama_lengkap}</h3>
            <p className="text-sm text-muted-foreground">NISN: {tagihan.santri?.nisn || 'Belum ada'}</p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getStatusBadgeColor(tagihan.status_pembayaran)}>
            {tagihan.status_pembayaran === 'lunas' ? '✅ Lunas' : '⏳ Belum Lunas'}
          </Badge>
          <Badge variant="outline">{tagihan.santri?.kategori}</Badge>
        </div>

        {/* Tagihan info */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Periode:</span>
            <span className="font-medium">{tagihan.bulan_tahun}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nominal:</span>
            <span className="font-bold text-lg">{formatCurrency(tagihan.nominal_tagihan)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jatuh Tempo:</span>
            <span className="font-medium">{formatDate(tagihan.tanggal_jatuh_tempo)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" variant="outline">
            <Eye className="w-4 h-4 mr-1" />
            Detail
          </Button>
          {tagihan.status_pembayaran === 'belum_lunas' && (
            <Button size="sm" className="flex-1">
              <CreditCard className="w-4 h-4 mr-1" />
              Bayar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );


  // Calculate stats - Tagihan module is disabled (use safe placeholders)
  const totalTagihan = 0;
  const totalLunas = 0;
  const totalBelumLunas = 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            SPP & Tagihan Pendidikan
          </h1>
          <p className="text-muted-foreground">
            Kelola tagihan SPP santri dan pembayaran pendidikan
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Info:</strong> Untuk bantuan santri, gunakan <strong>Modul Keuangan Umum</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards - disabled while Tagihan module is not active */}
      {false && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tagihan</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalTagihan)}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sudah Lunas</p>
                  <p className="text-2xl font-bold text-green-600">{totalLunas}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Belum Lunas</p>
                  <p className="text-2xl font-bold text-red-600">{totalBelumLunas}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="generate" className="flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Generate & Kolektif
      </TabsTrigger>
      <TabsTrigger value="update" className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        Update Santri
      </TabsTrigger>
      <TabsTrigger value="laporan" className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Laporan
      </TabsTrigger>
    </TabsList>

        {/* Removed tagihan tab - consolidated into Pembayaran Santri */}


        {/* Tab 2: Generate & Kolektif */}
        <TabsContent value="generate" className="space-y-6">
          <Tabs defaultValue="tarif" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tarif" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Master Tarif
              </TabsTrigger>
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generate Tagihan
              </TabsTrigger>
              <TabsTrigger value="kolektif" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Pembayaran Kolektif
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tarif" className="space-y-6">
              <MasterTarifSPP />
            </TabsContent>

            <TabsContent value="generate" className="space-y-6">
              <MassBillingGenerator />
            </TabsContent>

            <TabsContent value="kolektif" className="space-y-6">
              <CollectivePaymentTool />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 3: Update Santri */}
        <TabsContent value="update" className="space-y-6">
          <SantriBulkUpdate />
        </TabsContent>


        {/* Tab 5: Laporan Keuangan */}
        <TabsContent value="laporan" className="space-y-6">
          <FinanceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Keuangan;
