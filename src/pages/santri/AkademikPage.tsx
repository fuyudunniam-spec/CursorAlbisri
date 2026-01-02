import { useOutletContext } from "react-router-dom";
import SantriProgressTracking from "@/components/SantriProgressTracking";

interface ProfileContext {
  santriId: string;
}

const AkademikPage = () => {
  const { santriId } = useOutletContext<ProfileContext>();

  return (
    <div className="space-y-6 mt-6">
      {santriId ? (
        <SantriProgressTracking santriId={santriId} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Memuat data santri...
        </div>
      )}
    </div>
  );
};

export default AkademikPage;

