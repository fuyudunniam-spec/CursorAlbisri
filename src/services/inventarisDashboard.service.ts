import { supabase } from '@/integrations/supabase/client';

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  nearExpiryItems: number;
  pendingDonations: number;
  pendingDonationItems: number;
  totalTransactions: number;
  transactionsThisMonth: number;
  itemsFromDonation: number;
  itemsFromPurchase: number;
  transactionTrend: number;
}

export interface PendingDonation {
  id: string;
  donor_name: string;
  donation_date: string;
  donation_type: string;
  items_count: number;
  items: Array<{
    raw_item_name: string;
    quantity: number;
    uom: string;
    item_type: string;
    mapped_item_id: string | null;
  }>;
}

export interface InventoryMonthlyData {
  month: string;
  masuk: number;
  keluar: number;
  stocktake: number;
  fromDonation: number;
  fromPurchase: number;
}

export interface InventoryCategoryData {
  name: string;
  value: number;
  color: string;
  itemCount: number;
}

/**
 * Get comprehensive inventory dashboard statistics
 */
export const getInventoryDashboardStats = async (): Promise<InventoryStats> => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Get all inventory items
  const { data: items, error: itemsError } = await supabase
    .from('inventaris')
    .select('id, jumlah, harga_perolehan');

  if (itemsError) {
    console.error('Error fetching inventory items:', itemsError);
    throw itemsError;
  }

  // Get transactions
  const { data: transactions, error: transactionsError } = await supabase
    .from('transaksi_inventaris')
    .select('id, tipe, tanggal, masuk_mode, referensi_donation_id');

  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError);
    // Don't throw, just use empty array
  }

  // Get pending donations (donations with items not yet posted to stock)
  // EXCLUDE direct_consumption items (kategori makanan) - hanya tampilkan inventory items
  const { data: allDonations, error: pendingError } = await supabase
    .from('donations')
    .select(`
      id,
      donor_name,
      donation_date,
      donation_type,
      donation_items (
        id,
        raw_item_name,
        quantity,
        uom,
        item_type,
        mapped_item_id,
        is_posted_to_stock
      )
    `)
    .in('donation_type', ['in_kind', 'mixed'])
    .neq('status', 'cancelled');

  if (pendingError) {
    console.error('Error fetching pending donations:', pendingError);
  }

  // Filter di aplikasi: hanya donasi dengan item inventory yang belum dipost
  // EXCLUDE item dengan item_type = 'direct_consumption'
  const pendingDonations = (allDonations || []).filter(donation => {
    const inventoryItems = (donation.donation_items || []).filter(
      (item: any) => {
        const isNotPosted = !item.is_posted_to_stock;
        const isNotDirectConsumption = item.item_type !== 'direct_consumption';
        const isInventoryType = !item.item_type || item.item_type === 'inventory';
        
        return isNotPosted && isNotDirectConsumption && isInventoryType;
      }
    );
    return inventoryItems.length > 0;
  });

  // Calculate stats
  const totalItems = items?.length || 0;
  const totalValue = items?.reduce((sum, item) => {
    const harga = parseFloat(item.harga_perolehan?.toString() || '0');
    const jumlah = parseFloat(item.jumlah?.toString() || '0');
    return sum + (harga * jumlah);
  }, 0) || 0;

  // Count low stock items (jumlah < 10)
  const lowStockItems = items?.filter(item => {
    const jumlah = parseFloat(item.jumlah?.toString() || '0');
    return jumlah > 0 && jumlah < 10;
  }).length || 0;

  // Count near expiry items (using receive_entries if available)
  const { data: receiveEntries } = await supabase
    .from('receive_entries')
    .select('expiry_date')
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const nearExpiryItems = receiveEntries?.length || 0;

  // Count pending donations - hanya yang memiliki inventory items
  const pendingDonationsCount = pendingDonations.length;
  const pendingDonationItemsCount = pendingDonations.reduce((sum, donation) => {
    const inventoryItems = (donation.donation_items || []).filter(
      (item: any) => {
        const isNotPosted = !item.is_posted_to_stock;
        const isNotDirectConsumption = item.item_type !== 'direct_consumption';
        const isInventoryType = !item.item_type || item.item_type === 'inventory';
        
        return isNotPosted && isNotDirectConsumption && isInventoryType;
      }
    );
    return sum + inventoryItems.length;
  }, 0);

  // Count transactions
  const totalTransactions = transactions?.length || 0;
  const transactionsThisMonth = transactions?.filter(tx => {
    const txDate = new Date(tx.tanggal);
    return txDate >= startOfMonth && txDate <= endOfMonth;
  }).length || 0;

  // Calculate last month transactions for trend
  const lastMonthStart = new Date(startOfMonth);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  const lastMonthEnd = new Date(startOfMonth);
  lastMonthEnd.setMilliseconds(-1);

  const transactionsLastMonth = transactions?.filter(tx => {
    const txDate = new Date(tx.tanggal);
    return txDate >= lastMonthStart && txDate <= lastMonthEnd;
  }).length || 0;

  const transactionTrend = transactionsLastMonth > 0
    ? ((transactionsThisMonth - transactionsLastMonth) / transactionsLastMonth) * 100
    : 0;

  // Count items by source
  const itemsFromDonation = transactions?.filter(tx => 
    tx.tipe === 'Masuk' && tx.masuk_mode === 'Donasi'
  ).length || 0;

  const itemsFromPurchase = transactions?.filter(tx => 
    tx.tipe === 'Masuk' && tx.masuk_mode === 'Pembelian'
  ).length || 0;

  return {
    totalItems,
    totalValue,
    lowStockItems,
    nearExpiryItems,
    pendingDonations: pendingDonationsCount,
    pendingDonationItems: pendingDonationItemsCount,
    totalTransactions,
    transactionsThisMonth,
    itemsFromDonation,
    itemsFromPurchase,
    transactionTrend
  };
};

/**
 * Get pending donations that need to be posted to inventory
 * Hanya donasi yang memiliki setidaknya 1 item inventory yang belum dipost
 * EXCLUDE item dengan item_type = 'direct_consumption' (makanan langsung habis)
 */
export const getPendingDonations = async (): Promise<PendingDonation[]> => {
  // Ambil semua donasi dengan semua item-nya
  const { data: donations, error } = await supabase
    .from('donations')
    .select(`
      id,
      donor_name,
      donation_date,
      donation_type,
      donation_items (
        id,
        raw_item_name,
        quantity,
        uom,
        item_type,
        mapped_item_id,
        is_posted_to_stock
      )
    `)
    .in('donation_type', ['in_kind', 'mixed'])
    .neq('status', 'cancelled')
    .order('donation_date', { ascending: false });

  if (error) {
    console.error('Error fetching pending donations:', error);
    return [];
  }

  // Filter di aplikasi: hanya donasi yang memiliki setidaknya 1 item inventory yang belum dipost
  // EXCLUDE item dengan item_type = 'direct_consumption'
  const filteredDonations = (donations || []).filter(donation => {
    const inventoryItems = (donation.donation_items || []).filter(
      (item: any) => {
        // Hanya ambil item yang:
        // 1. Belum dipost ke stock
        // 2. Bukan direct_consumption (makanan langsung habis)
        // 3. Item type adalah 'inventory' atau null (default inventory)
        const isNotPosted = !item.is_posted_to_stock;
        const isNotDirectConsumption = item.item_type !== 'direct_consumption';
        const isInventoryType = !item.item_type || item.item_type === 'inventory';
        
        return isNotPosted && isNotDirectConsumption && isInventoryType;
      }
    );
    return inventoryItems.length > 0;
  });

  return filteredDonations.map(donation => {
    // Hanya ambil item inventory yang belum dipost dan bukan direct_consumption
    const inventoryItems = (donation.donation_items || []).filter(
      (item: any) => {
        const isNotPosted = !item.is_posted_to_stock;
        const isNotDirectConsumption = item.item_type !== 'direct_consumption';
        const isInventoryType = !item.item_type || item.item_type === 'inventory';
        
        return isNotPosted && isNotDirectConsumption && isInventoryType;
      }
    );

    return {
      id: donation.id,
      donor_name: donation.donor_name,
      donation_date: donation.donation_date,
      donation_type: donation.donation_type,
      items_count: inventoryItems.length,
      items: inventoryItems.map((item: any) => ({
        raw_item_name: item.raw_item_name,
        quantity: parseFloat(item.quantity?.toString() || '0'),
        uom: item.uom,
        item_type: item.item_type || 'inventory',
        mapped_item_id: item.mapped_item_id
      }))
    };
  });
};

/**
 * Get monthly inventory transaction data for charts
 */
export const getInventoryMonthlyData = async (): Promise<InventoryMonthlyData[]> => {
  const { data: transactions, error } = await supabase
    .from('transaksi_inventaris')
    .select('tipe, tanggal, masuk_mode')
    .order('tanggal', { ascending: true });

  if (error) {
    console.error('Error fetching monthly data:', error);
    return [];
  }

  // Group by month with sortable key
  const monthlyMap = new Map<string, {
    sortKey: string;
    displayMonth: string;
    masuk: number;
    keluar: number;
    stocktake: number;
    fromDonation: number;
    fromPurchase: number;
  }>();

  transactions?.forEach(tx => {
    const date = new Date(tx.tanggal);
    // Use YYYY-MM format for sorting
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const displayMonth = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    
    if (!monthlyMap.has(sortKey)) {
      monthlyMap.set(sortKey, {
        sortKey,
        displayMonth,
        masuk: 0,
        keluar: 0,
        stocktake: 0,
        fromDonation: 0,
        fromPurchase: 0
      });
    }

    const monthData = monthlyMap.get(sortKey)!;
    
    if (tx.tipe === 'Masuk') {
      monthData.masuk += 1;
      if (tx.masuk_mode === 'Donasi') {
        monthData.fromDonation += 1;
      } else if (tx.masuk_mode === 'Pembelian') {
        monthData.fromPurchase += 1;
      }
    } else if (tx.tipe === 'Keluar') {
      monthData.keluar += 1;
    } else if (tx.tipe === 'Stocktake') {
      monthData.stocktake += 1;
    }
  });

  // Convert to array and sort by sortKey (YYYY-MM)
  const monthlyData: InventoryMonthlyData[] = Array.from(monthlyMap.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(data => ({
      month: data.displayMonth,
      masuk: data.masuk,
      keluar: data.keluar,
      stocktake: data.stocktake,
      fromDonation: data.fromDonation,
      fromPurchase: data.fromPurchase
    }));

  // Get last 6 months
  return monthlyData.slice(-6);
};

/**
 * Get inventory category distribution for pie chart
 */
export const getInventoryCategoryData = async (): Promise<InventoryCategoryData[]> => {
  const { data: items, error } = await supabase
    .from('inventaris')
    .select('kategori, jumlah');

  if (error) {
    console.error('Error fetching category data:', error);
    return [];
  }

  // Group by category - count total quantity per category
  const categoryMap = new Map<string, { totalQuantity: number; itemCount: number }>();

  items?.forEach(item => {
    const kategori = item.kategori || 'Lainnya';
    const jumlah = parseFloat(item.jumlah?.toString() || '0');
    
    if (!categoryMap.has(kategori)) {
      categoryMap.set(kategori, { totalQuantity: 0, itemCount: 0 });
    }
    
    const catData = categoryMap.get(kategori)!;
    catData.totalQuantity += jumlah;
    catData.itemCount += 1;
  });

  // Convert to array - use total quantity as value
  const categories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      value: Math.round(data.totalQuantity), // Total quantity in this category
      color: getCategoryColor(name),
      itemCount: data.itemCount // Number of different items
    }))
    .filter(cat => cat.value > 0) // Only show categories with stock
    .sort((a, b) => b.value - a.value);

  return categories.slice(0, 6); // Top 6 categories
};

/**
 * Get color for category
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Donasi': '#3b82f6',
    'Makanan': '#ef4444',
    'Bahan Baku': '#f59e0b',
    'Peralatan': '#10b981',
    'Aset': '#8b5cf6',
    'Lainnya': '#6b7280'
  };

  return colors[category] || '#6b7280';
}

