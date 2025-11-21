import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  donationHeaderSchema, 
  donationItemSchema,
  fullDonationSchema,
  isItemPerishable,
  type DonationHeader,
  type DonationItem,
  type FullDonation
} from '@/schemas/donasi.schema';

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
    status: "received"
  });

  const [itemsForm, setItemsForm] = useState<DonationItem[]>([]);
  const [suggestions, setSuggestions] = useState<Record<number, ItemSuggestion[]>>({});
  const [inventarisItems, setInventarisItems] = useState<any[]>([]);
  const [akunKasList, setAkunKasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadInventarisItems();
      loadAkunKasList();
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
          akun_kas_id: editingDonation.akun_kas_id || null
        });
        
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
      akun_kas_id: null
    });
    setItemsForm([]);
    setSuggestions({});
    setValidationErrors({});
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
      const fullDonation: FullDonation = {
        header: donationForm,
        items: (donationForm.donation_type === 'in_kind' || donationForm.donation_type === 'mixed') ? itemsForm : []
      };

      const validated = fullDonationSchema.parse(fullDonation);

      if (editingDonation) {
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
          updated_at: new Date().toISOString()
        };

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
        // Validate akun_kas_id for cash/mixed donations
        if ((validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed') && !validated.header.akun_kas_id) {
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
          status: validated.header.status
        };

        // Only include akun_kas_id for cash/mixed donations
        if (validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed') {
          insertPayload.akun_kas_id = validated.header.akun_kas_id;
        }

        const { data: donationData, error: donationError } = await supabase
          .from('donations')
          .insert([insertPayload])
          .select()
          .single();

        if (donationError) throw donationError;

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
        // when donation_type = 'cash' and status = 'received'
        
        // Show success message with auto-posting info for cash donations
        if ((validated.header.donation_type === 'cash' || validated.header.donation_type === 'mixed') && validated.header.status === 'received') {
          toast.success("Donasi berhasil dicatat! Donasi tunai otomatis tercatat di modul keuangan.");
        } else {
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
          {/* Donation Type */}
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
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="in_kind">Barang</SelectItem>
                <SelectItem value="mixed">
                  <div className="flex flex-col">
                    <span className="font-medium">Campuran (Tunai + Barang)</span>
                    <span className="text-xs text-muted-foreground">Tunai dan barang sekaligus</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Donor Information */}
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
          
          {/* Donor Address */}
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

          {/* Cash-specific fields */}
          {(donationForm.donation_type === 'cash' || donationForm.donation_type === 'mixed') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_amount">Jumlah (Rp) *</Label>
                  <Input
                    id="cash_amount"
                    type="number"
                    value={donationForm.cash_amount || 0}
                    onChange={(e) => setDonationForm({ ...donationForm, cash_amount: parseFloat(e.target.value) })}
                    required
                  />
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
              <div className="space-y-2">
                <Label htmlFor="akun_kas_id">Akun Kas *</Label>
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
              </div>
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
            </div>
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
      </DialogContent>
    </Dialog>
  );
};

export default DonationFormDialog;

