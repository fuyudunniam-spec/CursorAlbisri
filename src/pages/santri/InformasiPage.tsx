import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import PersonalStep from "@/components/forms/PersonalStep";
import WaliStep from "@/components/forms/WaliStep";
import { SantriData, WaliData } from "@/types/santri.types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileContext {
  santri: any;
  santriId: string;
}

const InformasiPage = () => {
  const { santri, santriId } = useOutletContext<ProfileContext>();
  const [isSaving, setIsSaving] = useState(false);
  const [formSantriData, setFormSantriData] = useState<Partial<SantriData>>({});
  const [formWaliData, setFormWaliData] = useState<WaliData[]>([]);

  useEffect(() => {
    if (santri) {
      setFormSantriData(santri);
    }
  }, [santri]);

  const handleSave = async () => {
    if (!santriId) return;

    try {
      setIsSaving(true);
      
      // Save santri data
      if (formSantriData) {
        const { error: santriError } = await supabase
          .from('santri')
          .update(formSantriData)
          .eq('id', santriId);

        if (santriError) throw santriError;
      }

      // Save wali data
      // TODO: Implement wali data saving

      toast.success('Data berhasil disimpan');
    } catch (error: any) {
      console.error('Error saving data:', error);
      toast.error('Gagal menyimpan data: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <PersonalStep
        santriData={formSantriData as SantriData}
        onChange={(data) => setFormSantriData(prev => ({ ...prev, ...data }))}
        isBinaan={santri?.kategori?.includes('Binaan') || false}
        isMukim={santri?.kategori?.includes('Mukim') || false}
      />

      <WaliStep
        waliData={formWaliData}
        onChange={setFormWaliData}
        isBinaan={santri?.kategori?.includes('Binaan') || false}
        isMukim={santri?.kategori?.includes('Mukim') || false}
      />

      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Pastikan semua data telah diisi dengan benar sebelum menyimpan
            </div>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InformasiPage;

