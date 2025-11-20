import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  Heart, 
  Plus, 
  Search, 
  Filter,
  DollarSign, 
  Gift, 
  FileText,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Check,
  X,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Sparkles,
  Archive,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  donationHeaderSchema, 
  donationItemSchema,
  fullDonationSchema,
  isItemPerishable,
  type DonationHeader,
  type DonationItem,
  type FullDonation
} from "@/schemas/donasi.schema";
import DonasiReports from "@/components/DonasiReports";

// ================================================
// TYPES
// ================================================
interface Donation {
  id: string;
  donation_type: 'cash' | 'in_kind' | 'pledge';
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date: string;
  received_date?: string;
  cash_amount?: number;
  payment_method?: string;
  is_restricted: boolean;
  restricted_tag?: string;
  notes?: string;
  hajat_doa?: string;
  status: 'pending' | 'received' | 'posted' | 'cancelled';
  posted_to_stock_at?: string;
  posted_to_finance_at?: string;
  created_at: string;
  created_by?: string;
}

interface DonationItemDB {
  id: string;
  donation_id: string;
  raw_item_name: string;
  item_description?: string;
  quantity: number;
  uom: string;
  estimated_value?: number;
  expiry_date?: string;
  mapped_item_id?: string;
  mapping_status: 'unmapped' | 'suggested' | 'mapped' | 'new_item_created';
  suggested_item_id?: string;
  is_posted_to_stock: boolean;
  posted_at?: string;
  batch_id?: string;
  created_at: string;
}

interface InventarisItem {
  id: string;
  nama_barang: string;
  kategori: string;
  satuan?: string;
  tipe_item?: string;
}

interface ItemSuggestion {
  item_id: string;
  item_name: string;
  item_category: string;
  item_uom: string;
  similarity_score: number;
}

// ================================================
// HELPER FUNCTIONS
// ================================================
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// ================================================
// MAIN COMPONENT
// ================================================
const DonasiRefactored = () => {
  // State management
  const [activeTab, setActiveTab] = useState("masuk");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationItems, setDonationItems] = useState<DonationItemDB[]>([]);
  const [inventarisItems, setInventarisItems] = useState<InventarisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog states
  const [isNewDonationDialogOpen, setIsNewDonationDialogOpen] = useState(false);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [selectedItemForMapping, setSelectedItemForMapping] = useState<DonationItemDB | null>(null);

  // Form states
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

  // ================================================
  // DATA FETCHING
  // ================================================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDonations(),
        loadDonationItems(),
        loadInventarisItems()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const loadDonations = async () => {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setDonations(data || []);
  };

  const loadDonationItems = async () => {
    const { data, error } = await supabase
      .from('donation_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setDonationItems(data || []);
  };

  const loadInventarisItems = async () => {
    const { data, error } = await supabase
      .from('inventaris')
      .select('id, nama_barang, kategori, satuan, tipe_item')
      .order('nama_barang', { ascending: true });

    if (error) throw error;
    setInventarisItems(data || []);
  };

  // ================================================
  // FILTERED DATA
  // ================================================
  const filteredDonations = donations.filter(donation => {
    const matchesSearch = 
      donation.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.donor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || donation.donation_type === filterType;
    const matchesStatus = filterStatus === "all" || donation.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group donations by tab
  const pendingDonations = filteredDonations.filter(d => d.status === 'pending' || d.status === 'received');
  const unmappedInKindDonations = filteredDonations.filter(d => 
    d.donation_type === 'in_kind' && 
    d.status !== 'cancelled' &&
    !d.posted_to_stock_at
  );
  const completedDonations = filteredDonations.filter(d => d.status === 'posted' || d.status === 'cancelled');

  // ================================================
  // STATISTICS
  // ================================================
  const stats = {
    totalDonations: donations.length,
    totalCashAmount: donations
      .filter(d => d.donation_type === 'cash' && d.status !== 'cancelled')
      .reduce((sum, d) => sum + (d.cash_amount || 0), 0),
    pendingCount: donations.filter(d => d.status === 'pending').length,
    postedCount: donations.filter(d => d.status === 'posted').length,
    uniqueDonors: new Set(donations.map(d => d.donor_name)).size,
  };

  // ================================================
  // FORM HANDLERS
  // ================================================
  const handleAddItemRow = () => {
    setItemsForm([
      ...itemsForm,
      {
        raw_item_name: "",
        item_description: null,
        quantity: 1,
        uom: "pcs",
        estimated_value: 0,
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
    (newItems[index] as any)[field] = value;
    setItemsForm(newItems);

    // If raw_item_name changes, fetch suggestions
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

      setSuggestions({
        ...suggestions,
        [index]: data || []
      });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const applySuggestion = (index: number, suggestion: ItemSuggestion) => {
    const newItems = [...itemsForm];
    newItems[index].suggested_item_id = suggestion.item_id;
    newItems[index].mapping_status = "suggested";
    newItems[index].uom = suggestion.item_uom || newItems[index].uom;
    setItemsForm(newItems);
    toast.success(`Saran diterapkan: ${suggestion.item_name}`);
  };

  // ================================================
  // SUBMIT DONATION
  // ================================================
  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate
      const fullDonation: FullDonation = {
        header: donationForm,
        items: donationForm.donation_type === 'in_kind' ? itemsForm : []
      };

      const validation = fullDonationSchema.safeParse(fullDonation);
      if (!validation.success) {
        validation.error.errors.forEach(err => {
          toast.error(`${err.path.join('.')}: ${err.message}`);
        });
        return;
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Insert donation header
      const { data: donationData, error: donationError } = await supabase
        .from('donations')
        .insert([{
          ...donationForm,
          // Convert empty strings to null for optional date fields
          received_date: donationForm.received_date || null,
          // Convert empty strings to null for optional fields
          donor_email: donationForm.donor_email || null,
          donor_phone: donationForm.donor_phone || null,
          donor_address: donationForm.donor_address || null,
          payment_method: donationForm.payment_method || null,
          restricted_tag: donationForm.restricted_tag || null,
          notes: donationForm.notes || null,
          hajat_doa: donationForm.hajat_doa || null,
          created_by: userId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (donationError) throw donationError;

      // Insert items if in_kind
      if (donationForm.donation_type === 'in_kind' && itemsForm.length > 0) {
        const itemsToInsert = itemsForm.map(item => ({
          donation_id: donationData.id,
          raw_item_name: item.raw_item_name,
          item_description: item.item_description || null,
          quantity: item.quantity,
          uom: item.uom,
          estimated_value: item.estimated_value || null,
          expiry_date: item.expiry_date || null, // Convert empty string to null
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

      // Post to finance if cash and received
      if (donationForm.donation_type === 'cash' && donationForm.status === 'received') {
        await postToFinance(donationData.id);
      }

      toast.success("Donasi berhasil dicatat!");
      setIsNewDonationDialogOpen(false);
      resetForm();
      loadData();

    } catch (error) {
      console.error("Error submitting donation:", error);
      toast.error("Gagal mencatat donasi");
    }
  };

  // ================================================
  // POST TO FINANCE
  // ================================================
  const postToFinance = async (donationId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .rpc('post_donation_to_finance', {
          p_donation_id: donationId,
          p_user_id: userId
        });

      if (error) throw error;

      toast.success("Transaksi keuangan berhasil dicatat");
      return data;
    } catch (error) {
      console.error("Error posting to finance:", error);
      toast.error("Gagal mencatat ke keuangan");
    }
  };

  // ================================================
  // MAP ITEM
  // ================================================
  const handleMapItem = async (itemId: string, mappedItemId: string) => {
    try {
      const { error } = await supabase
        .from('donation_items')
        .update({
          mapped_item_id: mappedItemId,
          mapping_status: 'mapped',
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      toast.success("Item berhasil dipetakan");
      loadDonationItems();
    } catch (error) {
      console.error("Error mapping item:", error);
      toast.error("Gagal memetakan item");
    }
  };

  // ================================================
  // POST TO STOCK
  // ================================================
  const handlePostToStock = async (donationId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .rpc('post_donation_items_to_stock', {
          p_donation_id: donationId,
          p_default_location: 'Gudang Utama',
          p_user_id: userId
        });

      if (error) throw error;

      // Also post to finance for in_kind
      await postToFinance(donationId);

      toast.success(`${data.posted_count} item berhasil diterima ke gudang!`);
      if (data.error_count > 0) {
        toast.warning(`${data.error_count} item gagal diproses`);
      }

      loadData();
    } catch (error) {
      console.error("Error posting to stock:", error);
      toast.error("Gagal memposting ke gudang");
    }
  };

  // ================================================
  // RESET FORM
  // ================================================
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
      status: "received"
    });
    setItemsForm([]);
    setSuggestions({});
  };

  // ================================================
  // DELETE DONATION
  // ================================================
  const handleDeleteDonation = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus donasi ini?")) return;

    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Donasi berhasil dihapus");
      loadData();
    } catch (error) {
      console.error("Error deleting donation:", error);
      toast.error("Gagal menghapus donasi");
    }
  };

  // ================================================
  // RENDER: DONATION TYPE BADGE
  // ================================================
  const renderTypeBadge = (type: string) => {
    const colors = {
      cash: "bg-green-100 text-green-800 border-green-200",
      in_kind: "bg-blue-100 text-blue-800 border-blue-200",
      pledge: "bg-purple-100 text-purple-800 border-purple-200"
    };

    const labels = {
      cash: "Tunai",
      in_kind: "Barang",
      pledge: "Janji"
    };

    return (
      <Badge className={colors[type as keyof typeof colors]}>
        {labels[type as keyof typeof labels]}
      </Badge>
    );
  };

  // ================================================
  // RENDER: STATUS BADGE
  // ================================================
  const renderStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      received: "bg-blue-100 text-blue-800 border-blue-200",
      posted: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    };

    const labels = {
      pending: "Pending",
      received: "Diterima",
      posted: "Diposting",
      cancelled: "Dibatalkan"
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  // ================================================
  // RENDER: NEW DONATION DIALOG
  // ================================================
  const renderNewDonationDialog = () => (
    <Dialog open={isNewDonationDialogOpen} onOpenChange={setIsNewDonationDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Catat Donasi Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Donasi Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmitDonation} className="space-y-6">
          {/* Donation Type */}
          <div className="space-y-2">
            <Label>Tipe Donasi *</Label>
            <Select 
              value={donationForm.donation_type} 
              onValueChange={(value: any) => setDonationForm({ ...donationForm, donation_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai (Cash)</SelectItem>
                <SelectItem value="in_kind">Barang (In-Kind)</SelectItem>
                <SelectItem value="pledge">Janji (Pledge)</SelectItem>
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

          {/* Cash-specific fields */}
          {donationForm.donation_type === 'cash' && (
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
                    <SelectItem value="Check">Cek</SelectItem>
                    <SelectItem value="Credit Card">Kartu Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* In-kind items */}
          {donationForm.donation_type === 'in_kind' && (
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
                          placeholder="Contoh: Beras Premium"
                        />
                        {isItemPerishable(item.raw_item_name) && (
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
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Satuan *</Label>
                        <Input
                          value={item.uom}
                          onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                          required
                          placeholder="pcs, kg, liter"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nilai Taksir (Rp)</Label>
                        <Input
                          type="number"
                          value={item.estimated_value || 0}
                          onChange={(e) => handleItemChange(index, 'estimated_value', parseFloat(e.target.value))}
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

                    {/* Suggestions */}
                    {suggestions[index] && suggestions[index].length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Saran Pemetaan Item
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
            <Button type="button" variant="outline" onClick={() => setIsNewDonationDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit">
              <Check className="w-4 h-4 mr-2" />
              Simpan Donasi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  // ================================================
  // RENDER: TAB MASUK
  // ================================================
  const renderTabMasuk = () => (
    <div className="space-y-4">
      {pendingDonations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Tidak ada donasi masuk</p>
          </CardContent>
        </Card>
      ) : (
        pendingDonations.map((donation) => (
          <Card key={donation.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {donation.donation_type === 'cash' ? (
                        <DollarSign className="w-5 h-5 text-primary" />
                      ) : donation.donation_type === 'in_kind' ? (
                        <Gift className="w-5 h-5 text-primary" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{donation.donor_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(donation.donation_date)}
                      </div>
                    </div>
                  </div>

                  {donation.donor_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {donation.donor_email}
                    </div>
                  )}

                  {donation.donor_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {donation.donor_phone}
                    </div>
                  )}

                  {donation.hajat_doa && (
                    <p className="text-sm italic text-muted-foreground">
                      "{donation.hajat_doa}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {renderTypeBadge(donation.donation_type)}
                    {renderStatusBadge(donation.status)}
                    {donation.is_restricted && (
                      <Badge variant="outline" className="bg-orange-50">
                        Terbatas: {donation.restricted_tag}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-2">
                  {donation.donation_type === 'cash' && (
                    <div className="text-2xl font-bold text-green-600">
                      {formatRupiah(donation.cash_amount || 0)}
                    </div>
                  )}

                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteDonation(donation.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // ================================================
  // RENDER: TAB PEMETAAN & TERIMA
  // ================================================
  const renderTabMapping = () => (
    <div className="space-y-4">
      {unmappedInKindDonations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Tidak ada donasi barang yang perlu dipetakan</p>
          </CardContent>
        </Card>
      ) : (
        unmappedInKindDonations.map((donation) => {
          const items = donationItems.filter(item => item.donation_id === donation.id);
          const allMapped = items.every(item => item.mapping_status === 'mapped');
          const canPost = allMapped && items.length > 0;

          return (
            <Card key={donation.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{donation.donor_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(donation.donation_date)}
                    </p>
                  </div>
                  {canPost && (
                    <Button onClick={() => handlePostToStock(donation.id)} className="bg-green-600 hover:bg-green-700">
                      <Send className="w-4 h-4 mr-2" />
                      Terima ke Gudang
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Nilai Taksir</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status Pemetaan</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.raw_item_name}</p>
                            {item.item_description && (
                              <p className="text-xs text-muted-foreground">{item.item_description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.quantity} {item.uom}
                        </TableCell>
                        <TableCell>
                          {item.estimated_value ? formatRupiah(item.estimated_value) : '-'}
                        </TableCell>
                        <TableCell>
                          {item.expiry_date ? formatDate(item.expiry_date) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.mapping_status === 'mapped' ? 'default' : 'secondary'}>
                            {item.mapping_status === 'mapped' ? 'Dipetakan' : 'Belum'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.mapping_status !== 'mapped' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Petakan
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Petakan Item: {item.raw_item_name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Pilih Item Inventaris</Label>
                                    <Select onValueChange={(value) => handleMapItem(item.id, value)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Pilih item..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {inventarisItems.map((invItem) => (
                                          <SelectItem key={invItem.id} value={invItem.id}>
                                            {invItem.nama_barang} ({invItem.kategori})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Atau buat item baru di halaman Inventaris
                                  </p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  // ================================================
  // RENDER: TAB RIWAYAT
  // ================================================
  const renderTabHistory = () => (
    <div className="space-y-4">
      {completedDonations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Belum ada riwayat donasi</p>
          </CardContent>
        </Card>
      ) : (
        completedDonations.map((donation) => (
          <Card key={donation.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {donation.donation_type === 'cash' ? (
                        <DollarSign className="w-5 h-5 text-primary" />
                      ) : (
                        <Gift className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{donation.donor_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(donation.donation_date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {renderTypeBadge(donation.donation_type)}
                    {renderStatusBadge(donation.status)}
                    {donation.posted_to_stock_at && (
                      <Badge variant="outline" className="bg-green-50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Diposting ke Stok
                      </Badge>
                    )}
                    {donation.posted_to_finance_at && (
                      <Badge variant="outline" className="bg-blue-50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Diposting ke Keuangan
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {donation.donation_type === 'cash' && (
                    <div className="text-2xl font-bold text-green-600">
                      {formatRupiah(donation.cash_amount || 0)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // ================================================
  // MAIN RENDER
  // ================================================
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            Modul Donasi
          </h1>
          <p className="text-muted-foreground">
            Kelola donasi terintegrasi dengan Inventaris dan Keuangan
          </p>
        </div>
        {renderNewDonationDialog()}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Donasi</p>
                <p className="text-2xl font-bold">{stats.totalDonations}</p>
              </div>
              <Heart className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tunai</p>
                <p className="text-xl font-bold">{formatRupiah(stats.totalCashAmount)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Diposting</p>
                <p className="text-2xl font-bold text-green-600">{stats.postedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Donatur Unik</p>
                <p className="text-2xl font-bold">{stats.uniqueDonors}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari donatur, email, atau catatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Tipe Donasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="in_kind">Barang</SelectItem>
                <SelectItem value="pledge">Janji</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="received">Diterima</SelectItem>
                <SelectItem value="posted">Diposting</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="masuk">
            <TrendingUp className="w-4 h-4 mr-2" />
            Masuk ({pendingDonations.length})
          </TabsTrigger>
          <TabsTrigger value="pemetaan">
            <Package className="w-4 h-4 mr-2" />
            Pemetaan & Terima ({unmappedInKindDonations.length})
          </TabsTrigger>
          <TabsTrigger value="riwayat">
            <Archive className="w-4 h-4 mr-2" />
            Riwayat ({completedDonations.length})
          </TabsTrigger>
          <TabsTrigger value="laporan">
            <FileText className="w-4 h-4 mr-2" />
            Laporan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="masuk" className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </CardContent>
            </Card>
          ) : (
            renderTabMasuk()
          )}
        </TabsContent>

        <TabsContent value="pemetaan" className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </CardContent>
            </Card>
          ) : (
            renderTabMapping()
          )}
        </TabsContent>

        <TabsContent value="riwayat" className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
              </CardContent>
            </Card>
          ) : (
            renderTabHistory()
          )}
        </TabsContent>

        <TabsContent value="laporan" className="mt-6">
          <DonasiReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DonasiRefactored;

