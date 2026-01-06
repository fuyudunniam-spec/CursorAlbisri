import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, AlertCircle, Sparkles, TrendingUp, Wallet, Users, Info, Target, GraduationCap, BookOpen, Utensils, HeartHandshake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DonorSearch from '@/components/donor/DonorSearch';
import DonorFormDialog from '@/components/donor/DonorFormDialog';
import { DonorService, type DonorSearchResult } from '@/services/donor.service';
import SantriSearch from '@/components/santri/SantriSearch';
import { SemesterSyncService } from '@/services/semesterSync.service';
import { AkademikSemesterService, type Semester } from '@/services/akademikSemester.service';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  donationHeaderSchema, 
  donationItemSchema,
  fullDonationSchema,
  isItemPerishable,
  type DonationHeader,
  type DonationItem,
  type FullDonation
} from '@/schemas/donasi.schema';
import { checkDoubleEntry } from '@/services/keuangan.service';

interface DonationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingDonation?: any;
}

interface ItemSuggestion {
  item_id: string;
  item_name: string;
  item_category: string;
  item_uom: string;
  similarity_score: number;
}

const DonationFormDialog: React.FC<DonationFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editingDonation
}) => {
  const [donationForm, setDonationForm] = useState<DonationHeader>({
    donation_type: "cash",
    donor_name: "",
    donor_email: null,
    donor_phone: null,
    donor_address: null,
    donation_date: new Date().toISOString().split('T')[0],
    received_date: new Date().toISOString().split('T')[0],
    cash_amount: 0,
    payment_method: "Cash",
    is_restricted: false,
    restricted_tag: null,
    notes: null,
    hajat_doa: null,
      status: "received",
      kategori_donasi: null
  });

  const [itemsForm, setItemsForm] = useState<DonationItem[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, ItemSuggestion[]>>({});
  const [inventarisItems, setInventarisItems] = useState<any[]>([]);
  const [akunKasList, setAkunKasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedDonor, setSelectedDonor] = useState<DonorSearchResult | null>(null);
  const [showDonorForm, setShowDonorForm] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // State untuk pilar layanan (hanya 1 pilar yang bisa dipilih)
  const [selectedPilar, setSelectedPilar] = useState<PilarPelayanan | ''>('');
  const [selectedPilarAkunKas, setSelectedPilarAkunKas] = useState<string>('');
  
  // Legacy state untuk alokasi per pilar - DINONAKTIFKAN (diganti dengan single pilar selection)
  // const [pilarAllocations, setPilarAllocations] = useState<Record<PilarPelayanan, number>>({...});
  // const [pilarAkunKas, setPilarAkunKas] = useState<Record<PilarPelayanan, string>>({...});
  // const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('manual');
  
  // Legacy state (untuk backward compatibility dengan kategori lain)
  const [selectedSantri, setSelectedSantri] = useState<any>(null);
  
  // State untuk batch dan kebutuhan periode - DINONAKTIFKAN (modul kebutuhan layanan santri dinonaktifkan)
  // const [batchList, setBatchList] = useState<any[]>([]);
  // const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  // const [kebutuhanPeriode, setKebutuhanPeriode] = useState<any>(null);
  // const [loadingKebutuhan, setLoadingKebutuhan] = useState(false);

  // Handler untuk ketika donor baru berhasil dibuat
  const handleDonorFormSuccess = async () => {
    // Close donor form dialog
    setShowDonorForm(false);
    toast.success('Donatur berhasil ditambahkan! Silakan pilih donatur dari pencarian.');
    // Note: DonorSearch component will handle refreshing the search results
    // The user can then select the newly created donor from the search
  };

  useEffect(() => {
    if (open) {
      loadInventarisItems();
      loadAkunKasList();
      // Auto-load akun kas akan dilakukan saat pilar dipilih
      if (editingDonation) {
        // Load editing data
        setDonationForm({
          donation_type: editingDonation.donation_type,
          donor_name: editingDonation.donor_name,
          donor_email: editingDonation.donor_email,
          donor_phone: editingDonation.donor_phone,
          donor_address: editingDonation.donor_address,
          donation_date: editingDonation.donation_date,
          received_date: editingDonation.received_date || editingDonation.donation_date,
          cash_amount: editingDonation.cash_amount || 0,
          payment_method: editingDonation.payment_method || "Cash",
          is_restricted: editingDonation.is_restricted || false,
          restricted_tag: editingDonation.restricted_tag,
          notes: editingDonation.notes,
          hajat_doa: editingDonation.hajat_doa,
          status: editingDonation.status,
          akun_kas_id: editingDonation.akun_kas_id || null,
          kategori_donasi: (editingDonation as any).kategori_donasi || null
        });
        
        // Load selected donor if donor_id exists
        if (editingDonation.donor_id) {
          DonorService.getDonorById(editingDonation.donor_id).then(donor => {
            if (donor) {
              setSelectedDonor({
                id: donor.id,
                nama_lengkap: donor.nama_lengkap,
                nama_panggilan: donor.nama_panggilan,
                nomor_telepon: donor.nomor_telepon,
                email: donor.email,
                jenis_donatur: donor.jenis_donatur
              });
            }
          });
        }

        // Load selected santri and rancangan if exists
        if (editingDonation.target_santri_id) {
          supabase
            .from('santri')
            .select('id, nama_lengkap, id_santri, kategori')
            .eq('id', editingDonation.target_santri_id)
            .single()
            .then(({ data: santri }) => {
              if (santri) {
                setSelectedSantri(santri);
              }
            });
        }
        
        // Load existing donation items
        loadDonationItems(editingDonation.id);
      } else {
        resetForm();
      }
    }
  }, [open, editingDonation]);

  const loadDonationItems = async (donationId: string) => {
    try {
      const { data: items, error } = await supabase
        .from('donation_items')
        .select('*')
        .eq('donation_id', donationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading donation items:', error);
        toast.error('Gagal memuat item donasi');
        return;
      }

      if (items && items.length > 0) {
        // Map database items to form items
        const formItems: DonationItem[] = items.map(item => ({
          raw_item_name: item.raw_item_name,
          item_description: item.item_description || null,
          item_type: item.item_type || 'inventory',
          quantity: parseFloat(item.quantity.toString()),
          uom: item.uom,
          estimated_value: item.estimated_value ? parseFloat(item.estimated_value.toString()) : null,
          expiry_date: item.expiry_date || null,
          mapped_item_id: item.mapped_item_id || null,
          mapping_status: (item.mapping_status || 'unmapped') as 'unmapped' | 'suggested' | 'mapped' | 'new_item_created',
          suggested_item_id: item.suggested_item_id || null,
          is_posted_to_stock: item.is_posted_to_stock || false,
        }));
        
        setItemsForm(formItems);
        
        // Load suggestions for each item (only if not already mapped)
        for (let i = 0; i < formItems.length; i++) {
          if (formItems[i].raw_item_name && !formItems[i].mapped_item_id) {
            fetchSuggestions(i, formItems[i].raw_item_name);
          }
        }
      } else {
        setItemsForm([]);
      }
    } catch (error) {
      console.error('Error loading donation items:', error);
      toast.error('Gagal memuat item donasi');
    }
  };

  const loadInventarisItems = async () => {
    try {
      const { data } = await supabase
        .from('inventaris')
        .select('id, nama_barang, kategori, satuan, tipe_item')
        .order('nama_barang', { ascending: true });
      setInventarisItems(data || []);
    } catch (error) {
      console.error('Error loading inventaris items:', error);
    }
  };

  const loadAkunKasList = async () => {
    try {
      const { data, error } = await supabase
        .from('akun_kas')
        .select('*')
        .eq('status', 'aktif')
        .neq('nama', 'Tabungan Santri')
        .order('is_default', { ascending: false });
      
      if (error) {
        console.error('Error loading akun kas:', error);
        toast.error('Gagal memuat data akun kas');
        return;
      }
      
      setAkunKasList(data || []);
    } catch (error) {
      console.error('Error loading akun kas:', error);
      toast.error('Gagal memuat data akun kas');
    }
  };

  // Auto-load akun kas untuk pilar yang dipilih berdasarkan nama pilar
  const loadAkunKasForPilar = async (pilar: PilarPelayanan) => {
    try {
      // Ensure akun kas list is loaded
      let currentAkunKasList = akunKasList;
      if (currentAkunKasList.length === 0) {
        const { data, error } = await supabase
          .from('akun_kas')
          .select('*')
          .eq('status', 'aktif')
          .neq('nama', 'Tabungan Santri')
          .order('is_default', { ascending: false });
        
        if (error) {
          console.error('Error loading akun kas for pilar mapping:', error);
          return;
        }
        
        currentAkunKasList = data || [];
      }

      const config = PILAR_PELAYANAN_CONFIG[pilar];
      let matchedAkunId = '';

      // Map akun kas berdasarkan nama yang mengandung nama pilar
      for (const akun of currentAkunKasList) {
        const namaLower = akun.nama.toLowerCase();
        let isMatch = false;
        
        if (pilar === 'pendidikan_formal') {
          // Pendidikan Formal - cari yang mengandung "pendidikan" dan "formal"
          isMatch = namaLower.includes('pendidikan') && namaLower.includes('formal');
        } else if (pilar === 'pendidikan_pesantren') {
          // Pendidikan Pesantren - cari yang mengandung "pendidikan" dan ("pesantren" atau "madrasah")
          isMatch = namaLower.includes('pendidikan') && (namaLower.includes('pesantren') || namaLower.includes('madrasah'));
        } else if (pilar === 'operasional_konsumsi') {
          // Operasional Konsumsi - cari yang mengandung "operasional" atau "konsumsi"
          isMatch = namaLower.includes('operasional') || namaLower.includes('konsumsi');
        } else if (pilar === 'bantuan_langsung') {
          // Bantuan Langsung - cari yang mengandung "bantuan" dan "langsung"
          isMatch = namaLower.includes('bantuan') && namaLower.includes('langsung');
        }
        
        if (isMatch) {
          matchedAkunId = akun.id;
          break; // Ambil yang pertama ditemukan
        }
      }

      if (matchedAkunId) {
        setSelectedPilarAkunKas(matchedAkunId);
        const akun = currentAkunKasList.find(a => a.id === matchedAkunId);
        console.log(`✅ Pilar ${config.label}: Auto-selected akun kas "${akun?.nama || matchedAkunId}"`);
      } else {
        console.warn(`⚠️ Pilar ${config.label}: Akun kas tidak ditemukan, silakan pilih manual`);
      }
    } catch (error) {
      console.error('Error loading akun kas for pilar:', error);
    }
  };


  // Auto-load akun kas saat pilar dipilih
  useEffect(() => {
    if (donationForm.kategori_donasi === "Orang Tua Asuh Santri" && selectedPilar && akunKasList.length > 0) {
      loadAkunKasForPilar(selectedPilar);
    }
  }, [selectedPilar, donationForm.kategori_donasi, akunKasList.length]);


  // Helper function untuk auto-route akun_kas_id berdasarkan kategori donasi
  const getAkunKasIdByKategori = async (kategori: string | null | undefined): Promise<string | null> => {
    if (!kategori) return null;
    
    try {
      let accountNamePattern = '';
      
      if (kategori === 'Orang Tua Asuh Santri') {
        accountNamePattern = '%Pendidikan%Santri%';
      } else if (kategori === 'Pembangunan') {
        accountNamePattern = '%Pembangunan%';
      } else if (kategori === 'Donasi Umum') {
        accountNamePattern = '%Operasional%';
      } else {
        return null;
      }
      
      const { data, error } = await supabase
        .from('akun_kas')
        .select('id, nama')
        .eq('status', 'aktif')
        .ilike('nama', accountNamePattern)
        .limit(1)
        .maybeSingle();
      
      if (error || !data) {
        console.warn(`Akun kas dengan pola "${accountNamePattern}" tidak ditemukan untuk kategori "${kategori}"`);
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error('Error getting akun kas by kategori:', error);
      return null;
    }
  };


  const resetForm = () => {
    setDonationForm({
      donation_type: "cash",
      donor_name: "",
      donor_email: null,
      donor_phone: null,
      donor_address: null,
      donation_date: new Date().toISOString().split('T')[0],
      received_date: new Date().toISOString().split('T')[0],
      cash_amount: 0,
      payment_method: "Cash",
      is_restricted: false,
      restricted_tag: null,
      notes: null,
      hajat_doa: null,
      status: "received",
      akun_kas_id: null,
      kategori_donasi: null
    });
    setItemsForm([]);
    setSuggestions({});
    setValidationErrors({});
    setSelectedDonor(null);
    setManualMode(false);
    setSelectedSantri(null);
    
    // Reset state untuk batch - DINONAKTIFKAN
    // setSelectedBatchId('');
    // setBatchList([]);
    // setKebutuhanPeriode(null);
    // setLoadingKebutuhan(false);
    
    // Reset pilar selection
    setSelectedPilar('');
    setSelectedPilarAkunKas('');
  };

  const handleAddItemRow = () => {
    setItemsForm([
      ...itemsForm,
      {
        raw_item_name: "",
        item_description: null,
        item_type: "inventory", // Default to inventory
        quantity: 1,
        uom: "pcs",
        estimated_value: null, // Default to null (optional)
        expiry_date: null,
        mapped_item_id: null,
        mapping_status: "unmapped",
        suggested_item_id: null
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItemsForm(itemsForm.filter((_, i) => i !== index));
    const newSuggestions = { ...suggestions };
    delete newSuggestions[index];
    setSuggestions(newSuggestions);
  };

  const handleItemChange = (index: number, field: keyof DonationItem, value: any) => {
    const newItems = [...itemsForm];
    const currentItem = newItems[index];
    
    // Handle item_type transitions
    if (field === 'item_type') {
      // Transition from direct_consumption to inventory: reset mapping
      if (currentItem.item_type === 'direct_consumption' && value === 'inventory') {
        newItems[index] = {
          ...currentItem,
          item_type: value,
          mapped_item_id: null,
          mapping_status: 'unmapped',
          suggested_item_id: null,
          is_posted_to_stock: false as any // Reset posting status
        } as DonationItem;
      } 
      // Transition from inventory to direct_consumption: clear mapping
      else if (currentItem.item_type === 'inventory' && value === 'direct_consumption') {
        newItems[index] = {
          ...currentItem,
          item_type: value,
          mapped_item_id: null,
          mapping_status: 'unmapped',
          suggested_item_id: null,
          is_posted_to_stock: false as any // Reset posting status
        } as DonationItem;
        
        // Clear suggestions for this item since it's no longer inventory
        const newSuggestions = { ...suggestions };
        delete newSuggestions[index];
        setSuggestions(newSuggestions);
      } 
      else {
        (newItems[index] as any)[field] = value;
      }
    } else {
      (newItems[index] as any)[field] = value;
    }
    
    setItemsForm(newItems);

    if (field === 'raw_item_name' && value.length >= 2) {
      fetchSuggestions(index, value);
    }
  };

  const fetchSuggestions = async (index: number, rawName: string) => {
    try {
      const { data, error } = await supabase
        .rpc('suggest_items_for_donation', {
          p_raw_name: rawName,
          p_limit: 5
        });

      if (error) throw error;
      setSuggestions({ ...suggestions, [index]: data || [] });
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const applySuggestion = (index: number, suggestion: ItemSuggestion) => {
    const newItems = [...itemsForm];
    // Auto-fill item name and UoM from mapped inventory item
    newItems[index] = {
      ...newItems[index],
      raw_item_name: suggestion.item_name, // Auto-fill nama dari inventaris
      mapped_item_id: suggestion.item_id,
      mapping_status: 'mapped',
      uom: suggestion.item_uom, // Auto-fill satuan dari inventaris
      suggested_item_id: suggestion.item_id
    };
    setItemsForm(newItems);
  };

  const handleInventoryMapping = (index: number, itemId: string) => {
    const newItems = [...itemsForm];
    
    if (!itemId || itemId === "__new_item__") {
      // User selected "Item Baru" - clear mapping
      newItems[index] = {
        ...newItems[index],
        mapped_item_id: null,
        mapping_status: 'unmapped',
        // Keep existing raw_item_name and uom
      };
    } else {
      // Find the inventory item
      const invItem = inventarisItems.find(item => item.id === itemId);
      if (invItem) {
        newItems[index] = {
          ...newItems[index],
          raw_item_name: invItem.nama_barang, // Auto-fill nama dari inventaris
          mapped_item_id: itemId,
          mapping_status: 'mapped',
          uom: invItem.satuan || newItems[index].uom, // Auto-fill satuan dari inventaris
        };
      }
    }
    
    setItemsForm(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    try {
      // Auto-set akun_kas_id berdasarkan kategori_donasi jika belum di-set
      const finalDonationForm = { ...donationForm };
      
      if ((finalDonationForm.donation_type === 'cash' || finalDonationForm.donation_type === 'mixed') &&
          !finalDonationForm.akun_kas_id && 
          finalDonationForm.kategori_donasi) {
        // Auto-set akun kas berdasarkan kategori (kecuali "Orang Tua Asuh Santri" yang menggunakan akun kas per pilar)
        if (finalDonationForm.kategori_donasi !== "Orang Tua Asuh Santri") {
        const autoAkunKasId = await getAkunKasIdByKategori(finalDonationForm.kategori_donasi);
        if (autoAkunKasId) {
          finalDonationForm.akun_kas_id = autoAkunKasId;
          }
        }
      }

      const fullDonation: FullDonation = {
        header: finalDonationForm,
        items: (finalDonationForm.donation_type === 'in_kind' || finalDonationForm.donation_type === 'mixed') ? itemsForm : []
      };

      const validated = fullDonationSchema.parse(fullDonation);

      if (editingDonation) {
        // Validate for "Orang Tua Asuh Santri" category
        if (validated.header.kategori_donasi === "Orang Tua Asuh Santri") {
          if (!selectedSantri) {
            setValidationErrors({ santri: 'Pilih santri untuk kategori Orang Tua Asuh Santri' });
            toast.error('Pilih santri terlebih dahulu');
            setLoading(false);
            return;
          }
        }

        // Validate akun_kas_id for cash/mixed donations
        if ((validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed') && !validated.header.akun_kas_id) {
          setValidationErrors({ akun_kas_id: 'Pilih akun kas untuk donasi tunai' });
          toast.error('Pilih akun kas untuk donasi tunai');
          setLoading(false);
          return;
        }

        // Update existing donation
        // Build update payload - only include akun_kas_id for cash/mixed donations
        const updatePayload: any = {
          donation_type: validated.header.donation_type,
          donor_name: validated.header.donor_name,
          donor_email: validated.header.donor_email,
          donor_phone: validated.header.donor_phone,
          donor_address: validated.header.donor_address,
          donation_date: validated.header.donation_date,
          received_date: validated.header.received_date,
          cash_amount: validated.header.cash_amount,
          payment_method: validated.header.payment_method,
          is_restricted: validated.header.is_restricted,
          restricted_tag: validated.header.restricted_tag,
          notes: validated.header.notes,
          hajat_doa: validated.header.hajat_doa,
          status: validated.header.status,
          kategori_donasi: validated.header.kategori_donasi,
          updated_at: new Date().toISOString()
        };

        // Add donor_id if donor is selected
        if (selectedDonor) {
          updatePayload.donor_id = selectedDonor.id;
        } else {
          updatePayload.donor_id = null;
        }

        // Only include akun_kas_id for cash/mixed donations
        if (validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed') {
          updatePayload.akun_kas_id = validated.header.akun_kas_id;
        }

        const { data: donationData, error: donationError } = await supabase
          .from('donations')
          .update(updatePayload)
          .eq('id', editingDonation.id)
          .select()
          .single();

        if (donationError) throw donationError;

        // Edit diaktifkan untuk semua kategori donasi
        // Tidak ada lagi pembatasan berdasarkan posted_to_stock_at
        
        // Update items if in_kind or mixed
        if ((validated.header.donation_type === 'in_kind' || validated.header.donation_type === 'mixed') && validated.items.length > 0) {
          // Delete old items
          await supabase
            .from('donation_items')
            .delete()
            .eq('donation_id', editingDonation.id);

          // Insert new items
          const itemsToInsert = validated.items.map(item => ({
            donation_id: editingDonation.id,
            raw_item_name: item.raw_item_name,
            item_description: item.item_description || null,
            item_type: item.item_type || 'inventory',
            quantity: item.quantity,
            uom: item.uom,
            estimated_value: item.estimated_value || null,
            expiry_date: item.expiry_date || null,
            mapped_item_id: item.mapped_item_id || null,
            mapping_status: item.mapping_status || 'unmapped',
            suggested_item_id: item.suggested_item_id || null,
            created_at: new Date().toISOString()
          }));

          const { error: itemsError } = await supabase
            .from('donation_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }

        toast.success("Donasi berhasil diperbarui!");
      } else {
        // Validate for "Orang Tua Asuh Santri" category
        if (validated.header.kategori_donasi === "Orang Tua Asuh Santri") {
          // Validate pilar dipilih
          if (!selectedPilar) {
            setValidationErrors({ pilar: 'Pilih pilar layanan santri' });
            toast.error('Pilih pilar layanan santri terlebih dahulu');
          setLoading(false);
          return;
        }
          
          // Validate akun kas untuk pilar yang dipilih
          if (!selectedPilarAkunKas) {
            setValidationErrors({ akun_kas_pilar: 'Pilih akun kas untuk pilar yang dipilih' });
            toast.error('Pilih akun kas untuk pilar layanan santri');
            setLoading(false);
            return;
          }
        }

        // Validate akun_kas_id for cash/mixed donations (kecuali "Orang Tua Asuh Santri" yang menggunakan akun kas per pilar)
        if (
          validated.header.kategori_donasi !== "Orang Tua Asuh Santri" &&
          (validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed') && 
          !validated.header.akun_kas_id
        ) {
          setValidationErrors({ akun_kas_id: 'Pilih akun kas untuk donasi tunai' });
          toast.error('Pilih akun kas untuk donasi tunai');
          setLoading(false);
          return;
        }

        // Create new donation
        // Build insert payload - only include akun_kas_id for cash/mixed donations
        const insertPayload: any = {
          donation_type: validated.header.donation_type,
          donor_name: validated.header.donor_name,
          donor_email: validated.header.donor_email,
          donor_phone: validated.header.donor_phone,
          donor_address: validated.header.donor_address,
          donation_date: validated.header.donation_date,
          received_date: validated.header.received_date,
          cash_amount: validated.header.cash_amount,
          payment_method: validated.header.payment_method,
          is_restricted: validated.header.is_restricted,
          restricted_tag: validated.header.restricted_tag,
          notes: validated.header.notes,
          hajat_doa: validated.header.hajat_doa,
          status: validated.header.status,
          kategori_donasi: validated.header.kategori_donasi,
          // Untuk "Orang Tua Asuh Santri", pastikan status_setoran adalah "Belum disetor" untuk mencegah trigger
          // Trigger hanya jalan saat status_setoran berubah dari "Belum disetor" ke "Sudah disetor"
          status_setoran: "Belum disetor",
          tanggal_setoran: null
        };

        // Add donor_id if donor is selected
        if (selectedDonor) {
          insertPayload.donor_id = selectedDonor.id;
        }

        // Note: Untuk "Orang Tua Asuh Santri", tidak perlu set target_santri_id dan target_rancangan_id
        // karena donasi dialokasikan ke semua santri dalam periode yang dipilih

        // Only include akun_kas_id for cash/mixed donations (kecuali "Orang Tua Asuh Santri" yang menggunakan akun kas per pilar)
        // Untuk "Orang Tua Asuh Santri", set akun_kas_id menjadi NULL secara eksplisit untuk mencegah trigger database posting
        if (
          validated.header.kategori_donasi !== "Orang Tua Asuh Santri" &&
          (validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed')
        ) {
          insertPayload.akun_kas_id = validated.header.akun_kas_id;
        } else if (validated.header.kategori_donasi === "Orang Tua Asuh Santri") {
          // Pastikan akun_kas_id NULL untuk mencegah trigger database posting
          insertPayload.akun_kas_id = null;
        }

        const { data: donationData, error: donationError } = await supabase
          .from('donations')
          .insert([insertPayload])
          .select()
          .single();

        if (donationError) throw donationError;

        // Post to finance untuk "Orang Tua Asuh Santri" (single pilar)
        if (donationData && 
            validated.header.kategori_donasi === "Orang Tua Asuh Santri" && 
            donationData.cash_amount &&
            donationData.status === 'received' &&
            selectedPilar &&
            selectedPilarAkunKas) {
          try {
            const config = PILAR_PELAYANAN_CONFIG[selectedPilar];
            const referensi = `Donasi Orang Tua Asuh Santri - ${config.label} (${donationData.id})`;
            const tanggal = donationData.received_date || donationData.donation_date;
            
            // Hapus SEMUA transaksi keuangan yang mungkin sudah ada untuk donasi ini
            // Ini mencegah duplikasi (baik dari trigger database maupun posting sebelumnya)
            // Kita hapus semua, lalu buat yang baru untuk memastikan hanya ada satu transaksi
            
            // Cek dengan beberapa kriteria untuk memastikan kita mendapatkan semua transaksi yang terkait
            // PENTING: Cek berdasarkan source_module dan source_id terlebih dahulu (paling akurat)
            const { data: existingTransactionsBySource, error: fetchErrorBySource } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .eq('source_module', 'donasi')
              .eq('source_id', donationData.id);
            
            // Juga cek berdasarkan berbagai pola referensi untuk catch semua kemungkinan format
            // 1. Format baru: donasi:{id}
            const { data: existingTransactionsByRef1 } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .eq('referensi', `donasi:${donationData.id}`);
            
            // 2. Format lama dari trigger: donation:{id} (dengan badge ungu)
            const { data: existingTransactionsByRef2 } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .eq('referensi', `donation:${donationData.id}`);
            
            // 3. Format manual kita: Donasi Orang Tua Asuh Santri - ...
            const { data: existingTransactionsByRef3 } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .ilike('referensi', `Donasi Orang Tua Asuh Santri%${donationData.id}%`);
            
            // 4. Juga cek dengan pattern yang lebih umum (untuk catch variasi lain)
            const { data: existingTransactionsByRef4 } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .or(`referensi.eq.donasi:${donationData.id},referensi.eq.donation:${donationData.id},referensi.ilike.%${donationData.id}%`);
            
            // Combine semua ref transactions
            const existingTransactionsByRef = [
              ...(existingTransactionsByRef1 || []),
              ...(existingTransactionsByRef2 || []),
              ...(existingTransactionsByRef3 || []),
              ...(existingTransactionsByRef4 || [])
            ];
            
            // Combine dan deduplicate
            const allExistingTransactions: any[] = [];
            const seenIds = new Set<string>();
            
            // Add transactions from source
            if (existingTransactionsBySource) {
              existingTransactionsBySource.forEach((tx: any) => {
                if (!seenIds.has(tx.id)) {
                  seenIds.add(tx.id);
                  allExistingTransactions.push(tx);
                }
              });
            }
            
            // Add transactions from referensi patterns
            if (existingTransactionsByRef && existingTransactionsByRef.length > 0) {
              existingTransactionsByRef.forEach((tx: any) => {
                if (!seenIds.has(tx.id)) {
                  seenIds.add(tx.id);
                  allExistingTransactions.push(tx);
                }
              });
            }
            
            console.log(`Found ${allExistingTransactions.length} existing transactions for donation ${donationData.id}:`, allExistingTransactions);
            
            // Hapus semua transaksi yang ditemukan
            if (allExistingTransactions.length > 0) {
              const transactionIds = allExistingTransactions.map(tx => tx.id);
              const { error: deleteError, count: deleteCount } = await supabase
                .from('keuangan')
                .delete()
                .in('id', transactionIds);
              
              if (deleteError) {
                console.error('❌ Error menghapus transaksi existing:', deleteError);
                throw new Error(`Gagal menghapus transaksi duplikat: ${deleteError.message}`);
              } else {
                console.log(`✅ Berhasil menghapus ${allExistingTransactions.length} transaksi existing untuk mencegah duplikasi`);
              }
              
              // Tunggu sebentar untuk memastikan delete sudah commit
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Double check: pastikan tidak ada transaksi lagi sebelum insert
            // Cek dengan berbagai pola untuk memastikan kita mendapatkan semua transaksi
            const { data: remainingBySource } = await supabase
              .from('keuangan')
              .select('id')
              .eq('source_module', 'donasi')
              .eq('source_id', donationData.id);
            
            // Cek semua pola referensi yang mungkin (termasuk format lama donation:)
            const { data: remainingByRef1 } = await supabase
              .from('keuangan')
              .select('id')
              .eq('referensi', `donasi:${donationData.id}`);
            
            const { data: remainingByRef2 } = await supabase
              .from('keuangan')
              .select('id')
              .eq('referensi', `donation:${donationData.id}`);
            
            const { data: remainingByRef3 } = await supabase
              .from('keuangan')
              .select('id')
              .ilike('referensi', `Donasi Orang Tua Asuh Santri%${donationData.id}%`);
            
            const allRemaining = [
              ...(remainingBySource || []),
              ...(remainingByRef1 || []),
              ...(remainingByRef2 || []),
              ...(remainingByRef3 || [])
            ];
            
            // Deduplicate
            const remainingIdsSet = new Set(allRemaining.map(tx => tx.id));
            
            if (remainingIdsSet.size > 0) {
              console.warn(`⚠️ Warning: Masih ada ${remainingIdsSet.size} transaksi setelah delete. Mencoba delete lagi...`);
              const remainingIdsArray = Array.from(remainingIdsSet);
              const { error: retryDeleteError } = await supabase
                .from('keuangan')
                .delete()
                .in('id', remainingIdsArray);
              
              if (retryDeleteError) {
                console.error('❌ Error retry delete:', retryDeleteError);
              } else {
                console.log(`✅ Retry delete berhasil, menghapus ${remainingIdsArray.length} transaksi`);
              }
              
              // Tunggu lagi setelah retry delete
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Create finance transaction untuk pilar yang dipilih
            const { data: keuanganData, error: financeError } = await supabase
              .from('keuangan')
              .insert([{
                tanggal: tanggal,
                jenis_transaksi: 'Pemasukan',
                kategori: 'Donasi',
                sub_kategori: 'Orang Tua Asuh Santri',
                akun_kas_id: selectedPilarAkunKas,
                jumlah: donationData.cash_amount,
                deskripsi: `Donasi dari ${donationData.donor_name} untuk ${config.label}`,
                referensi: referensi,
                source_module: 'donasi',
                source_id: donationData.id,
                auto_posted: true,
                status: 'posted',
                created_at: new Date().toISOString()
              }])
              .select()
              .single();
            
            if (financeError) {
              console.error(`❌ Error posting to finance for ${config.label}:`, financeError);
              throw financeError;
            }
            
            console.log(`✅ Transaksi keuangan berhasil dibuat:`, keuanganData);

            // Final check: pastikan tidak ada transaksi duplikat yang dibuat setelah insert
            // (untuk catch jika ada trigger yang jalan setelah insert)
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Cek dengan berbagai pola untuk memastikan kita mendapatkan semua transaksi
            const { data: finalCheckBySource } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .eq('source_module', 'donasi')
              .eq('source_id', donationData.id);
            
            // Cek semua pola referensi yang mungkin (termasuk format lama donation:)
            const { data: finalCheckByRef1 } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .eq('referensi', `donasi:${donationData.id}`);
            
            const { data: finalCheckByRef2 } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .eq('referensi', `donation:${donationData.id}`);
            
            const { data: finalCheckByRef3 } = await supabase
              .from('keuangan')
              .select('id, akun_kas_id, referensi')
              .ilike('referensi', `Donasi Orang Tua Asuh Santri%${donationData.id}%`);
            
            // Combine dan deduplicate
            const allFinalCheck: any[] = [];
            const finalCheckIds = new Set<string>();
            [finalCheckBySource, finalCheckByRef1, finalCheckByRef2, finalCheckByRef3].forEach(transactions => {
              if (transactions) {
                transactions.forEach((tx: any) => {
                  if (!finalCheckIds.has(tx.id)) {
                    finalCheckIds.add(tx.id);
                    allFinalCheck.push(tx);
                  }
                });
              }
            });
            
            if (allFinalCheck.length > 1) {
              console.warn(`⚠️ Warning: Ditemukan ${allFinalCheck.length} transaksi setelah insert. Menghapus duplikat...`);
              
              // Hapus semua kecuali yang baru saja dibuat (keuanganData.id) dan yang di akun kas pilar yang dipilih
              const duplicateIds = allFinalCheck
                .filter(tx => tx.id !== keuanganData.id && tx.akun_kas_id !== selectedPilarAkunKas)
                .map(tx => tx.id);
              
              if (duplicateIds.length > 0) {
                const { error: finalDeleteError } = await supabase
                  .from('keuangan')
                  .delete()
                  .in('id', duplicateIds);
                
                if (finalDeleteError) {
                  console.error('❌ Error menghapus duplikat final:', finalDeleteError);
                } else {
                  console.log(`✅ Menghapus ${duplicateIds.length} transaksi duplikat`);
                }
              }
            }

            // Update saldo akun kas
            try {
              await supabase.rpc('ensure_akun_kas_saldo_correct_for', {
                p_akun_id: selectedPilarAkunKas
              });
            } catch (saldoError) {
              console.warn(`Warning ensuring saldo correct for ${config.label}:`, saldoError);
            }

            toast.success(`Donasi berhasil dicatat! Tercatat sebagai pemasukan di modul keuangan untuk ${config.label}.`);
          } catch (error: any) {
            console.error('Error posting to finance:', error);
            // Don't fail the donation creation, just log warning
            toast.warning('Donasi berhasil dicatat, tapi gagal posting ke keuangan. Silakan posting manual.');
          }
        }

        // Insert items if in_kind or mixed
        if ((validated.header.donation_type === 'in_kind' || validated.header.donation_type === 'mixed') && validated.items.length > 0) {
          const itemsToInsert = validated.items.map(item => ({
            donation_id: donationData.id,
            raw_item_name: item.raw_item_name,
            item_description: item.item_description || null,
            item_type: item.item_type || 'inventory',
            quantity: item.quantity,
            uom: item.uom,
            estimated_value: item.estimated_value || null,
            expiry_date: item.expiry_date || null,
            mapped_item_id: item.mapped_item_id || null,
            mapping_status: item.mapping_status || 'unmapped',
            suggested_item_id: item.suggested_item_id || null,
            created_at: new Date().toISOString()
          }));

          const { error: itemsError } = await supabase
            .from('donation_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }

        // Note: Posting to finance is now handled automatically by database trigger
        // when donation_type = 'cash' and status = 'received' (kecuali "Orang Tua Asuh Santri" yang sudah di-handle manual per pilar)
        
        // Show success message with auto-posting info for cash donations
        // (kecuali "Orang Tua Asuh Santri" yang sudah menampilkan pesan sukses di atas)
        if (
          validated.header.kategori_donasi !== "Orang Tua Asuh Santri" &&
          (validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed') && 
          validated.header.status === 'received'
        ) {
          toast.success("Donasi berhasil dicatat! Donasi tunai otomatis tercatat di modul keuangan.");
        } else if (validated.header.kategori_donasi !== "Orang Tua Asuh Santri") {
          toast.success("Donasi berhasil dicatat!");
        }
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting donation:", error);
      toast.error(error.message || "Gagal mencatat donasi");
    } finally {
      setLoading(false);
    }
  };

  // Note: postToFinance function removed - posting to finance is now automatic via database trigger

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDonation ? 'Edit Donasi' : 'Catat Donasi'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Kategori Donasi */}
          <div className="space-y-2">
            <Label>Kategori Donasi *</Label>
            <Select 
              value={donationForm.kategori_donasi || ""} 
              onValueChange={(value: any) => {
                const newKategori = value || null;
                setDonationForm({ 
                  ...donationForm, 
                  kategori_donasi: newKategori,
                  // Reset donation_type jika kategori bukan "Donasi Umum" dan saat ini adalah in_kind
                  donation_type: (newKategori !== "Donasi Umum" && donationForm.donation_type === "in_kind") 
                    ? "cash" 
                    : donationForm.donation_type,
                  // Auto-route akun_kas_id berdasarkan kategori (akan di-set saat submit)
                  akun_kas_id: null
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori donasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Orang Tua Asuh Santri">Orang Tua Asuh Santri</SelectItem>
                <SelectItem value="Pembangunan">Pembangunan</SelectItem>
                <SelectItem value="Donasi Umum">Donasi Umum</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pilih kategori donasi untuk menentukan akun kas tujuan secara otomatis
            </p>
          </div>

          {/* Donation Type - hanya tunai jika bukan Donasi Umum */}
          {donationForm.kategori_donasi && (
            <div className="space-y-2">
              <Label>Tipe Donasi *</Label>
              <Select 
                value={donationForm.donation_type} 
                onValueChange={(value: any) => {
                  setDonationForm({ ...donationForm, donation_type: value });
                  // Clear akun_kas_id validation error when changing donation type
                  if (validationErrors.akun_kas_id) {
                    setValidationErrors({ ...validationErrors, akun_kas_id: '' });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {donationForm.kategori_donasi === "Donasi Umum" ? (
                    <>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="in_kind">Barang</SelectItem>
                      <SelectItem value="mixed">
                        <div className="flex flex-col">
                          <span className="font-medium">Campuran (Tunai + Barang)</span>
                          <span className="text-xs text-muted-foreground">Tunai dan barang sekaligus</span>
                        </div>
                      </SelectItem>
                    </>
                  ) : (
                    <SelectItem value="cash">Tunai</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {donationForm.kategori_donasi !== "Donasi Umum" && (
                <p className="text-xs text-muted-foreground">
                  Kategori ini hanya mendukung donasi tunai
                </p>
              )}
            </div>
          )}

          {/* Informasi Donatur - Step 2 */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Informasi Donatur</Label>
              {selectedDonor && (
                <Badge variant="outline" className="text-xs">
                  Donatur: {selectedDonor.nama_lengkap}
                </Badge>
              )}
              </div>

            {!manualMode ? (
                <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cari Donatur *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDonorForm(true)}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah Donatur Baru
                  </Button>
                </div>
                <DonorSearch
                  value={selectedDonor?.id}
                  onSelect={async (donor) => {
                    setSelectedDonor(donor);
                    if (donor) {
                      // Auto-fill from selected donor
                      const fullDonor = await DonorService.getDonorById(donor.id);
                      if (fullDonor) {
                        setDonationForm({
                          ...donationForm,
                          donor_name: fullDonor.nama_lengkap,
                          donor_email: fullDonor.email || null,
                          donor_phone: fullDonor.nomor_telepon || null,
                          donor_address: fullDonor.alamat || null
                        });
                      }
                    } else {
                      // Manual mode activated
                      setManualMode(true);
                      setDonationForm({
                        ...donationForm,
                        donor_name: '',
                        donor_email: null,
                        donor_phone: null,
                        donor_address: null
                      });
                    }
                  }}
                  onAddNew={() => setShowDonorForm(true)}
                  placeholder="Cari donatur dari database..."
                />
                        </div>
                      ) : (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Input Manual</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setManualMode(false);
                      setSelectedDonor(null);
                      setDonationForm({
                        ...donationForm,
                        donor_name: '',
                        donor_email: null,
                        donor_phone: null,
                        donor_address: null
                      });
                    }}
                    className="h-7 text-xs"
                  >
                    Kembali ke Pencarian
                  </Button>
                            </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="donor_name">Nama Donatur *</Label>
                    <Input
                      id="donor_name"
                      value={donationForm.donor_name}
                      onChange={(e) => setDonationForm({ ...donationForm, donor_name: e.target.value })}
                      required
                    />
                        </div>
                  <div className="space-y-2">
                    <Label htmlFor="donor_email">Email</Label>
                    <Input
                      id="donor_email"
                      type="email"
                      value={donationForm.donor_email || ""}
                      onChange={(e) => setDonationForm({ ...donationForm, donor_email: e.target.value || null })}
                    />
                      </div>
                  <div className="space-y-2">
                    <Label htmlFor="donor_phone">Telepon</Label>
                    <Input
                      id="donor_phone"
                      value={donationForm.donor_phone || ""}
                      onChange={(e) => setDonationForm({ ...donationForm, donor_phone: e.target.value || null })}
                    />
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="donation_date_manual">Tanggal Donasi *</Label>
                    <Input
                      id="donation_date_manual"
                      type="date"
                      value={donationForm.donation_date}
                      onChange={(e) => setDonationForm({ ...donationForm, donation_date: e.target.value })}
                      required
                    />
                </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donor_address">Alamat Donatur</Label>
                  <Textarea
                    id="donor_address"
                    value={donationForm.donor_address || ""}
                    onChange={(e) => setDonationForm({ ...donationForm, donor_address: e.target.value || null })}
                    placeholder="Masukkan alamat lengkap donatur"
                    rows={2}
                  />
                    </div>
                </div>
              )}

            {!manualMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                  <Label htmlFor="donation_date">Tanggal Donasi *</Label>
                  <Input
                    id="donation_date"
                    type="date"
                    value={donationForm.donation_date}
                    onChange={(e) => setDonationForm({ ...donationForm, donation_date: e.target.value })}
                    required
                  />
                                </div>
                                  </div>
            )}
                                  </div>

          {/* Section Santri - Step 3: Pilih Pilar Layanan (hanya untuk kategori "Orang Tua Asuh Santri") */}
          {donationForm.kategori_donasi === "Orang Tua Asuh Santri" && (
            <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
              <CardContent className="p-6 space-y-6">
                {/* Header Section */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Layanan Orang Tua Asuh Santri</h3>
                      <p className="text-sm text-gray-500">Pilih pilar layanan santri untuk donasi ini</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                    <Target className="h-3 w-3 mr-1" />
                    Program Khusus
                  </Badge>
                </div>

                {/* Pilih Pilar Layanan */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-2">Pilih Pilar Layanan *</h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Pilih salah satu pilar layanan santri untuk donasi ini
                    </p>
                    
                    <Select 
                      value={selectedPilar} 
                      onValueChange={(value) => {
                        setSelectedPilar(value as PilarPelayanan);
                        setSelectedPilarAkunKas(''); // Reset akun kas saat pilar berubah
                        if (validationErrors.pilar) {
                          setValidationErrors({ ...validationErrors, pilar: '' });
                        }
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Pilih pilar layanan santri" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PILAR_PELAYANAN_CONFIG).map(([pilarKey, config]) => {
                          // Get icon component based on icon name
                          const IconComponent = 
                            config.icon === 'GraduationCap' ? GraduationCap :
                            config.icon === 'BookOpen' ? BookOpen :
                            config.icon === 'Utensils' ? Utensils :
                            config.icon === 'HeartHandshake' ? HeartHandshake :
                            Target;
                          
                          const iconColor = 
                            config.color === 'slate' ? 'text-slate-600' :
                            config.color === 'blue' ? 'text-blue-600' :
                            config.color === 'green' ? 'text-green-600' :
                            'text-orange-600';
                          
                          const iconBgColor = 
                            config.color === 'slate' ? 'bg-slate-100' :
                            config.color === 'blue' ? 'bg-blue-100' :
                            config.color === 'green' ? 'bg-green-100' :
                            'bg-orange-100';
                          
                          return (
                            <SelectItem key={pilarKey} value={pilarKey}>
                              <div className="flex items-center gap-3 py-1.5">
                                <div className={`p-2 rounded-lg ${iconBgColor}`}>
                                  <IconComponent className={`h-5 w-5 ${iconColor}`} />
                                </div>
                                <span className="font-medium text-gray-900">{config.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {validationErrors.pilar && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.pilar}
                      </p>
                    )}
                  </div>

                  {/* Akun Kas untuk Pilar yang Dipilih */}
                  {selectedPilar && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-gray-500" />
                        Akun Kas untuk {PILAR_PELAYANAN_CONFIG[selectedPilar].label.replace('Layanan ', '')} *
                      </Label>
                      <Select
                        value={selectedPilarAkunKas}
                        onValueChange={(value) => {
                          setSelectedPilarAkunKas(value);
                          if (validationErrors.akun_kas_pilar) {
                            setValidationErrors({ ...validationErrors, akun_kas_pilar: '' });
                          }
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Pilih akun kas" />
                        </SelectTrigger>
                        <SelectContent>
                          {akunKasList.map((akun) => (
                            <SelectItem key={akun.id} value={akun.id}>
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-gray-400" />
                                <span>{akun.nama}</span>
                                {akun.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.akun_kas_pilar && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.akun_kas_pilar}
                        </p>
                      )}
                      {selectedPilarAkunKas && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              Donasi akan tercatat sebagai pemasukan di akun kas yang dipilih untuk {PILAR_PELAYANAN_CONFIG[selectedPilar].label.replace('Layanan ', '')}.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Display Selected Pilar dengan Icon */}
                  {selectedPilar && (
                    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const config = PILAR_PELAYANAN_CONFIG[selectedPilar];
                            const IconComponent = 
                              config.icon === 'GraduationCap' ? GraduationCap :
                              config.icon === 'BookOpen' ? BookOpen :
                              config.icon === 'Utensils' ? Utensils :
                              config.icon === 'HeartHandshake' ? HeartHandshake :
                              Target;
                            
                            const iconColor = 
                              config.color === 'slate' ? 'text-slate-600' :
                              config.color === 'blue' ? 'text-blue-600' :
                              config.color === 'green' ? 'text-green-600' :
                              'text-orange-600';
                            
                            const iconBgColor = 
                              config.color === 'slate' ? 'bg-slate-100' :
                              config.color === 'blue' ? 'bg-blue-100' :
                              config.color === 'green' ? 'bg-green-100' :
                              'bg-orange-100';
                            
                            return (
                              <>
                                <div className={`p-3 rounded-lg ${iconBgColor}`}>
                                  <IconComponent className={`h-6 w-6 ${iconColor}`} />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{config.label}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Pilar layanan yang dipilih</p>
                                </div>
                                <Check className="h-5 w-5 text-green-600" />
                              </>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informasi Pembayaran - Step 4 */}
          {(donationForm.donation_type === 'cash' || donationForm.donation_type === 'mixed') && (
            <Card className="border border-gray-200">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-900">Informasi Pembayaran</h3>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cash_amount" className="text-sm font-medium">Jumlah (Rp) *</Label>
                  <Input
                    id="cash_amount"
                    type="number"
                    value={donationForm.cash_amount || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setDonationForm({ ...donationForm, cash_amount: value });
                        // Clear alokasi error when cash amount changes
                        if (validationErrors.alokasi) {
                          setValidationErrors({ ...validationErrors, alokasi: '' });
                        }
                      }}
                    required
                      className="text-lg font-semibold h-11"
                      min={0}
                      step="1000"
                      placeholder="0"
                  />
                    {donationForm.cash_amount > 0 && (
                      <p className="text-xs text-gray-500 font-medium">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(donationForm.cash_amount)}
                      </p>
                    )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Metode Pembayaran</Label>
                  <Select 
                    value={donationForm.payment_method || "Cash"} 
                    onValueChange={(value) => setDonationForm({ ...donationForm, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Tunai</SelectItem>
                      <SelectItem value="Bank Transfer">Transfer Bank</SelectItem>
                      <SelectItem value="QRIS">QRIS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Akun Kas - hanya untuk kategori selain "Orang Tua Asuh Santri" */}
              {donationForm.kategori_donasi !== "Orang Tua Asuh Santri" && (
              <div className="space-y-2">
                <Label htmlFor="akun_kas_id">Akun Kas *</Label>
                {donationForm.kategori_donasi ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Akun kas akan otomatis di-set berdasarkan kategori donasi:
                          <br />
                          {donationForm.kategori_donasi === 'Pembangunan' && '→ Bank Pembangunan'}
                          {donationForm.kategori_donasi === 'Donasi Umum' && '→ Bank Operasional Umum'}
                        </span>
                      </p>
                    </div>
                    {donationForm.akun_kas_id && (
                      <Select 
                        value={donationForm.akun_kas_id || ""} 
                        disabled
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {akunKasList.map((akun) => (
                            <SelectItem key={akun.id} value={akun.id}>
                              {akun.nama} {akun.is_default && '(Default)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
                  <>
                    <Select 
                      value={donationForm.akun_kas_id || ""} 
                      onValueChange={(value) => {
                        setDonationForm({ ...donationForm, akun_kas_id: value || null });
                        // Clear validation error when user selects a value
                        if (validationErrors.akun_kas_id) {
                          setValidationErrors({ ...validationErrors, akun_kas_id: '' });
                        }
                      }}
                    >
                      <SelectTrigger className={validationErrors.akun_kas_id ? "border-red-500" : ""}>
                        <SelectValue placeholder="Pilih akun kas tujuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {akunKasList.map((akun) => (
                          <SelectItem key={akun.id} value={akun.id}>
                            {akun.nama} {akun.is_default && '(Default)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.akun_kas_id ? (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.akun_kas_id}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Pilih akun kas atau bank tempat donasi akan dicatat
                      </p>
                    )}
                  </>
                )}
              </div>
              )}
              {donationForm.kategori_donasi === "Orang Tua Asuh Santri" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Akun kas untuk kategori "Orang Tua Asuh Santri" dipilih per pilar layanan di atas.
                    </span>
                  </p>
                </div>
              )}
              {donationForm.status === 'received' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      💡 Donasi tunai dengan status "Diterima" akan otomatis tercatat di modul keuangan. 
                      Anda dapat melihat transaksi ini di riwayat keuangan dengan kategori "Donasi".
                    </span>
                  </p>
                </div>
              )}
              </CardContent>
            </Card>
          )}

          {/* In-kind items */}
          {(donationForm.donation_type === 'in_kind' || donationForm.donation_type === 'mixed') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Item Donasi</Label>
                <Button type="button" size="sm" onClick={handleAddItemRow}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Item
                </Button>
              </div>

              {itemsForm.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Nama Item *</Label>
                        <Input
                          value={item.raw_item_name}
                          onChange={(e) => handleItemChange(index, 'raw_item_name', e.target.value)}
                          required
                          placeholder={item.mapped_item_id ? "Nama sudah diisi dari inventaris" : "Contoh: Beras Premium"}
                          disabled={item.mapping_status === 'mapped' && item.mapped_item_id !== null}
                          className={item.mapping_status === 'mapped' && item.mapped_item_id ? "bg-gray-50" : ""}
                        />
                        {item.mapping_status === 'mapped' && item.mapped_item_id && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Nama diambil dari inventaris: {item.raw_item_name}
                          </p>
                        )}
                        {!item.mapped_item_id && isItemPerishable(item.raw_item_name) && (
                          <p className="text-xs text-orange-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Item mudah rusak - tanggal kedaluwarsa disarankan
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Jumlah *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                          required
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Item Type Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Jenis Item *
                        <span className="text-xs font-normal text-muted-foreground">
                          (Tentukan apakah item masuk gudang atau langsung habis)
                        </span>
                      </Label>
                      <Select 
                        value={item.item_type || "inventory"} 
                        onValueChange={(value: any) => handleItemChange(index, 'item_type', value)}
                        disabled={(item as any).is_posted_to_stock === true}
                      >
                        <SelectTrigger className={(item as any).is_posted_to_stock === true ? "bg-gray-50" : ""}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inventory">
                            <div className="flex items-center gap-2">
                              <span>📦</span>
                              <span className="font-medium">Masuk Inventaris</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="direct_consumption">
                            <div className="flex items-center gap-2">
                              <span>🍽️</span>
                              <span className="font-medium">Langsung Dikonsumsi</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {(item as any).is_posted_to_stock === true && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-xs text-gray-700 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>
                              Item sudah diposting ke gudang, jenis item tidak dapat diubah lagi.
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Satuan *</Label>
                        <Input
                          value={item.uom}
                          onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                          required
                          placeholder="pcs, kg, liter"
                          disabled={item.mapping_status === 'mapped' && item.mapped_item_id !== null}
                          className={item.mapping_status === 'mapped' && item.mapped_item_id ? "bg-gray-50" : ""}
                        />
                        {item.mapping_status === 'mapped' && item.mapped_item_id && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Satuan diambil dari inventaris
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Nilai Taksir (Rp) <span className="text-xs text-muted-foreground">(Opsional)</span></Label>
                        <Input
                          type="number"
                          value={item.estimated_value || ""}
                          onChange={(e) => handleItemChange(index, 'estimated_value', e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="Kosongkan jika tidak perlu"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tanggal Kedaluwarsa</Label>
                        <Input
                          type="date"
                          value={item.expiry_date || ""}
                          onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value || null)}
                        />
                      </div>
                    </div>

                    {/* Mapping to Inventory - Only show for inventory type */}
                    {item.item_type === "inventory" && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label>Pemetaan ke Inventaris</Label>
                          <div className="flex gap-2">
                            <Select
                              value={item.mapped_item_id || "__new_item__"}
                              onValueChange={(value) => {
                                handleInventoryMapping(index, value);
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Pilih item dari inventaris (opsional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__new_item__">-- Item Baru (Buat di inventaris) --</SelectItem>
                                {inventarisItems.map((invItem) => (
                                  <SelectItem key={invItem.id} value={invItem.id}>
                                    {invItem.nama_barang} ({invItem.kategori}) - {invItem.satuan}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {item.mapping_status === 'mapped' && item.mapped_item_id && (
                            <div className="space-y-1">
                              <p className="text-xs text-green-600 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Item sudah dipetakan ke inventaris
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Nama dan satuan sudah diisi otomatis dari data inventaris. Anda hanya perlu mengisi jumlah.
                              </p>
                            </div>
                          )}
                          {!item.mapped_item_id && (
                            <div className="space-y-1">
                              <p className="text-xs text-blue-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Item baru akan dibuat di inventaris saat posting ke gudang
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Isi nama item di atas. Item akan dibuat otomatis di inventaris saat diposting ke gudang.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Suggestions */}
                        {suggestions[index] && suggestions[index].length > 0 && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm">
                              <Sparkles className="w-4 h-4 text-primary" />
                              Saran Pemetaan Otomatis
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {suggestions[index].map((suggestion) => (
                                <Button
                                  key={suggestion.item_id}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => applySuggestion(index, suggestion)}
                                  className="text-xs"
                                >
                                  {suggestion.item_name} 
                                  <Badge variant="secondary" className="ml-2">
                                    {suggestion.similarity_score}%
                                  </Badge>
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Klik salah satu saran untuk memetakan item secara otomatis
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info for direct consumption */}
                    {item.item_type === "direct_consumption" && (
                      <div className="border-t pt-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              Item ini akan langsung dicatat sebagai konsumsi tanpa masuk ke inventaris. 
                              Tidak perlu dipetakan ke item inventaris.
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveItemRow(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus Item
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Restrictions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_restricted"
                checked={donationForm.is_restricted}
                onCheckedChange={(checked) => setDonationForm({ ...donationForm, is_restricted: checked as boolean })}
              />
              <Label htmlFor="is_restricted">Donasi terbatas (untuk tujuan tertentu)</Label>
            </div>

            {donationForm.is_restricted && (
              <div className="space-y-2">
                <Label htmlFor="restricted_tag">Tag Restriksi *</Label>
                <Input
                  id="restricted_tag"
                  value={donationForm.restricted_tag || ""}
                  onChange={(e) => setDonationForm({ ...donationForm, restricted_tag: e.target.value || null })}
                  placeholder="Contoh: Dana Pembangunan, Bantuan Santri"
                />
              </div>
            )}
          </div>

          {/* Notes and Hajat Doa */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={donationForm.notes || ""}
                onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value || null })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hajat_doa">Hajat/Doa</Label>
              <Textarea
                id="hajat_doa"
                value={donationForm.hajat_doa || ""}
                onChange={(e) => setDonationForm({ ...donationForm, hajat_doa: e.target.value || null })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              <Check className="w-4 h-4 mr-2" />
              {loading ? 'Menyimpan...' : editingDonation ? 'Perbarui Donasi' : 'Simpan Donasi'}
            </Button>
          </DialogFooter>
        </form>

        {/* Donor Form Dialog */}
        <DonorFormDialog
          open={showDonorForm}
          onOpenChange={setShowDonorForm}
          onSuccess={handleDonorFormSuccess}
          editingDonor={null}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DonationFormDialog;


