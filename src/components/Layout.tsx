import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { canAccessPath, canAccessPathWithUser, canAccessModuleWithUser } from '@/utils/permissions';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  PiggyBank, 
  Heart, 
  Package, 
  ShoppingCart, 
  DollarSign,
  LogOut,
  X,
  User as UserIcon,
  GraduationCap,
  FileText,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Key,
  BookOpen,
  HandCoins,
  BookMarked,
  Coins,
  Store,
  CreditCard,
  Warehouse,
  TruckIcon,
  FileBarChart,
  Calculator,
  Target,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getFeature } from '@/utils/featureFlags';

interface LayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  icon: any;
  label: string;
  path?: string;
  badge?: string;
  dividerBefore?: boolean;
  subItems?: MenuItem[]; // Support for nested submenu
}

interface MenuSection {
  title: string;
  icon: any;
  items: MenuItem[];
}

const SidebarContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, canAccess } = useAuth();
  // Semua section tertutup by default
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([]);

  // Check feature flag for module dashboards
  const showModuleDashboards = getFeature('MODULE_DASHBOARD_ALPHA');

  // Reorganized menu structure with modules and sub-modules
  // Urutan: Dashboard, Santri, Akademik, Keuangan, Inventaris, Koperasi, Kelola User
  // Memoize menu sections to prevent recreation on every render
  const reorganizedMenuSections: MenuSection[] = useMemo(() => [
    {
      title: 'DASHBOARD',
      icon: LayoutDashboard,
      items: [
        { icon: LayoutDashboard, label: 'Executive Overview', path: '/' }
      ]
    },
    {
      title: 'SANTRI',
      icon: Users,
      items: [
        { icon: Users, label: 'Data Santri', path: '/santri' }
      ]
    },
    {
      title: 'AKADEMIK',
      icon: GraduationCap,
      items: [
        // Dashboard Akademik - ditampilkan di paling atas
        { icon: LayoutDashboard, label: 'Dashboard Akademik', path: '/akademik' },
        // Dashboard Pengajar (untuk role pengajar)
        ...(user?.role === 'pengajar' || user?.roles?.includes('pengajar') 
          ? [
              { icon: LayoutDashboard, label: 'Dashboard Pengajar', path: '/akademik/pengajar', dividerBefore: true },
              { icon: UserIcon, label: 'Profil', path: '/akademik/pengajar/profil' }
            ]
          : []
        ),
        // Setup & Administrasi - hanya untuk admin
        ...(user?.role === 'admin' || user?.roles?.includes('admin')
          ? [
        { icon: BookOpen, label: 'Kelas & Plotting', path: '/akademik/kelas', dividerBefore: user?.role === 'pengajar' || user?.roles?.includes('pengajar') },
            ]
          : []
        ),
        // Operasional Harian
        { icon: BookMarked, label: 'Jadwal & Presensi', path: '/akademik/pertemuan', dividerBefore: user?.role === 'pengajar' || user?.roles?.includes('pengajar') },
        ...(user?.role === 'admin' || user?.roles?.includes('admin') || user?.role === 'pengajar' || user?.roles?.includes('pengajar')
          ? [
              { icon: GraduationCap, label: 'Input Nilai', path: '/akademik/nilai' },
            ]
          : []
        ),
        ...(user?.role === 'admin' || user?.roles?.includes('admin')
          ? [{ icon: Coins, label: 'Setoran', path: '/akademik/setoran' }]
          : []
        )
        // Catatan: Tahun & Semester, Monitoring, Perizinan bisa diakses langsung via URL
        // tetapi tidak ditampilkan di menu utama untuk menjaga menu minimal
      ]
    },
    {
      title: 'KEUANGAN',
      icon: DollarSign,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard Keuangan', path: '/keuangan-v3/penyaluran-bantuan' },
        { icon: TrendingUp, label: 'Keuangan Umum', path: '/keuangan-v3' },
        { icon: FileText, label: 'SPP & Pembayaran Santri', path: '/tagihan-santri' },
        { icon: PiggyBank, label: 'Tabungan Santri', path: '/tabungan-santri' },
        { icon: Settings2, label: 'Master Data Keuangan', path: '/keuangan/master-data' }
      ]
    },
    {
      title: 'DONASI',
      icon: Heart,
      items: [
        { icon: Heart, label: 'Donasi', path: '/donasi' },
        { icon: UserIcon, label: 'Master Donatur', path: '/donasi/master-donatur' }
        // Modul Kebutuhan Layanan Santri - DINONAKTIFKAN
        // { icon: Target, label: 'Kebutuhan Layanan Santri', path: '/donasi/kebutuhan-layanan' },
        // ...(showModuleDashboards ? [{ icon: LayoutDashboard, label: 'Dashboard Kebutuhan', path: '/donasi/kebutuhan-layanan/dashboard' }] : [])
      ]
    },
    {
      title: 'INVENTARIS',
      icon: Package,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/inventaris' },
        { icon: Package, label: 'Master Data', path: '/inventaris/master' },
        { icon: Users, label: 'Distribusi', path: '/inventaris/distribution' }
      ]
    },
    {
      title: 'KOPERASI',
      icon: Store,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard Koperasi', path: '/koperasi' },
        { icon: Package, label: 'Master Data', path: '/koperasi/master' },
        { icon: CreditCard, label: 'Kasir/POS', path: '/koperasi/kasir' },
        { icon: Warehouse, label: 'Inventaris Koperasi', path: '/koperasi/inventaris' },
        { icon: ShoppingCart, label: 'Penjualan', path: '/koperasi/penjualan' },
        { icon: TruckIcon, label: 'Pembelian', path: '/koperasi/pembelian', dividerBefore: true },
        { 
          icon: DollarSign, 
          label: 'Keuangan Koperasi', 
          path: '/koperasi/keuangan',
          subItems: [
            { icon: BarChart3, label: 'Dashboard Keuangan', path: '/koperasi/keuangan/dashboard' },
            { icon: FileText, label: 'Transaksi Keuangan', path: '/koperasi/keuangan' },
            { icon: Coins, label: 'Operasional', path: '/koperasi/keuangan/operasional' },
            { icon: Calculator, label: 'Kelola HPP & Bagi Hasil', path: '/koperasi/keuangan/kelola-hpp' }
          ]
        },
        { icon: FileBarChart, label: 'Laporan', path: '/koperasi/laporan', dividerBefore: true }
      ]
    },
    {
      title: 'KELOLA USER',
      icon: Users,
      items: [
        { icon: Users, label: 'Daftar User', path: '/admin/users' }
      ]
    }
  ], [showModuleDashboards, user?.role, user?.roles]);

  // Sidebar khusus untuk SANTRI (fokus ke profil sendiri)
  const isSantri = user?.role === 'santri';
  const santriProfileBase = useMemo(() => 
    `/santri/profile/${user?.santriId || ''}`,
    [user?.santriId]
  );
  const santriMenuSections: MenuSection[] = useMemo(() => [
    {
      title: 'PROFIL',
      icon: UserIcon,
      items: [
        { icon: UserIcon, label: 'Informasi', path: `${santriProfileBase}/informasi` },
        { icon: BookOpen, label: 'Akademik', path: `${santriProfileBase}/akademik` }
      ]
    },
    {
      title: 'TABUNGAN',
      icon: DollarSign,
      items: [
        { icon: DollarSign, label: 'Saldo & Riwayat', path: `${santriProfileBase}/tabungan` }
      ]
    },
    {
      title: 'DOKUMEN',
      icon: FileText,
      items: [
        { icon: FileText, label: 'Wajib & Optional', path: `${santriProfileBase}/dokumen` }
      ]
    },
    {
      title: 'BANTUAN',
      icon: HandCoins,
      items: [
        { icon: HandCoins, label: 'Ringkasan Bantuan', path: `${santriProfileBase}/layanan` }
      ]
    },
    {
      title: 'AKUN',
      icon: Key,
      items: [
        { icon: Key, label: 'Ubah Password', path: '/change-password' }
      ]
    }
  ], [santriProfileBase]);

  // Filter menu sections and items based on user role
  // Memoize filter function to prevent recreation
  const filterMenuByRole = useCallback((sections: MenuSection[]): MenuSection[] => {
    if (!user) return [];

    return sections
      .map((section) => {
        // KELOLA USER hanya untuk admin
        if (section.title === 'KELOLA USER') {
          const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');
          if (!isAdmin) {
            return null;
          }
        }

        // Map section title to module name for permission check
        // Urutan: Dashboard, Santri, Akademik, Keuangan, Donasi, Inventaris, Koperasi, Kelola User
        const sectionModuleMap: Record<string, string> = {
          'DASHBOARD': 'dashboard',
          'SANTRI': 'santri',
          'AKADEMIK': 'monitoring',
          'KEUANGAN': 'keuangan',
          'DONASI': 'donasi',
          'INVENTARIS': 'inventaris',
          'KOPERASI': 'koperasi',
          'KELOLA USER': 'settings'
        };

        const moduleName = sectionModuleMap[section.title];
        
        // Check if user can access this section
        const canAccessSection = moduleName && user ? canAccessModuleWithUser(user, moduleName) : true;

        if (!canAccessSection) {
          return null;
        }

        // Filter items within section
        const filteredItems = section.items.filter((item) => {
          if (!item.path) return false;
          return canAccessPathWithUser(user, item.path);
        });

        // Only return section if it has accessible items
        if (filteredItems.length === 0) {
          return null;
        }

        return {
          ...section,
          items: filteredItems
        };
      })
      .filter((section): section is MenuSection => section !== null);
  }, [user, canAccess]);

  // Use filtered structure based on role - memoize to prevent recalculation
  const effectiveSections = useMemo(() => 
    isSantri ? santriMenuSections : reorganizedMenuSections,
    [isSantri, santriMenuSections, reorganizedMenuSections]
  );
  const menuSections = useMemo(() => 
    filterMenuByRole(effectiveSections),
    [filterMenuByRole, effectiveSections]
  );

  const toggleSection = useCallback((title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  }, []);

  const toggleSubmenu = useCallback((path: string) => {
    setExpandedSubmenus(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  }, []);

  const isActive = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  const isSubmenuActive = useCallback((subItems?: MenuItem[]) => {
    if (!subItems) return false;
    return subItems.some(item => item.path && location.pathname.startsWith(item.path));
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header with Logo - Larger, No Card */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200">
        <div className="flex flex-col items-center gap-3">
          {/* Logo Al-Bisri - Lebih Besar */}
          <div className="flex-shrink-0">
            <img 
              src="/kop-albisri.png" 
              alt="Logo Al-Bisri" 
              className="w-24 h-24 object-contain"
            />
          </div>
          {/* Text */}
          <div className="text-center">
            <h1 className="text-sm font-bold text-gray-900 leading-tight">
              Pesantren Anak Yatim Al-Bisri
            </h1>
            <p className="text-xs text-gray-600 leading-tight mt-1">
              Sistem Manajemen Pesantren dan LKSA
            </p>
          </div>
        </div>
      </div>

      {/* Navigation with Scroll */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        {menuSections.map((section) => {
          const isExpanded = expandedSections.includes(section.title);
          
          return (
            <div key={section.title} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-gray-100 group"
                )}
              >
                <div className="flex items-center gap-2">
                  <section.icon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="mt-1 space-y-1 pl-2">
                  {section.items.map((item, index) => (
                    <React.Fragment key={item.path || item.label}>
                      {item.dividerBefore && index > 0 && (
                        <div className="my-2 mx-2 border-t border-gray-200" />
                      )}
                      
                      {/* Item with submenu */}
                      {item.subItems ? (
                        <div>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3 h-9 text-sm",
                              (isActive(item.path || '') || isSubmenuActive(item.subItems))
                                ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium" 
                                : "text-gray-700 hover:bg-gray-100"
                            )}
                            onClick={() => {
                              if (item.path) {
                                navigate(item.path);
                              }
                              toggleSubmenu(item.path || item.label);
                            }}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="flex-1 text-left">{item.label}</span>
                            {expandedSubmenus.includes(item.path || item.label) ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </Button>
                          
                          {/* Submenu items */}
                          {expandedSubmenus.includes(item.path || item.label) && (
                            <div className="mt-1 space-y-1 pl-6">
                              {item.subItems.map((subItem) => (
                                <Button
                                  key={subItem.path}
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start gap-3 h-8 text-sm",
                                    isActive(subItem.path || '') 
                                      ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium" 
                                      : "text-gray-600 hover:bg-gray-100"
                                  )}
                                  onClick={() => subItem.path && navigate(subItem.path)}
                                >
                                  <subItem.icon className="w-3.5 h-3.5" />
                                  <span className="flex-1 text-left text-xs">{subItem.label}</span>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Regular item without submenu */
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 h-9 text-sm",
                            isActive(item.path || '') 
                              ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium" 
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                          onClick={() => item.path && navigate(item.path)}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10">
                <UserIcon className="w-4 h-4 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </p>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {user?.role || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Get logout function from parent
              const logoutEvent = new CustomEvent('sidebar-logout');
              window.dispatchEvent(logoutEvent);
            }}
            className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children }: LayoutProps) => {
  // Sidebar default: open on desktop, CLOSED on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint - hanya buka di desktop
    }
    return false; // Default closed untuk safety
  });
  const navigate = useNavigate();
  const { user: authUser, session, logout: handleLogout, loading: authLoading } = useAuth();

  // Listen for logout event from sidebar
  useEffect(() => {
    const handleSidebarLogout = () => {
      handleLogout();
    };
    window.addEventListener('sidebar-logout', handleSidebarLogout);
    return () => window.removeEventListener('sidebar-logout', handleSidebarLogout);
  }, [handleLogout]);

  // Single useEffect for all navigation logic - MUST be called before any early returns
  useEffect(() => {
    // Prevent redirect if already on auth page or if we're in the middle of logout
    if (window.location.pathname === '/auth') {
      return;
    }

    // Add timeout to prevent infinite redirect loop - reduced to 3 seconds
    const timeoutId = setTimeout(() => {
      if (authLoading && window.location.pathname !== '/auth') {
        console.warn("⚠️ [Layout] Auth loading timeout after 3 seconds - redirecting to auth page");
        navigate("/auth", { replace: true });
      }
    }, 3000); // 3 seconds timeout (reduced from 6)

    // Redirect if no user after loading completes - use replace to prevent back button issues
    if (!authLoading && !authUser && !session && window.location.pathname !== '/auth') {
      navigate("/auth", { replace: true });
    }

    return () => clearTimeout(timeoutId);
  }, [authUser, session, authLoading, navigate]);

  // Auto-close sidebar on mobile when location changes
  const location = useLocation();
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Redirect santri users to their profile page when they land on dashboard
  useEffect(() => {
    if (!authUser || authLoading) return;
    if (location.pathname === '/auth') return; // Skip check for auth page
    
    // If user is santri and on dashboard (/), redirect to their profile
    if (authUser.role === 'santri' && authUser.santriId && location.pathname === '/') {
      navigate(`/santri/profile/${authUser.santriId}/informasi`, { replace: true });
      return;
    }
  }, [authUser, location.pathname, authLoading, navigate]);

  // Route protection: Check if user has permission to access current route
  useEffect(() => {
    if (!authUser || authLoading) return;
    if (location.pathname === '/auth') return; // Skip check for auth page
    
    // Check if user can access current path
    const canAccess = canAccessPathWithUser(authUser, location.pathname);
    
    if (!canAccess) {
      console.warn(`[Layout] User ${authUser.email} (${authUser.role}) does not have permission to access ${location.pathname}, redirecting to dashboard`);
      // Redirect to dashboard if user doesn't have permission
      // Note: Santri users will be redirected to their profile by the redirect logic above
      navigate('/', { replace: true });
    }
  }, [authUser, location.pathname, authLoading, navigate]);

  // All hooks must be called before early returns
  // Show loading only if actually loading (not timeout)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground mt-2">
            If this takes too long, check console for errors
          </p>
        </div>
      </div>
    );
  }

  // If no user after loading, show redirect message
  if (!authUser || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check if user is santri - hide sidebar for santri
  const isSantri = authUser?.role === 'santri';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay - Hidden for santri */}
      {!isSantri && sidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 flex flex-col max-w-xs w-full bg-white shadow-xl h-screen z-[101]">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar - collapsible - Hidden for santri */}
      {!isSantri && (
        <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'}`}>
          <div className={`flex flex-col w-64 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'}`}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Hide menu button for santri */}
                {!isSantri && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <img 
                      src="/kop-albisri.png" 
                      alt="Menu" 
                      className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                    />
                  </button>
                )}
                {/* Show logo without button for santri */}
                {isSantri && (
                  <img 
                    src="/kop-albisri.png" 
                    alt="Logo" 
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                  />
                )}
                <h1 className="text-sm sm:text-base font-bold text-gray-900">
                  Pesantren Anak Yatim Al-Bisri
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                  {authUser?.role || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="py-4 sm:py-6">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
