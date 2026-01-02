import { useOutletContext } from "react-router-dom";
import BantuanYayasanTab from "@/components/BantuanYayasanTab";

interface ProfileContext {
  santriId: string;
  santri: any;
}

const LayananPage = () => {
  const { santriId, santri } = useOutletContext<ProfileContext>();

  return (
    <div className="space-y-6 mt-6">
      <BantuanYayasanTab 
        santriId={santriId}
        santriName={santri?.nama_lengkap}
        santriNisn={santri?.nisn}
        santriIdSantri={santri?.id_santri}
      />
    </div>
  );
};

export default LayananPage;

