import { useOutletContext } from "react-router-dom";
import DokumenSantriTab from "@/components/DokumenSantriTab";

interface ProfileContext {
  santri: any;
  santriId: string;
}

const DokumenPage = () => {
  const { santri, santriId } = useOutletContext<ProfileContext>();
  
  const isBantuanRecipient = santri?.kategori?.includes('Binaan') || false;

  return (
    <div className="space-y-6 mt-6">
      <DokumenSantriTab
        santriId={santriId}
        santriData={{
          status_sosial: santri?.status_sosial as any,
          nama_lengkap: santri?.nama_lengkap || '',
          kategori: santri?.kategori
        }}
        isBantuanRecipient={isBantuanRecipient}
        mode="view"
      />
    </div>
  );
};

export default DokumenPage;

