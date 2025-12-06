import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StockNotificationOptions {
  enabled?: boolean;
  lowStockThreshold?: number;
}

/**
 * Hook for monitoring stock levels and showing notifications
 * 
 * Features:
 * - Real-time monitoring of inventory stock changes
 * - Low stock alerts when stock falls below threshold
 * - Out of stock alerts
 * 
 * Requirements: AC-8.3 - Notification saat stock low
 */
export function useStockNotifications(options: StockNotificationOptions = {}) {
  const { enabled = true, lowStockThreshold = 10 } = options;
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to inventory stock changes
    const channel = supabase
      .channel('stock-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventaris'
        },
        (payload) => {
          const oldRecord = payload.old as any;
          const newRecord = payload.new as any;

          // Check if stock changed
          if (oldRecord?.jumlah !== newRecord?.jumlah) {
            const oldStock = oldRecord?.jumlah || 0;
            const newStock = newRecord?.jumlah || 0;
            const itemName = newRecord?.nama_barang || 'Item';

            // Out of stock alert
            if (newStock === 0 && oldStock > 0) {
              toast({
                title: '⚠️ Stok Habis',
                description: `${itemName} telah habis`,
                variant: 'destructive',
              });
            }
            // Low stock alert
            else if (newStock > 0 && newStock <= lowStockThreshold && oldStock > lowStockThreshold) {
              toast({
                title: '⚠️ Stok Menipis',
                description: `${itemName} tersisa ${newStock} ${newRecord?.satuan || 'unit'}`,
                variant: 'default',
              });
            }
            // Stock restored alert (from 0 to positive)
            else if (newStock > 0 && oldStock === 0) {
              toast({
                title: '✅ Stok Tersedia',
                description: `${itemName} kembali tersedia (${newStock} ${newRecord?.satuan || 'unit'})`,
              });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, lowStockThreshold, toast]);
}
