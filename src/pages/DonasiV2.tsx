import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Heart, 
  Plus, 
  Search,
  DollarSign, 
  Package,
  UtensilsCrossed,
  Phone,
  MapPin,
  Printer,
  Send,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  FileDown,
  Filter,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";
import DonorBadge from "@/components/DonorBadge";

// ================================================
// TYPES
// ================================================
interface Donation {
  id: string;
  donation_type: 'cash' | 'in_kind' | 'pledge';
  donor_name: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date: string;
  cash_amount?: number;
  hajat_doa?: string;
  notes?: string;
  status: string;
  posted_to_stock_at?: string;
  posted_to_finance_at?: string;
  created_at: string;
}

interface DonationItem {
  id: string;
  donation_id: string;
  raw_item_name: string;
  quantity: number;
  uom: string;
  estimated_value?: number;
  mapping_status: string;
  is_posted_to_stock: boolean;
}

interface DonationWithItems extends Donation {
  items?: DonationItem[];
}

interface DonorProfile {
  id: string;
  donor_name: string;
  donor_tier: string;
  badges?: string[];
  total_cash_amount?: number;
  total_donations_count?: number;
  consecutive_months?: number;
  donor_status?: string;
  days_since_last_donation?: number;
  last_donation_date?: string;
}

// ================================================
// MAIN COMPONENT
// ================================================
export default function DonasiV2() {
  // Safe getter for environment variable to avoid runtime crashes
  const getOfficialAddress = () => {
    const fallback = 'Yayasan Pesantren Anak Yatim Al-Bisri • Jl. Gunung Anyar Lor II No.62, Gn. Anyar, Surabaya, Jawa Timur 60295 • Telp: 0851-0017-2617';
    try {
      // Vite exposes import.meta.env at runtime in browser
      // Guarded access to prevent undefined errors in non-standard runtimes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (import.meta as any)?.env;
      return env?.VITE_LETTERHEAD_ADDRESS || fallback;
    } catch {
      return fallback;
    }
  };

  const [activeTab, setActiveTab] = useState("hajat");
  const [donations, setDonations] = useState<DonationWithItems[]>([]);
  const [donorProfiles, setDonorProfiles] = useState<Map<string, DonorProfile>>(new Map());
  const [donorProfilesLoaded, setDonorProfilesLoaded] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [editingDonation, setEditingDonation] = useState<DonationWithItems | null>(null);
  const [deletingDonationId, setDeletingDonationId] = useState<string | null>(null);

  // ================================================
  // LOAD DATA
  // ================================================
  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    try {
      setLoading(true);
      
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('*')
        .order('donation_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (donationsError) throw donationsError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('donation_items')
        .select('*');

      if (itemsError) throw itemsError;

      const donationsWithItems = (donationsData || []).map(donation => ({
        ...donation,
        items: (itemsData || []).filter(item => item.donation_id === donation.id)
      }));

      setDonations(donationsWithItems);

      // Load donor profiles
      await loadDonorProfiles();
    } catch (error: any) {
      console.error('Error loading donations:', error);
      toast.error('Gagal memuat data donasi');
    } finally {
      setLoading(false);
    }
  };

  const loadDonorProfiles = async () => {
    try {
      // Check if table exists first by trying a simple query
      const { data, error } = await supabase
        .from('donor_profiles')
        .select('id')
        .limit(1);

      if (error) {
        // Table doesn't exist yet - migration not run
        if (error.code === 'PGRST205' || error.message?.includes('donor_profiles') || error.message?.includes('404')) {
          console.log('Donor profiles table not found - migration not run yet');
          setDonorProfilesLoaded(true);
          return;
        }
        console.error('Error loading donor profiles:', error);
        setDonorProfilesLoaded(true);
        return;
      }

      // If table exists, load full data
      const { data: fullData, error: fullError } = await supabase
        .from('donor_profiles')
        .select('*')
        .order('total_cash_amount', { ascending: false });

      if (fullError) {
        console.error('Error loading donor profiles:', fullError);
        setDonorProfilesLoaded(true);
        return;
      }

      const profilesMap = new Map<string, DonorProfile>();
      (fullData || []).forEach((profile: any) => {
        profilesMap.set(profile.donor_name, profile);
      });
      setDonorProfiles(profilesMap);
      setDonorProfilesLoaded(true);
    } catch (error: any) {
      // Handle 404 or table not found errors
      if (error.message?.includes('404') || error.message?.includes('donor_profiles')) {
        console.log('Donor profiles table not found - migration not run yet');
        setDonorProfilesLoaded(true);
        return;
      }
      console.error('Error loading donor profiles:', error);
      setDonorProfilesLoaded(true);
    }
  };

  // ================================================
  // CATEGORIZE ITEMS
  // ================================================
  const categorizeItem = (item: DonationItem): 'food' | 'goods' => {
    const foodKeywords = ['nasi', 'makanan', 'aqiqah', 'konsumsi', 'makan', 'lauk', 'ayam', 'sate', 'gulai'];
    const itemName = item.raw_item_name.toLowerCase();
    return foodKeywords.some(keyword => itemName.includes(keyword)) ? 'food' : 'goods';
  };

  // ================================================
  // FILTERED DATA
  // ================================================
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const hajatToday = donations.filter(d => 
    d.donation_date === todayStr && 
    d.hajat_doa && 
    d.hajat_doa.trim() !== ''
  );

  // Derive display text for donation line (includes infaq if any)
  const getDonationLine = (d: DonationWithItems) => {
    if (d.donation_type === 'cash') {
      return `Donasi Tunai: Rp ${d.cash_amount?.toLocaleString('id-ID')}`;
    }
    const itemText = d.items && d.items.length > 0
      ? `${d.items[0].raw_item_name} (${d.items[0].quantity} ${d.items[0].uom})`
      : 'Donasi Barang';
    const infaqText = d.cash_amount && d.cash_amount > 0
      ? ` • Infaq Rp ${d.cash_amount.toLocaleString('id-ID')}`
      : '';
    return itemText + infaqText;
  };

  const thisMonthDonations = donations.filter(d => {
    const donationDate = new Date(d.donation_date);
    return donationDate >= startOfMonth(today) && donationDate <= endOfMonth(today);
  });

  const stats = {
    todayCount: donations.filter(d => d.donation_date === todayStr).length,
    monthCount: thisMonthDonations.length,
    // Total pemasukan kas bulan ini: akumulasi semua cash_amount
    // termasuk infaq tunai yang menyertai donasi in-kind
    monthCash: thisMonthDonations
      .reduce((sum, d) => sum + (d.cash_amount || 0), 0),
    uniqueDonors: new Set(thisMonthDonations.map(d => d.donor_name)).size,
    hajatCount: hajatToday.length
  };


  // Filter donations by period
  const getFilteredByPeriod = () => {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return donations.filter(d => {
      const donationDate = new Date(d.donation_date);
      if (periodFilter === 'weekly') {
        return donationDate >= startOfWeek;
      } else if (periodFilter === 'monthly') {
        return donationDate >= startOfMonth;
      } else if (periodFilter === 'yearly') {
        return donationDate >= startOfYear;
      }
      return true;
    });
  };

  const periodFilteredDonations = getFilteredByPeriod();

  // Compute period-synchronized leaderboard from periodFilteredDonations
  type LeaderboardItem = { donor_name: string; total_cash: number; total_count: number };
  // Helper: same-day comparison (local date)
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Source donations for leaderboard depend on active tab
  const todayDonations = useMemo(() => {
    const now = new Date();
    return donations.filter((d) => isSameDay(new Date(d.donation_date), now));
  }, [donations]);

  const sourceDonations = activeTab === 'hajat' ? todayDonations : periodFilteredDonations;

  const periodLeaderboard = useMemo<LeaderboardItem[]>(() => {
    const map = new Map<string, LeaderboardItem>();
    for (const d of sourceDonations) {
      const key = d.donor_name || 'Tanpa Nama';
      const existing = map.get(key) || { donor_name: key, total_cash: 0, total_count: 0 };
      existing.total_cash += d.cash_amount ? Number(d.cash_amount) : 0;
      existing.total_count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total_cash - a.total_cash || b.total_count - a.total_count);
  }, [sourceDonations]);

  // Filtered donations based on search and category
  const filteredDonations = donations.filter(d => {
    // Search filter
    const matchesSearch = 
    d.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.donor_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.donor_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.hajat_doa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.items?.some(item => item.raw_item_name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Category filter
    let matchesCategory = true;
    if (filterCategory !== 'all') {
      if (filterCategory === 'cash') {
        matchesCategory = d.donation_type === 'cash';
      } else if (filterCategory === 'food') {
        matchesCategory = d.donation_type === 'in_kind' && 
          d.items?.some(item => categorizeItem(item) === 'food');
      } else if (filterCategory === 'goods') {
        matchesCategory = d.donation_type === 'in_kind' && 
          d.items?.some(item => categorizeItem(item) === 'goods');
      }
    }

    return matchesSearch && matchesCategory;
  });

  // ================================================
  // PRINT HAJAT
  // ================================================
  const handlePrintHajat = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Minimal elegant letterhead
    // Use provided online kop + local fallback
    const logoPrimary = 'https://ypayalbisri.wordpress.com/wp-content/uploads/2017/11/logo-al-bisri.jpg?w=600';
    const logoFallbackLocal = `${window.location.origin}/kop-albisri.png`;
    const logoSrc = logoPrimary;
    const officialAddress = getOfficialAddress();
    const addrWrappedHajat = officialAddress.replace('• Telp', '<br/>Telp');
    const letterhead = `
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px; border-bottom:1.5px solid #0f172a; padding-bottom:12px;">
        <img src="${logoSrc}" onerror="this.src='${logoFallbackLocal}'" alt="Logo" style="width:64px;height:64px;object-fit:contain;border-radius:8px;" />
        <div style="flex:1; text-align:center;">
          <div style="font-family:'Times New Roman',serif; font-weight:700; font-size:22px; letter-spacing:1px; color:#0f172a;">PESANTREN ANAK YATIM</div>
          <div style="font-family:'Times New Roman',serif; font-weight:700; font-size:28px; letter-spacing:3px; color:#b91c1c; margin-top:2px;">AL – BISRI</div>
          <div style="margin-top:4px; font-size:11px; color:#475569; max-width:92mm; margin-left:auto; margin-right:auto; white-space:normal; line-height:1.25;">${addrWrappedHajat}</div>
        </div>
      </div>`;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hajat Donatur - ${format(today, 'dd MMMM yyyy', { locale: localeId })}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-center; margin-bottom: 30px; }
          .header h1 { font-size: 24px; margin: 10px 0; }
          .date { color: #666; font-size: 14px; }
          .hajat-item { margin: 20px 0; padding: 15px; border-left: 3px solid #f59e0b; }
          .donor-name { font-weight: bold; font-size: 16px; }
          .donation-info { color: #666; font-size: 14px; margin: 5px 0; }
          .hajat { font-style: italic; margin-top: 8px; color: #333; }
          .footer { margin-top: 40px; text-align:center; color: #334155; font-size: 13px; }
        </style>
      </head>
      <body>
        ${letterhead}
        <div class="header" style="text-align:center;">
          <h2 style="margin:6px 0 0; font-size:18px; letter-spacing:1px;">HAJAT DONATUR</h2>
          <p class="date">${format(today, 'EEEE, dd MMMM yyyy', { locale: localeId })} • ${hajatToday.length} Hajat</p>
        </div>
        
        ${hajatToday.map((d, i) => `
          <div class="hajat-item">
            <div class="donor-name">${i + 1}. ${d.donor_name}</div>
            ${d.donor_address ? `<div class="donation-info">${d.donor_address}</div>` : ''}
            ${d.donor_phone ? `<div class="donation-info">${d.donor_phone}</div>` : ''}
            <div class="donation-info">${getDonationLine(d)}</div>
            <div class="hajat">${d.hajat_doa}</div>
          </div>
        `).join('')}
        
        <div class="footer">
          <p style="font-weight:600;">Satu kebaikan Anda hari ini menumbuhkan banyak harapan santri.</p>
          <p>Mari terus bersama menebar manfaat—dukungan rutin bulanan akan sangat membantu keberlangsungan program.</p>
          <p style="margin-top:10px; font-style:italic;">Bersama menjadi lentera menuju masa depan, dan hidup sesuai manhaj dan tuntunan Islam.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSendToWhatsApp = () => {
    const message = `*HAJAT DONATUR*\n${format(today, 'dd MMMM yyyy', { locale: localeId })}\n${hajatToday.length} Hajat\n\n${hajatToday.map((d, i) => {
      return `${i + 1}. ${d.donor_name}\n   ${getDonationLine(d)}\n   ${d.hajat_doa}`;
    }).join('\n\n')}\n\n_Jazakumullahu khairan_`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // ================================================
  // EXPORT TO CSV
  // ================================================
  const exportToCSV = () => {
    const headers = ['Tanggal', 'Nama Donatur', 'Nomor HP', 'Alamat', 'Kategori', 'Detail', 'Status'];
    
    const rows = filteredDonations.map(d => {
      let kategori = '';
      let detail = '';
      
      if (d.donation_type === 'cash') {
        kategori = 'Uang Tunai';
        detail = `Rp ${d.cash_amount?.toLocaleString('id-ID')}`;
      } else if (d.items && d.items.length > 0) {
        const item = d.items[0];
        const itemCategory = categorizeItem(item);
        kategori = itemCategory === 'food' ? 'Makanan Siap Saji' : 'Aset/Barang';
        detail = `${item.raw_item_name} (${item.quantity} ${item.uom})`;
      }

      return [
        format(new Date(d.donation_date), 'dd MMM yyyy', { locale: localeId }),
        d.donor_name,
        d.donor_phone || '-',
        d.donor_address || '-',
        kategori,
        detail,
        d.posted_to_finance_at ? 'Tercatat' : 'Pending'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `donasi-${filterCategory}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Data berhasil diekspor ke CSV');
  };

  // ================================================
  // EXPORT TO PDF
  // ================================================
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Laporan Riwayat Donasi', 14, 22);
    
    // Subtitle
    doc.setFontSize(11);
    doc.text(`Tanggal Ekspor: ${format(new Date(), 'dd MMMM yyyy', { locale: localeId })}`, 14, 30);
    doc.text(`Filter Kategori: ${
      filterCategory === 'all' ? 'Semua' : 
      filterCategory === 'cash' ? 'Uang Tunai' :
      filterCategory === 'food' ? 'Makanan Siap Saji' : 'Aset/Barang'
    }`, 14, 36);
    
    // Table
    const tableData = filteredDonations.map(d => {
      let kategori = '';
      let detail = '';
      
      if (d.donation_type === 'cash') {
        kategori = 'Uang Tunai';
        detail = `Rp ${d.cash_amount?.toLocaleString('id-ID')}`;
      } else if (d.items && d.items.length > 0) {
        const item = d.items[0];
        const itemCategory = categorizeItem(item);
        kategori = itemCategory === 'food' ? 'Makanan' : 'Aset';
        detail = `${item.raw_item_name} (${item.quantity} ${item.uom})`;
      }

      return [
        format(new Date(d.donation_date), 'dd MMM yyyy', { locale: localeId }),
        d.donor_name,
        d.donor_phone || '-',
        kategori,
        detail
      ];
    });

    (doc as any).autoTable({
      head: [['Tanggal', 'Donatur', 'HP', 'Kategori', 'Detail']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`donasi-${filterCategory}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Data berhasil diekspor ke PDF');
  };

  // ================================================
  // CRUD HANDLERS
  // ================================================
  const handleEdit = (donation: DonationWithItems) => {
    setEditingDonation(donation);
    setShowInputDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingDonationId) return;

    try {
      // Delete donation items first (cascade should handle this, but being explicit)
      await supabase
        .from('donation_items')
        .delete()
        .eq('donation_id', deletingDonationId);

      // Delete donation
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', deletingDonationId);

      if (error) throw error;

      toast.success('Donasi berhasil dihapus');
      loadDonations();
      setDeletingDonationId(null);
    } catch (error: any) {
      console.error('Error deleting donation:', error);
      toast.error('Gagal menghapus donasi: ' + error.message);
    }
  };

  const handlePrintNota = (donation: DonationWithItems) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const donationDetail = donation.donation_type === 'cash' 
      ? `Donasi Tunai: Rp ${donation.cash_amount?.toLocaleString('id-ID')}`
      : donation.items && donation.items.length > 0
        ? `${donation.items[0].raw_item_name} (${donation.items[0].quantity} ${donation.items[0].uom})`
        : 'Donasi Barang';

    const logoPrimary = 'https://ypayalbisri.wordpress.com/wp-content/uploads/2017/11/logo-al-bisri.jpg?w=600';
    const logoFallbackLocal = `${window.location.origin}/kop-albisri.png`;
    const logoSrc = logoPrimary;
    const officialAddress = (import.meta as any).env?.VITE_LETTERHEAD_ADDRESS || 'Yayasan Pesantren Anak Yatim Al-Bisri • Jl. Gunung Anyar Lor II No.62, Gn. Anyar, Kec. Gn. Anyar, Surabaya, Jawa Timur 60295 • Telp: 0851-0017-2617';
    const letterhead = `
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px; border-bottom:1.5px solid #0f172a; padding-bottom:12px;">
        <img src="${logoSrc}" onerror="this.src='${logoFallbackLocal}'" alt="Logo" style="width:64px;height:64px;object-fit:contain;border-radius:8px;" />
        <div style="flex:1; text-align:center;">
          <div style="font-family:'Times New Roman',serif; font-weight:700; font-size:22px; letter-spacing:1px; color:#0f172a;">PESANTREN ANAK YATIM</div>
          <div style="font-family:'Times New Roman',serif; font-weight:700; font-size:28px; letter-spacing:3px; color:#b91c1c; margin-top:2px;">AL – BISRI</div>
          <div style="margin-top:4px; font-size:11px; color:#475569;">${officialAddress}</div>
        </div>
      </div>`;

    const verifyUrl = `${window.location.origin}/verify/donation/${donation.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}`;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nota Donasi - Al-Bisri</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Poppins:wght@400;600;700&display=swap');
          @media print { @page { size: 148mm 105mm; margin: 6mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          :root { --blue:#1E3A8A; --red:#B91C1C; --muted:#94A3B8; --line:#E5E7EB; }
          body { font-family:'Poppins','Lato',Arial,sans-serif; width:148mm; height:105mm; margin:0; padding:8mm; position:relative; }
          .wm { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
          .wm img { width:55mm; opacity:.05; filter:grayscale(100%); }
          .row { display:flex; align-items:center; justify-content:space-between; }
          .logo { width:16mm; height:16mm; object-fit:contain; }
          .org { text-align:right; line-height:1.15; }
          .org .name { color:var(--blue); font-weight:700; font-size:11pt; letter-spacing:.4px; }
          .org .brand { color:var(--red); font-weight:800; font-size:13pt; letter-spacing:1.6px; }
          .org .addr { color:#475569; font-size:7.5pt; margin-top:2px; max-width:92mm; white-space:normal; line-height:1.2; }
          .title { text-align:center; margin:4px 0 8px; font-weight:700; color:#0f172a; font-size:10.5pt; }
          .sep { height:1px; background:var(--line); margin:4px 0 8px; }
          .meta { display:flex; justify-content:space-between; font-size:8.5pt; color:#334155; margin-bottom:6px; }
          .grid { display:grid; grid-template-columns: 28mm auto; gap:5px 10px; font-size:9pt; }
          .label { color:#475569; }
          .value { color:#0f172a; font-weight:600; }
          .thanks { margin-top:8px; font-size:8.5pt; color:#0f172a; line-height:1.35; }
          .qr { position:absolute; right:8mm; bottom:8mm; width:14mm; height:14mm; }
          .legal { position:absolute; left:8mm; bottom:6.5mm; font-size:7pt; color:#64748b; max-width:90mm; }
        </style>
      </head>
      <body>
        <div class="wm"><img src="${logoSrc}" alt="wm" /></div>

        <div class="row">
          <img class="logo" src="${logoSrc}" alt="Logo" onerror="this.src='${logoFallbackLocal}'" />
          <div class="org">
            <div class="name">PESANTREN ANAK YATIM</div>
            <div class="brand">“ AL – BISRI ”</div>
            <div class="addr">${officialAddress.replace('• Telp', '<br/>Telp')}</div>
          </div>
        </div>
        <div class="title">NOTA DONASI</div>
        <div class="sep"></div>

        <div class="meta">
          <div>No: ${donation.id.substring(0, 8).toUpperCase()}/DON/${format(new Date(donation.donation_date), 'MM/yy')}</div>
          <div>Tanggal: ${format(new Date(donation.donation_date), 'dd MMM yyyy', { locale: localeId })}</div>
        </div>

        <div class="grid">
          <div class="label">Nama Donatur</div>
          <div class="value">${donation.donor_name}</div>
          <div class="label">Jenis/Nominal</div>
          <div class="value">${donationDetail}</div>
          <div class="label">Keterangan</div>
          <div class="value">${donation.notes ? donation.notes : '-'}</div>
        </div>

        <div class="thanks">“Terima kasih atas donasi dan dukungan yang telah Bapak/Ibu berikan. Setiap rupiah yang Anda titipkan adalah cahaya ilmu dan kebahagiaan bagi anak-anak yatim kami. Semoga Allah SWT membalas dengan keberkahan, kesehatan, dan kelimpahan rezeki yang berlipat ganda.”</div>

        <img class="qr" src="${qrUrl}" alt="QR" />
        <div class="legal">
          Dokumen ini dicetak secara elektronik dan sah tanpa tanda tangan basah. Verifikasi: ${verifyUrl}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // ================================================
  // RENDER
  // ================================================
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            Donasi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pengelolaan donasi & hajat donatur
          </p>
        </div>
        
        <Button onClick={() => setShowInputDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Catat Donasi
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Donasi Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.monthCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.uniqueDonors} donatur unik</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Pemasukan Kas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {(stats.monthCash / 1000000).toFixed(1)}jt
            </div>
            <p className="text-xs text-muted-foreground mt-1">Donasi tunai bulan ini</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Hajat Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.hajatCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Untuk doa maghrib</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Kategori Donasi Analysis */}
        <Card className="border-border bg-gradient-card">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Analisis Kategori Donasi
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {periodFilter === 'weekly' && 'Minggu ini'}
                  {periodFilter === 'monthly' && 'Bulan ini'}
                  {periodFilter === 'yearly' && 'Tahun ini'}
                </p>
              </div>
              <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="yearly">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Cash Donations */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Uang Tunai</p>
                    <p className="text-xs text-gray-500">Donasi cash</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-700">
                    {periodFilteredDonations.filter(d => d.donation_type === 'cash').length}
                  </p>
                  <p className="text-xs text-green-600">donasi</p>
                </div>
              </div>

              {/* In-Kind Donations */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Barang</p>
                    <p className="text-xs text-gray-500">Donasi in-kind</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-700">
                    {periodFilteredDonations.filter(d => d.donation_type === 'in_kind').length}
                  </p>
                  <p className="text-xs text-blue-600">donasi</p>
                </div>
              </div>

              {/* Food Donations */}
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded">
                    <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Makanan</p>
                    <p className="text-xs text-gray-500">Konsumsi santri</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-700">
                    {periodFilteredDonations.filter(d => d.items?.some(item => item.raw_item_name?.toLowerCase().includes('nasi') || item.raw_item_name?.toLowerCase().includes('makanan') || item.raw_item_name?.toLowerCase().includes('makan'))).length}
                  </p>
                  <p className="text-xs text-orange-600">donasi</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Top Donors List with Scroll */}
        <Card className="border-border bg-gradient-card">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Daftar Donatur Terbaik
            </CardTitle>
            <p className="text-sm text-muted-foreground">Berdasarkan total kontribusi</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px] overflow-y-auto pr-2 space-y-3">
              {periodLeaderboard.length > 0 ? (
                periodLeaderboard
                  .map((lb, index) => (
                    <div key={lb.donor_name + index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                            <span className="text-xs font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{lb.donor_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {lb.total_count} donasi
                            </p>
                            <p className="text-sm font-bold text-green-600 mt-1">
                              Rp {lb.total_cash.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                        {/* Tier ditampilkan jika data donor_profiles tersedia dan sesuai nama */}
                        {/* Opsional: bisa dihubungkan dengan donor_profiles map jika ingin menampilkan badge */}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada data donatur</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data akan muncul setelah ada donasi yang tercatat
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hajat">
            Hajat Hari Ini
            {stats.hajatCount > 0 && (
              <Badge variant="secondary" className="ml-2">{stats.hajatCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Donasi</TabsTrigger>
        </TabsList>

        {/* Tab: Hajat Hari Ini */}
        <TabsContent value="hajat" className="mt-4">
          <Card className="border-border bg-gradient-card">
            <CardHeader className="border-b">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle>Hajat untuk Doa Maghrib</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(today, 'EEEE, dd MMMM yyyy', { locale: localeId })}
                  </p>
                </div>
                {hajatToday.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrintHajat}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSendToWhatsApp}>
                      <Send className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {hajatToday.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-muted mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada hajat untuk hari ini</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowInputDialog(true)}
                  >
                    Catat Donasi dengan Hajat
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {hajatToday.map((donation, index) => (
                    <Card key={donation.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                           <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">
                              {donation.donor_name}
                            </h3>
                            {donation.donor_address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {donation.donor_address}
                              </p>
                            )}
                            {donation.donor_phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {donation.donor_phone}
                              </p>
                            )}

                            <div className="text-sm font-medium mt-2">
                              {donation.donation_type === 'cash' ? (
                                <span className="text-green-600">
                                  Rp {donation.cash_amount?.toLocaleString('id-ID')}
                                </span>
                              ) : (
                                <span className="text-blue-600">
                                  {getDonationLine(donation)}
                                </span>
                              )}
                            </div>

                             <div className="bg-blue-50 p-2 rounded border border-blue-100 mt-2">
                               <p className="text-xs font-medium text-blue-900 mb-1">
                                 Hajat / Doa:
                               </p>
                              <p className="text-sm text-foreground italic">
                                {donation.hajat_doa}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 text-xs"
                              onClick={() => handlePrintNota(donation)}
                            >
                              <Printer className="w-3 h-3 mr-1" />
                              Print Nota
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Riwayat */}
        <TabsContent value="riwayat" className="mt-4">
          <Card className="border-border bg-gradient-card">
            <CardHeader className="border-b">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <CardTitle>Daftar Riwayat Donasi</CardTitle>
                <div className="flex flex-col lg:flex-row gap-2">
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                      placeholder="Cari donatur, hp, alamat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full lg:w-48">
                      <SelectValue placeholder="Filter Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      <SelectItem value="cash">Uang Tunai</SelectItem>
                      <SelectItem value="food">Makanan Siap Saji</SelectItem>
                      <SelectItem value="goods">Aset/Barang</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Ekspor
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportToCSV}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Download CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToPDF}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredDonations.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-muted mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterCategory !== 'all' ? "Tidak ada hasil pencarian" : "Belum ada data donasi"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[120px]">Tanggal</TableHead>
                        <TableHead>Nama Donatur</TableHead>
                        <TableHead>Nomor HP</TableHead>
                        <TableHead>Alamat</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center w-[100px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDonations.map((donation) => {
                        let kategori = '';
                        let kategoriColor = '';
                        
                        if (donation.donation_type === 'cash') {
                          kategori = 'Uang Tunai';
                          kategoriColor = 'bg-green-100 text-green-800 border-green-200';
                        } else if (donation.items && donation.items.length > 0) {
                          const itemCategory = categorizeItem(donation.items[0]);
                          if (itemCategory === 'food') {
                            kategori = 'Makanan Siap Saji';
                            kategoriColor = 'bg-orange-100 text-orange-800 border-orange-200';
                          } else {
                            kategori = 'Aset/Barang';
                            kategoriColor = 'bg-blue-100 text-blue-800 border-blue-200';
                          }
                        }

                        return (
                          <TableRow key={donation.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(donation.donation_date), 'dd MMM yyyy', { locale: localeId })}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="font-semibold text-foreground">{donation.donor_name}</div>
                                 {donorProfilesLoaded && donorProfiles && donorProfiles.has(donation.donor_name) && (
                                   <DonorBadge 
                                     profile={donorProfiles.get(donation.donor_name)} 
                                     showTier={true}
                                     showBadges={false}
                                     compact={true}
                                   />
                                 )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {donation.donor_phone ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                {donation.donor_phone}
                              </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-xs">
                              {donation.donor_address ? (
                                <div className="flex items-start gap-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{donation.donor_address}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={kategoriColor}>
                                {kategori}
                            </Badge>
                            </TableCell>
                            <TableCell>
                            {donation.donation_type === 'cash' ? (
                              <div className="font-semibold text-green-600">
                                Rp {donation.cash_amount?.toLocaleString('id-ID')}
                              </div>
                            ) : donation.items && donation.items.length > 0 ? (
                              <div>
                                <div className="font-medium text-foreground">{donation.items[0].raw_item_name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {donation.items[0].quantity} {donation.items[0].uom}
                                </div>
                                {/* Tampilkan infaq tambahan jika ada */}
                                {donation.cash_amount && donation.cash_amount > 0 && (
                                  <div className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    + Infaq Rp {donation.cash_amount.toLocaleString('id-ID')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                            </TableCell>
                            <TableCell>
                            <div className="flex flex-col gap-1 items-center">
                              {/* Badge untuk cash donation ATAU infaq tambahan */}
                              {((donation.donation_type === 'cash' || donation.cash_amount) && donation.posted_to_finance_at) && (
                                <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {donation.donation_type === 'cash' ? 'Kas Masuk' : 'Infaq Masuk Kas'}
                                </Badge>
                              )}
                              {donation.posted_to_stock_at && (
                                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                  <Package className="w-3 h-3 mr-1" />
                                  Masuk Gudang
                                </Badge>
                              )}
                              {donation.donation_type === 'in_kind' && !donation.posted_to_stock_at && (
                                <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
                                  <UtensilsCrossed className="w-3 h-3 mr-1" />
                                  Langsung Habis
                                </Badge>
                              )}
                            </div>
                            </TableCell>
                            <TableCell>
                            <div className="flex items-center justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Buka menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handlePrintNota(donation)}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Nota
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEdit(donation)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Donasi
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => setDeletingDonationId(donation.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Hapus Donasi
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            </TableCell>
                          </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                  </div>
              )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Input Dialog */}
      <QuickDonationDialog
        open={showInputDialog}
        onOpenChange={(open) => {
          setShowInputDialog(open);
          if (!open) setEditingDonation(null);
        }}
        editingDonation={editingDonation}
        onSuccess={() => {
          loadDonations();
          // Reload donor profiles after a short delay to allow trigger to process
          setTimeout(() => {
            loadDonorProfiles();
          }, 1500);
          setShowInputDialog(false);
          setEditingDonation(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDonationId} onOpenChange={() => setDeletingDonationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Donasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Donasi dan semua data terkait akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ================================================
// QUICK DONATION DIALOG COMPONENT
// ================================================
interface QuickDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingDonation?: DonationWithItems | null;
}

function QuickDonationDialog({ open, onOpenChange, onSuccess, editingDonation }: QuickDonationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tipe, setTipe] = useState<'tunai' | 'konsumsi' | 'barang'>('tunai');
  const [showInventorySuggestions, setShowInventorySuggestions] = useState(false);
  const [inventorySuggestions, setInventorySuggestions] = useState<any[]>([]);
  // Program donasi (routing kas otomatis) - lokal di dialog
  const [programCode, setProgramCode] = useState<'umum' | 'pembangunan'>('umum');
  const [routedAccountName, setRoutedAccountName] = useState<string>('');
  const [formData, setFormData] = useState({
    tanggal: format(new Date(), 'yyyy-MM-dd'),
    nama_donatur: '',
    telepon: '',
    alamat: '',
    jumlah_uang: '',
    nama_barang: '',
    qty: '',
    satuan: 'porsi', // default untuk konsumsi
    nilai_estimasi: '',
    infaq_tambahan: '', // infaq tunai yang diberikan bersamaan dengan barang
    hajat: '',
    catatan: '',
    aksi: 'langsung_habis' as 'masuk_gudang' | 'langsung_habis'
  });

  // Load editing data when dialog opens
  useEffect(() => {
    if (editingDonation && open) {
      const item = editingDonation.items && editingDonation.items.length > 0 ? editingDonation.items[0] : null;
      
      setFormData({
        tanggal: editingDonation.donation_date,
        nama_donatur: editingDonation.donor_name,
        telepon: editingDonation.donor_phone || '',
        alamat: editingDonation.donor_address || '',
        jumlah_uang: editingDonation.cash_amount?.toString() || '',
        nama_barang: item?.raw_item_name || '',
        qty: item?.quantity.toString() || '',
        satuan: item?.uom || 'porsi',
        nilai_estimasi: item?.estimated_value?.toString() || '',
        infaq_tambahan: '',
        hajat: editingDonation.hajat_doa || '',
        catatan: editingDonation.notes || '',
        aksi: editingDonation.posted_to_stock_at ? 'masuk_gudang' : 'langsung_habis'
      });

      if (editingDonation.donation_type === 'cash') {
        setTipe('tunai');
      } else if (item && (item.raw_item_name.toLowerCase().includes('nasi') || item.raw_item_name.toLowerCase().includes('makanan') || item.raw_item_name.toLowerCase().includes('aqiqah'))) {
        setTipe('konsumsi');
      } else {
        setTipe('barang');
      }
    } else if (!open) {
      // Reset when dialog closes
      setFormData({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        nama_donatur: '',
        telepon: '',
        alamat: '',
        jumlah_uang: '',
        nama_barang: '',
        qty: '',
        satuan: 'porsi',
        nilai_estimasi: '',
        infaq_tambahan: '',
        hajat: '',
        catatan: '',
        aksi: 'langsung_habis'
      });
      setTipe('tunai');
    }
  }, [editingDonation, open]);

  // Ambil nama akun tujuan berdasarkan program (Umum → Operasional, Pembangunan → Pembangunan)
  useEffect(() => {
    const fetchRoutedAccount = async () => {
      try {
        const { data: mapData } = await supabase
          .from('program_to_account_map')
          .select('program_code, akun_kas_id, is_default');
        const target = (mapData || []).find((m: any) => m.program_code === programCode) ||
          (mapData || []).find((m: any) => m.is_default);
        if (target?.akun_kas_id) {
          const { data: akun } = await supabase
            .from('akun_kas')
            .select('nama')
            .eq('id', target.akun_kas_id)
            .single();
          setRoutedAccountName(akun?.nama || '');
        } else {
          setRoutedAccountName('');
        }
      } catch (e) {
        setRoutedAccountName('');
      }
    };
    fetchRoutedAccount();
  }, [programCode]);

  // Close inventory suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.inventory-suggestions-container')) {
        setShowInventorySuggestions(false);
      }
    };

    if (showInventorySuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showInventorySuggestions]);

  const searchInventory = async (query: string) => {
    if (query.length < 2) {
      setInventorySuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventaris')
        .select('id, nama_barang, jumlah, kategori')
        .ilike('nama_barang', `%${query}%`)
        .limit(5);

      if (error) {
        console.error('Error searching inventory:', error);
        return;
      }

      setInventorySuggestions(data || []);
    } catch (error) {
      console.error('Error searching inventory:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama_donatur.trim()) {
      toast.error('Nama donatur harus diisi');
      return;
    }

    if (tipe === 'tunai' && (!formData.jumlah_uang || parseFloat(formData.jumlah_uang) <= 0)) {
      toast.error('Jumlah uang harus lebih dari 0');
      return;
    }

    if ((tipe === 'konsumsi' || tipe === 'barang') && !formData.nama_barang.trim()) {
      toast.error('Nama barang/makanan harus diisi');
      return;
    }

    if ((tipe === 'konsumsi' || tipe === 'barang') && (!formData.qty || parseFloat(formData.qty) <= 0)) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let donation;

      if (editingDonation) {
        // UPDATE existing donation
        const { data: updatedDonation, error: updateError } = await supabase
          .from('donations')
          .update({
            donor_name: formData.nama_donatur,
          donor_phone: formData.telepon || null,
          donor_address: formData.alamat || null,
          donation_date: formData.tanggal,
          cash_amount: tipe === 'tunai' 
            ? parseFloat(formData.jumlah_uang) 
            : formData.infaq_tambahan && parseFloat(formData.infaq_tambahan) > 0
              ? parseFloat(formData.infaq_tambahan)
              : null,
          hajat_doa: formData.hajat || null,
          notes: formData.catatan || null,
          updated_by: user?.id
          })
          .eq('id', editingDonation.id)
          .select()
          .single();

        if (updateError) throw updateError;
        donation = updatedDonation;

        // Update items if in_kind
        if (tipe !== 'tunai' && editingDonation.items && editingDonation.items.length > 0) {
          const estimatedValue = formData.nilai_estimasi ? parseFloat(formData.nilai_estimasi) : 0;
          await supabase
            .from('donation_items')
            .update({
              raw_item_name: formData.nama_barang,
              quantity: parseFloat(formData.qty),
              uom: formData.satuan,
              estimated_value: estimatedValue
            })
            .eq('id', editingDonation.items[0].id);
        }

        toast.success('✅ Donasi berhasil diupdate');
      } else {
        // NEW donation
        if (tipe === 'tunai') {
          // CASH: Hindari insert langsung (mencegah duplikasi). Gunakan RPC dengan external_ref unik.
          const externalRef = (crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : `don-${Date.now()}-${Math.random()}`;
          const amount = parseFloat(formData.jumlah_uang);
          const { error: postErr } = await supabase.rpc('post_donation', {
            p_external_ref: externalRef,
            p_tanggal: formData.tanggal,
            p_donor_name: formData.nama_donatur,
            p_amount: amount,
            p_program_code: programCode,
            p_notes: formData.catatan || null
          });
          if (postErr) throw postErr;
          toast.success('✅ Donasi tunai tersimpan & tercatat di Keuangan');
        } else {
          // IN-KIND: Insert staging donation seperti sebelumnya
        const { data: newDonation, error: donationError } = await supabase
          .from('donations')
          .insert({
              donation_type: 'in_kind',
            donor_name: formData.nama_donatur,
            donor_phone: formData.telepon || null,
            donor_address: formData.alamat || null,
          donation_date: formData.tanggal,
          received_date: formData.tanggal,
              cash_amount: (formData.infaq_tambahan && parseFloat(formData.infaq_tambahan) > 0) ? parseFloat(formData.infaq_tambahan) : null,
              payment_method: formData.infaq_tambahan ? 'Cash' : null,
          hajat_doa: formData.hajat || null,
              notes: formData.catatan || null,
          status: 'received',
          created_by: user?.id
          })
          .select()
          .single();

        if (donationError) throw donationError;
        donation = newDonation;
        // Save item for konsumsi/barang
        const estimatedValue = formData.nilai_estimasi ? parseFloat(formData.nilai_estimasi) : 0;
        
        const { data: item, error: itemError } = await supabase
          .from('donation_items')
          .insert({
            donation_id: donation.id,
            raw_item_name: formData.nama_barang,
            quantity: parseFloat(formData.qty),
            uom: formData.satuan,
            estimated_value: estimatedValue,
            mapping_status: 'unmapped'
          })
          .select()
          .single();

        if (itemError) throw itemError;

        if (tipe === 'barang' && formData.aksi === 'masuk_gudang') {
          // Auto-map or create item in inventaris
          const mappedItemId = await autoMapOrCreateItem(
            formData.nama_barang,
            formData.satuan
          );

          // Update mapping
          await supabase
            .from('donation_items')
            .update({
              mapped_item_id: mappedItemId,
              mapping_status: 'mapped'
            })
            .eq('id', item.id);

          // Post to stock
          await supabase.rpc('post_donation_items_to_stock', {
            p_donation_id: donation.id,
            p_default_location: 'Gudang Utama',
            p_user_id: user?.id
          });

          toast.success('✅ Barang masuk gudang & tercatat di Inventaris');
        } else {
          // Langsung habis (konsumsi atau barang langsung habis)
          toast.success(`✅ Donasi ${tipe} tersimpan`);
        }

        // Handle infaq tambahan - post to finance
        // Infaq sudah tersimpan di cash_amount, tinggal post ke finance
        if (formData.infaq_tambahan && parseFloat(formData.infaq_tambahan) > 0) {
          const infaq = parseFloat(formData.infaq_tambahan);
          const { error: postErr2 } = await supabase.rpc('post_donation', {
            p_external_ref: donation.id || null,
            p_tanggal: formData.tanggal,
            p_donor_name: formData.nama_donatur,
            p_amount: infaq,
            p_program_code: programCode,
            p_notes: (formData.catatan || '') + ' [Infaq tambahan]'
          });
          if (postErr2) {
            console.error('Error posting infaq to finance:', postErr2);
            toast.error('⚠️ Infaq tambahan gagal tercatat di Keuangan');
          } else {
            toast.success('💰 Infaq tambahan Rp ' + infaq.toLocaleString('id-ID') + ' tercatat di Keuangan');
          }
        }
        }
      } // end if editingDonation

      // Reset form
      setFormData({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        nama_donatur: '',
        telepon: '',
        alamat: '',
        jumlah_uang: '',
        nama_barang: '',
        qty: '',
        satuan: 'porsi',
        nilai_estimasi: '',
        infaq_tambahan: '',
        hajat: '',
        catatan: '',
        aksi: 'langsung_habis'
      });
      setTipe('tunai');

      onSuccess(); // This will trigger reload in parent component
    } catch (error: any) {
      console.error('Error saving donation:', error);
      toast.error('Gagal menyimpan donasi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  async function autoMapOrCreateItem(namaBarang: string, satuan: string): Promise<string> {
    const { data: existing } = await supabase
      .from('inventaris')
      .select('id')
      .ilike('nama_barang', `%${namaBarang}%`)
      .limit(1)
      .single();

    if (existing) {
      return existing.id;
    }

    const { data: newItem, error } = await supabase
      .from('inventaris')
      .insert({
        nama_barang: namaBarang,
        kategori: 'Sembako',
        satuan: satuan,
        tipe_item: 'Komoditas', // Aset atau Komoditas (bukan Habis Pakai)
        min_stock: 10,
        zona: 'Gedung Putra', // Gedung Putra, Gedung Putri, atau Area luar
        lokasi: 'Gudang Utama',
        kondisi: 'Baik',
        jumlah: 0
      })
      .select('id')
      .single();

    if (error) throw error;
    return newItem.id;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDonation ? 'Edit Donasi' : 'Catat Donasi Baru'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tanggal & Donatur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tanggal *</Label>
              <Input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nama Donatur *</Label>
              <Input
                value={formData.nama_donatur}
                onChange={(e) => setFormData({ ...formData, nama_donatur: e.target.value })}
                placeholder="Contoh: Ibu Siti"
                required
              />
            </div>
          </div>

          {/* Program Donasi & Akun Kas (Hasil Routing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Program Donasi</Label>
              <select
                className="border rounded-md h-10 px-3"
                value={programCode}
                onChange={(e) => setProgramCode(e.target.value as any)}
              >
                <option value="umum">Umum (Operasional)</option>
                <option value="pembangunan">Pembangunan</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Akun Kas (Hasil Routing)</Label>
              <Input
                value={routedAccountName || 'Menentukan otomatis...'}
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">No. Telepon</Label>
              <Input
                value={formData.telepon}
                onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                placeholder="0812-xxxx-xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Alamat</Label>
              <Input
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                placeholder="Jl. Merdeka No. 10"
              />
            </div>
          </div>

          <div className="border-t pt-4"></div>

          {/* Tipe Donasi */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipe Donasi *</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={tipe === 'tunai' ? 'default' : 'outline'}
                onClick={() => setTipe('tunai')}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Tunai</span>
              </Button>
              <Button
                type="button"
                variant={tipe === 'konsumsi' ? 'default' : 'outline'}
                onClick={() => {
                  setTipe('konsumsi');
                  setFormData({ ...formData, satuan: 'porsi' });
                }}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <UtensilsCrossed className="w-5 h-5" />
                <span className="text-sm font-medium">Konsumsi</span>
              </Button>
              <Button
                type="button"
                variant={tipe === 'barang' ? 'default' : 'outline'}
                onClick={() => {
                  setTipe('barang');
                  setFormData({ ...formData, satuan: 'kg' });
                }}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <Package className="w-5 h-5" />
                <span className="text-sm font-medium">Barang</span>
              </Button>
            </div>
          </div>

          {/* Conditional Fields */}
          {tipe === 'tunai' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Jumlah (Rp) *</Label>
              <Input
                type="number"
                value={formData.jumlah_uang}
                onChange={(e) => setFormData({ ...formData, jumlah_uang: e.target.value })}
                placeholder="500000"
                required
              />
            </div>
          )}

          {tipe === 'konsumsi' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Jenis Makanan *</Label>
                <Input
                  value={formData.nama_barang}
                  onChange={(e) => setFormData({ ...formData, nama_barang: e.target.value })}
                  placeholder="Nasi bungkus, aqiqah, dll"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Jumlah *</Label>
                  <Input
                    type="number"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    placeholder="100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Satuan *</Label>
                  <Select
                    value={formData.satuan}
                    onValueChange={(value) => setFormData({ ...formData, satuan: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="porsi">Porsi</SelectItem>
                      <SelectItem value="dus">Dus</SelectItem>
                      <SelectItem value="kotak">Kotak</SelectItem>
                      <SelectItem value="bungkus">Bungkus</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nilai Estimasi per {formData.satuan || 'unit'} (Rp)</Label>
                <Input
                  type="number"
                  value={formData.nilai_estimasi}
                  onChange={(e) => setFormData({ ...formData, nilai_estimasi: e.target.value })}
                  placeholder="15000"
                />
              </div>
              
              {/* Infaq Tambahan untuk Konsumsi */}
              <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Infaq/Sedekah Tunai Tambahan
                  <span className="text-xs text-muted-foreground font-normal">(opsional)</span>
                </Label>
                <Input
                  type="number"
                  value={formData.infaq_tambahan}
                  onChange={(e) => setFormData({ ...formData, infaq_tambahan: e.target.value })}
                  placeholder="Jika donatur juga memberikan uang tunai"
                />
                <p className="text-xs text-green-700">
                  Jika donatur memberikan barang + uang tunai sekaligus
                </p>
              </div>
            </div>
          )}

          {tipe === 'barang' && (
            <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nama Barang *</Label>
                  <div className="relative inventory-suggestions-container">
                    <Input
                      value={formData.nama_barang}
                      onChange={(e) => {
                        setFormData({ ...formData, nama_barang: e.target.value });
                        setShowInventorySuggestions(e.target.value.length > 0);
                        searchInventory(e.target.value);
                      }}
                      placeholder="Cari atau ketik nama barang..."
                      required
                    />
                    {showInventorySuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {inventorySuggestions.length > 0 ? (
                          inventorySuggestions.map((item) => (
                            <div
                              key={item.id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => {
                                setFormData({ 
                                  ...formData, 
                                  nama_barang: item.nama_barang,
                                  satuan: item.kategori || 'pcs'
                                });
                                setShowInventorySuggestions(false);
                              }}
                            >
                              <div className="font-medium">{item.nama_barang}</div>
                              <div className="text-xs text-gray-500">
                                Stok: {item.jumlah} {item.kategori}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            Tidak ada item yang cocok. Ketik untuk menambah item baru.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Jumlah *</Label>
                  <Input
                    type="number"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    placeholder="50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Satuan *</Label>
                  <Select
                    value={formData.satuan}
                    onValueChange={(value) => setFormData({ ...formData, satuan: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kg (Kilogram)</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="pcs">Pcs (Pieces)</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="karung">Karung</SelectItem>
                      <SelectItem value="dus">Dus</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="lusin">Lusin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nilai Estimasi Total (Rp)</Label>
                <Input
                  type="number"
                  value={formData.nilai_estimasi}
                  onChange={(e) => setFormData({ ...formData, nilai_estimasi: e.target.value })}
                  placeholder="500000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Aksi *</Label>
                <Select
                  value={formData.aksi}
                  onValueChange={(value: any) => setFormData({ ...formData, aksi: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masuk_gudang">Masuk Gudang (dicatat di inventaris)</SelectItem>
                    <SelectItem value="langsung_habis">Langsung Habis (tidak ke inventaris)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pilih "Masuk Gudang" untuk barang yang akan disimpan, atau "Langsung Habis" untuk barang yang langsung digunakan.
                </p>
              </div>

              {/* Infaq Tambahan untuk Barang */}
              <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Infaq/Sedekah Tunai Tambahan
                  <span className="text-xs text-muted-foreground font-normal">(opsional)</span>
                </Label>
                <Input
                  type="number"
                  value={formData.infaq_tambahan}
                  onChange={(e) => setFormData({ ...formData, infaq_tambahan: e.target.value })}
                  placeholder="Jika donatur juga memberikan uang tunai"
                />
                <p className="text-xs text-green-700">
                  Jika donatur memberikan barang + uang tunai sekaligus
                </p>
              </div>
            </div>
          )}

          <div className="border-t pt-5"></div>

          {/* Hajat - Clean & Elegant */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Hajat / Doa</Label>
              <span className="text-xs text-muted-foreground">(opsional)</span>
            </div>
            <Textarea
              value={formData.hajat}
              onChange={(e) => setFormData({ ...formData, hajat: e.target.value })}
              rows={3}
              placeholder="Contoh: Syukuran anak lulus, kesembuhan ibu, kelancaran usaha..."
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Hajat akan dibacakan saat doa maghrib
            </p>
          </div>

          {/* Catatan (collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 select-none">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              Catatan tambahan
            </summary>
            <div className="mt-3">
              <Textarea
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                rows={2}
                placeholder="Catatan internal untuk admin..."
                className="resize-none"
              />
            </div>
          </details>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                editingDonation ? 'Update Donasi' : 'Simpan Donasi'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}