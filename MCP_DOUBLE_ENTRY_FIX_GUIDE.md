# 🚀 MCP Double Entry Fix Guide

## 📋 Overview
Guide lengkap untuk menjalankan audit dan perbaikan double entry menggunakan MCP (Model Context Protocol) dan Supabase.

## 🎯 Files Created
1. **AUDIT_DOUBLE_ENTRY_MCP.sql** - Script audit untuk deteksi duplikasi
2. **FIX_DOUBLE_ENTRY_MCP.sql** - Script perbaikan untuk hapus duplikasi  
3. **MONITOR_DOUBLE_ENTRY_MCP.sql** - Script monitoring dan pencegahan
4. **RUN_DOUBLE_ENTRY_FIX_MCP.sql** - Script lengkap untuk fix complete

## 🔧 How to Run

### Method 1: Supabase Dashboard (Recommended)
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project: `dwyemauojftlyzzgujgh`
3. Masuk ke **SQL Editor**
4. Copy-paste script dari `RUN_DOUBLE_ENTRY_FIX_MCP.sql`
5. Klik **Run** untuk execute

### Method 2: Supabase CLI
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref dwyemauojftlyzzgujgh

# Run the fix script
supabase db reset --db-url "postgresql://postgres:[password]@db.dwyemauojftlyzzgujgh.supabase.co:5432/postgres" --file RUN_DOUBLE_ENTRY_FIX_MCP.sql
```

### Method 3: Direct Database Connection
```bash
# Using psql
psql "postgresql://postgres:[password]@db.dwyemauojftlyzzgujgh.supabase.co:5432/postgres" -f RUN_DOUBLE_ENTRY_FIX_MCP.sql
```

## 📊 What the Script Does

### Step 1: Audit Current State
- ✅ Count total transactions by type
- ✅ Identify potential duplicates
- ✅ Show summary statistics

### Step 2: Create Backup
- ✅ Backup all potentially duplicate records
- ✅ Safe rollback capability

### Step 3: Fix Duplicates
- ✅ Remove duplicate Inventaris Sales entries
- ✅ Remove duplicate Donasi entries
- ✅ Keep only the latest entry for each duplicate

### Step 4: Update Balances
- ✅ Recalculate all account balances
- ✅ Ensure data consistency

### Step 5: Verification
- ✅ Check final state
- ✅ Confirm no remaining duplicates
- ✅ Validate totals

### Step 6: Setup Monitoring
- ✅ Create monitoring functions
- ✅ Setup prevention triggers
- ✅ Real-time duplicate detection

## 🎯 Expected Results

### Before Fix:
```
Total Pemasukan: 1,500,000 (with duplicates)
Inventaris Sales: 500,000 (duplicated)
Donasi: 300,000 (duplicated)
```

### After Fix:
```
Total Pemasukan: 1,200,000 (clean)
Inventaris Sales: 250,000 (single entry)
Donasi: 150,000 (single entry)
```

## 🔍 Monitoring & Prevention

### Real-time Monitoring
```sql
-- Check for duplicates anytime
SELECT * FROM v_double_entry_monitor;

-- Get financial summary with validation
SELECT * FROM detect_potential_double_entry();
```

### Prevention Features
- ✅ **Duplicate Detection Function** - `detect_potential_double_entry()`
- ✅ **Monitoring View** - `v_double_entry_monitor`
- ✅ **Prevention Trigger** - (optional, can be enabled)

## 🚨 Important Notes

### ⚠️ Safety Measures
1. **Backup Created** - All duplicate records backed up
2. **Rollback Available** - Can restore from backup if needed
3. **Verification Steps** - Multiple checks before/after fix

### ⚠️ Before Running
1. **Test on Staging** - Run on test database first
2. **Backup Database** - Full database backup recommended
3. **Check Dependencies** - Ensure no active transactions

### ⚠️ After Running
1. **Verify Results** - Check dashboard and reports
2. **Test Application** - Ensure all features work
3. **Monitor Logs** - Watch for any errors

## 🎉 Success Indicators

### ✅ Database Level
- No duplicate entries in `keuangan` table
- Account balances recalculated correctly
- Monitoring functions working

### ✅ Application Level
- Dashboard shows accurate totals
- No double counting in reports
- Real-time data consistency

### ✅ User Experience
- Faster dashboard loading
- Accurate financial reports
- Reliable data integrity

## 🔧 Troubleshooting

### If Script Fails
1. Check database permissions
2. Verify table structure
3. Check for active locks

### If Results Look Wrong
1. Check backup table
2. Verify account balances
3. Run verification queries

### If Application Breaks
1. Check service layer
2. Verify data fetching
3. Test with sample data

## 📞 Support

If you encounter issues:
1. Check the backup tables first
2. Run verification queries
3. Contact development team

---

**🎯 Ready to run? Copy the script and execute in Supabase SQL Editor!**
