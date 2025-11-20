/**
 * SantriProfileFull.tsx
 * 
 * HANYA DIGUNAKAN UNTUK MODE "ADD" (Tambah Santri Baru)
 * 
 * Untuk view/edit profil santri, gunakan SantriProfileMinimal.tsx
 * yang sudah terintegrasi dengan modul tabungan dan fitur lainnya.
 * 
 * Route: /santri/add (mode="add")
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

// Import components
import SantriProfileSidebar from "@/components/SantriProfileSidebar";
import SantriProfileContent from "@/components/SantriProfileContent";

interface SantriProfileFullProps {
  mode?: 'view' | 'edit' | 'add';
}

const SantriProfileFull: React.FC<SantriProfileFullProps> = ({ mode: propMode }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Determine mode from URL or props
  const urlMode = searchParams.get('mode') as 'view' | 'edit' | 'add' || 'view';
  const currentMode = propMode || urlMode;
  
  const [mode, setMode] = useState<'view' | 'edit' | 'add'>(currentMode);
  const [santri, setSantri] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  // Load santri data
  const loadSantriData = async () => {
    if (mode === 'add') {
      setLoading(false);
      return;
    }

    if (!id) {
      setError('Santri ID tidak ditemukan');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSantri(data);
    } catch (err: any) {
      console.error('Error loading santri data:', err);
      setError('Gagal memuat data santri: ' + err.message);
      toast.error('Gagal memuat data santri');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSantriData();
  }, [id, mode]);

  // Handle mode changes
  const handleEditMode = () => {
    setMode('edit');
    // Update URL - tetap di route add untuk mode edit
    navigate(`/santri/add?mode=edit&id=${id}`, { replace: true });
  };

  const handleAddMode = () => {
    setMode('add');
    navigate('/santri/add?mode=add', { replace: true });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Save logic will be handled by individual form components
      toast.success('Data santri berhasil disimpan');
      setMode('view');
      navigate(`/santri/profile?santriId=${id}&santriName=${encodeURIComponent(santri?.nama_lengkap || 'Santri')}`, { replace: true });
      loadSantriData(); // Reload data
    } catch (error: any) {
      console.error('Error saving santri:', error);
      toast.error('Gagal menyimpan data santri: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'add') {
      navigate('/santri');
    } else {
      setMode('view');
      navigate(`/santri/profile?santriId=${id}&santriName=${encodeURIComponent(santri?.nama_lengkap || 'Santri')}`, { replace: true });
    }
  };

  const handleBack = () => {
    navigate('/santri');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat data santri...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Santri
          </Button>
        </div>
      </div>
    );
  }

  // Get page title based on mode
  const getPageTitle = () => {
    switch (mode) {
      case 'add':
        return 'Tambah Santri Baru';
      case 'edit':
        return `Edit Profil: ${santri?.nama_lengkap || 'Santri'}`;
      case 'view':
      default:
        return `Profil Santri: ${santri?.nama_lengkap || 'Santri'}`;
    }
  };

  const isBinaan = santri?.kategori?.includes('Binaan') || false;
  const isMukim = santri?.kategori === 'Binaan Mukim';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={cn(
                    mode === 'view' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    mode === 'edit' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-green-100 text-green-800 border-green-200'
                  )}
                >
                  {mode === 'view' ? 'View Mode' : mode === 'edit' ? 'Edit Mode' : 'Add Mode'}
                </Badge>
                
                {santri && (
                  <>
                    <Badge variant="outline">{santri.kategori}</Badge>
                    {isBinaan && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Penerima Bantuan Yayasan
                      </Badge>
                    )}
                    {isMukim && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        Mukim
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleEditMode}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profil
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // TODO: Implement print PDF
                    toast.info('Fitur print PDF akan segera tersedia');
                  }}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print PDF
                </Button>
              </>
            )}
            
            {mode === 'edit' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Batal
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </>
            )}
            
            {mode === 'add' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Batal
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Menyimpan...' : 'Simpan Santri'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <SantriProfileSidebar
          santri={santri}
          activeTab={activeTab}
          mode={mode}
          onTabChange={setActiveTab}
          onEditMode={handleEditMode}
          onAddMode={handleAddMode}
        />

        {/* Content Area */}
        <SantriProfileContent
          santri={santri}
          activeTab={activeTab}
          mode={mode}
          santriId={id}
          onDataChange={(data) => setSantri(data)}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>

      {/* Status Indicator */}
      {mode !== 'view' && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              {mode === 'edit' ? 'Sedang mengedit profil' : 'Sedang menambah santri baru'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SantriProfileFull;
