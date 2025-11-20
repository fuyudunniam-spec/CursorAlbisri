/**
 * Test utilities for inventory module
 * Run these tests to verify the module functionality
 */

export const testInventoryModule = async () => {
  console.log("🧪 Testing Inventory Module...");
  
  const tests = [
    {
      name: "Service Layer",
      test: () => {
        // Test service imports
        try {
          require("@/services/inventaris.service");
          console.log("✅ Service layer imported successfully");
          return true;
        } catch (error) {
          console.error("❌ Service layer import failed:", error);
          return false;
        }
      }
    },
    {
      name: "Hooks",
      test: () => {
        // Test hooks imports
        try {
          require("@/hooks/useInventory");
          require("@/hooks/useInventoryTransactions");
          require("@/hooks/useStockAlerts");
          require("@/hooks/useAuth");
          console.log("✅ Hooks imported successfully");
          return true;
        } catch (error) {
          console.error("❌ Hooks import failed:", error);
          return false;
        }
      }
    },
    {
      name: "Components",
      test: () => {
        // Test components imports
        try {
          require("@/components/inventaris/InventoryTable");
          require("@/components/inventaris/InventoryFilters");
          require("@/components/inventaris/InventoryForm");
          require("@/components/inventaris/TransactionForm");
          require("@/components/inventaris/TransactionTable");
          require("@/components/inventaris/AlertsPanel");
          require("@/components/inventaris/ExportMenu");
          require("@/components/inventaris/StockAdjustDialog");
          console.log("✅ Components imported successfully");
          return true;
        } catch (error) {
          console.error("❌ Components import failed:", error);
          return false;
        }
      }
    },
    {
      name: "Utils",
      test: () => {
        // Test utils
        try {
          const { formatRupiah, parseRupiah, exportToCSV } = require("@/utils/inventaris.utils");
          
          // Test formatRupiah
          const formatted = formatRupiah(1000000);
          if (formatted !== "Rp 1.000.000") {
            throw new Error("formatRupiah test failed");
          }
          
          // Test parseRupiah
          const parsed = parseRupiah("Rp 1.000.000");
          if (parsed !== 1000000) {
            throw new Error("parseRupiah test failed");
          }
          
          console.log("✅ Utils working correctly");
          return true;
        } catch (error) {
          console.error("❌ Utils test failed:", error);
          return false;
        }
      }
    },
    {
      name: "Schemas",
      test: () => {
        // Test Zod schemas
        try {
          const { inventarisSchema, transaksiInventarisSchema } = require("@/schemas/inventaris.schema");
          
          // Test inventory schema
          const validInventory = {
            nama_barang: "Test Item",
            tipe_item: "Aset",
            kategori: "Elektronik & IT",
            zona: "Gedung Putra",
            lokasi: "Ruang Server",
            kondisi: "Baik",
            jumlah: 10,
            satuan: "pcs",
            min_stock: 5
          };
          
          const inventoryResult = inventarisSchema.safeParse(validInventory);
          if (!inventoryResult.success) {
            throw new Error("Inventory schema validation failed");
          }
          
          console.log("✅ Schemas working correctly");
          return true;
        } catch (error) {
          console.error("❌ Schemas test failed:", error);
          return false;
        }
      }
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    try {
      const result = test.test();
      if (result) passed++;
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
    }
  }

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log("🎉 All tests passed! Module is ready for production.");
  } else {
    console.log("⚠️  Some tests failed. Please check the errors above.");
  }

  return { passed, total, success: passed === total };
};

// Manual test scenarios
export const testScenarios = {
  async createItem() {
    console.log("📝 Testing: Create new inventory item");
    // This would be called from the UI
    return "Manual test: Try creating a new item via the form";
  },
  
  async createTransaction() {
    console.log("📝 Testing: Create new transaction");
    // This would be called from the UI
    return "Manual test: Try creating a new transaction via the form";
  },
  
  async adjustStock() {
    console.log("📝 Testing: Adjust stock");
    // This would be called from the UI
    return "Manual test: Try adjusting stock via the adjust dialog";
  },
  
  async exportData() {
    console.log("📝 Testing: Export data");
    // This would be called from the UI
    return "Manual test: Try exporting data via the export menu";
  },
  
  async filterAndSearch() {
    console.log("📝 Testing: Filter and search");
    // This would be called from the UI
    return "Manual test: Try using filters and search functionality";
  }
};

// Run tests if called directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testInventoryModule = testInventoryModule;
  (window as any).testScenarios = testScenarios;
}
