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
  koperasi: number;
  dapur: number;
  distribusi_bantuan: number;
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

export interface InventoryConditionData {
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
 * Menampilkan tujuan pengeluaran: koperasi, dapur, distribusi bantuan
 */
export const getInventoryMonthlyData = async (): Promise<InventoryMonthlyData[]> => {
  const { data: transactions, error } = await supabase
    .from('transaksi_inventaris')
    .select('tipe, tanggal, masuk_mode, keluar_mode, channel, jumlah, penerima')
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
    koperasi: number;
    dapur: number;
    distribusi_bantuan: number;
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
        koperasi: 0,
        dapur: 0,
        distribusi_bantuan: 0,
        stocktake: 0,
        fromDonation: 0,
        fromPurchase: 0
      });
    }

    const monthData = monthlyMap.get(sortKey)!;
    const qty = parseFloat(tx.jumlah?.toString() || '0');
    
    if (tx.tipe === 'Masuk') {
      monthData.masuk += qty;
      if (tx.masuk_mode === 'Donasi') {
        monthData.fromDonation += qty;
      } else if (tx.masuk_mode === 'Pembelian') {
        monthData.fromPurchase += qty;
      }
    } else if (tx.tipe === 'Keluar') {
      // Kategorisasi berdasarkan channel atau keluar_mode untuk kompatibilitas
      if (tx.channel === 'koperasi' || (tx.keluar_mode === 'Penjualan' && !tx.channel)) {
        // Penjualan ke koperasi (termasuk data lama tanpa channel)
        monthData.koperasi += qty;
      } else if (tx.channel === 'dapur' || (tx.keluar_mode === 'Distribusi' && tx.penerima?.toLowerCase().includes('dapur'))) {
        monthData.dapur += qty;
      } else if (tx.channel === 'distribusi_bantuan' || (tx.keluar_mode === 'Distribusi' && !tx.penerima?.toLowerCase().includes('dapur'))) {
        monthData.distribusi_bantuan += qty;
      }
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
      koperasi: data.koperasi,
      dapur: data.dapur,
      distribusi_bantuan: data.distribusi_bantuan,
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
 * Get inventory condition distribution for pie chart
 * Menggantikan distribusi kategori dengan distribusi kondisi barang
 * Menghitung jumlah item per kondisi (bukan total quantity)
 */
export const getInventoryConditionData = async (): Promise<InventoryConditionData[]> => {
  const { data: items, error } = await supabase
    .from('inventaris')
    .select('kondisi, id');

  if (error) {
    console.error('Error fetching condition data:', error);
    return [];
  }

  // Group by condition - count number of items per condition
  const conditionMap = new Map<string, { itemCount: number }>();

  items?.forEach(item => {
    // Normalize kondisi dari data lama ke format baru
    let kondisi = item.kondisi || 'Baik';
    if (kondisi === 'Rusak Ringan' || kondisi === 'Perlu Perbaikan' || kondisi === 'Butuh Perbaikan') {
      kondisi = 'Perlu perbaikan';
    } else if (kondisi === 'Rusak Berat' || kondisi === 'Rusak') {
      kondisi = 'Rusak';
    } else if (kondisi === 'Baik') {
      kondisi = 'Baik';
    } else {
      kondisi = 'Baik'; // Default
    }
    
    if (!conditionMap.has(kondisi)) {
      conditionMap.set(kondisi, { itemCount: 0 });
    }
    
    const condData = conditionMap.get(kondisi)!;
    condData.itemCount += 1; // Count items, not quantity
  });

  // Convert to array - use itemCount as value
  const conditions = Array.from(conditionMap.entries())
    .map(([name, data]) => ({
      name,
      value: data.itemCount, // Number of items in this condition
      color: getConditionColor(name),
      itemCount: data.itemCount // Number of different items
    }))
    .filter(cond => cond.value > 0) // Only show conditions with items
    .sort((a, b) => b.value - a.value);

  return conditions;
};

/**
 * Get color for condition
 */
function getConditionColor(condition: string): string {
  // Normalize kondisi untuk mapping warna
  const normalized = condition === 'Perlu Perbaikan' || condition === 'Butuh Perbaikan' || condition === 'Rusak Ringan' 
    ? 'Perlu perbaikan'
    : condition === 'Rusak Berat' || condition === 'Rusak'
    ? 'Rusak'
    : 'Baik';
  
  const colors: Record<string, string> = {
    'Baik': '#10b981', // Green
    'Perlu perbaikan': '#f97316', // Orange
    'Rusak': '#ef4444', // Red
  };

  return colors[normalized] || '#6b7280'; // Gray for unknown
}

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

