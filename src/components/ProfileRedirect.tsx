import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const ProfileRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const santriId = searchParams.get("santriId");
    const tab = searchParams.get("tab");
    
    if (santriId) {
      // Map old tab names to new routes (including legacy names for backward compatibility)
      const tabMap: { [key: string]: string } = {
        'ringkasan': 'informasi',    // Redirect old ringkasan to informasi
        'informasi': 'informasi',
        'academic': 'akademik',      // Legacy: academic -> akademik
        'akademik': 'akademik',
        'keuangan': 'keuangan',
        'tabungan': 'tabungan',
        'documents': 'dokumen',      // Legacy: documents -> dokumen
        'dokumen': 'dokumen',
        'bantuan': 'layanan',        // Legacy: bantuan -> layanan
        'layanan': 'layanan',
      };
      
      const route = tab && tabMap[tab] ? tabMap[tab] : 'informasi';
      navigate(`/santri/profile/${santriId}/${route}`, { replace: true });
    } else {
      // If no santriId, redirect to santri list
      navigate('/santri', { replace: true });
    }
  }, [searchParams, navigate]);
  
  return null;
};

export default ProfileRedirect;

