import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { canAccessPath, canAccessModule } from '@/utils/permissions';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  PiggyBank, 
  Heart, 
  Package, 
  ShoppingCart, 
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  CheckCircle,
  Crown,
  GraduationCap,
  FileText,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Award,
  UserCog,
  Key,
  BookOpen,
  HandCoins
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
  path: string;
  badge?: string;
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
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'DASHBOARD',
    'SANTRI',
    'KEUANGAN',
    'INVENTARIS',
    'AKADEMIK',
    'ADMINISTRASI'
  ]);

  // Check feature flag for module dashboards
  const showModuleDashboards = getFeature('MODULE_DASHBOARD_ALPHA');

  // Reorganized menu structure with modules and sub-modules
  const reorganizedMenuSections: MenuSection[] = [
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
        ...(showModuleDashboards ? [{ icon: LayoutDashboard, label: 'Dashboard Santri', path: '/santri-dashboard' }] : []),
        { icon: Users, label: 'Data Santri', path: '/santri' }
      ]
    },
    {
      title: 'KEUANGAN',
      icon: DollarSign,
      items: [
        ...(showModuleDashboards ? [{ icon: LayoutDashboard, label: 'Dashboard Keuangan', path: '/keuangan-dashboard' }] : []),
        { icon: TrendingUp, label: 'Keuangan Umum', path: '/keuangan-v3' },
        { icon: FileText, label: 'Pembayaran Santri', path: '/tagihan-santri' },
        { icon: PiggyBank, label: 'Tabungan Santri', path: '/tabungan-santri' },
        { icon: Heart, label: 'Donasi', path: '/donasi' }
      ]
    },
    {
      title: 'INVENTARIS',
      icon: Package,
      items: [
        ...(showModuleDashboards ? [{ icon: LayoutDashboard, label: 'Dashboard Inventaris', path: '/inventaris' }] : []),
        { icon: Package, label: 'Master Data', path: '/inventaris/master' },
        { icon: ShoppingCart, label: 'Penjualan', path: '/inventaris/sales' },
        { icon: Users, label: 'Distribusi', path: '/inventaris/distribution' },
        { icon: FileText, label: 'Riwayat', path: '/inventaris/transactions' },
        { icon: BarChart3, label: 'Koperasi', path: '/koperasi' }
      ]
    },
    {
      title: 'AKADEMIK',
      icon: GraduationCap,
      items: [
        ...(showModuleDashboards ? [{ icon: LayoutDashboard, label: 'Dashboard Akademik', path: '/akademik' }] : []),
        { icon: BookOpen, label: 'Master Kelas', path: '/akademik/master' },
        { icon: Crown, label: 'Ploating Kelas', path: '/akademik/kelas' },
        { icon: FileText, label: 'Absensi Madin', path: '/akademik/absensi' },
        { icon: FileText, label: 'Setoran Harian', path: '/akademik/setoran' },
        { icon: BarChart3, label: 'Monitoring Akademik', path: '/monitoring' }
      ]
    },
    {
      title: 'ADMINISTRASI',
      icon: Settings,
      items: [
        ...(showModuleDashboards ? [{ icon: LayoutDashboard, label: 'Dashboard Admin', path: '/administrasi' }] : []),
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: UserCog, label: 'Kelola Akun Santri', path: '/admin/santri-accounts' },
        { icon: Key, label: 'Ubah Password', path: '/change-password' }
      ]
    }
  ];

  // Sidebar khusus untuk SANTRI (fokus ke profil sendiri)
  const isSantri = user?.role === 'santri';
  const santriProfileBase = `/santri/profile?santriId=${user?.santriId || ''}&santriName=${encodeURIComponent(user?.name || 'Santri')}`;
  const santriMenuSections: MenuSection[] = [
    {
      title: 'PROFIL',
      icon: UserIcon,
      items: [
        { icon: UserIcon, label: 'Ringkasan', path: santriProfileBase },
        { icon: BookOpen, label: 'Akademik', path: `${santriProfileBase}&tab=academic` },
        { icon: BookOpen, label: 'Program / Kelas', path: `${santriProfileBase}&tab=program` }
      ]
    },
    {
      title: 'TABUNGAN',
      icon: DollarSign,
      items: [
        { icon: DollarSign, label: 'Saldo & Riwayat', path: `/tabungan?santriId=${user?.santriId || ''}` }
      ]
    },
    {
      title: 'DOKUMEN',
      icon: FileText,
      items: [
        { icon: FileText, label: 'Wajib & Optional', path: `${santriProfileBase}&tab=documents` }
      ]
    },
    {
      title: 'BANTUAN',
      icon: HandCoins,
      items: [
        { icon: HandCoins, label: 'Ringkasan Bantuan', path: `${santriProfileBase}&tab=bantuan` }
      ]
    },
    {
      title: 'AKUN',
      icon: Key,
      items: [
        { icon: Key, label: 'Ubah Password', path: '/change-password' }
      ]
    }
  ];

  // Filter menu sections and items based on user role
  const filterMenuByRole = (sections: MenuSection[]): MenuSection[] => {
    if (!user) return [];

    return sections
      .map((section) => {
        // Map section title to module name for permission check
        const sectionModuleMap: Record<string, string> = {
          'DASHBOARD': 'dashboard',
          'SANTRI': 'santri',
          'KEUANGAN': 'keuangan',
          'INVENTARIS': 'inventaris',
          'AKADEMIK': 'monitoring',
          'ADMINISTRASI': 'settings'
        };

        const moduleName = sectionModuleMap[section.title];
        
        // Check if user can access this section
        const canAccessSection = moduleName ? canAccess(moduleName) : true;

        if (!canAccessSection) {
          return null;
        }

        // Filter items within section
        const filteredItems = section.items.filter((item) => {
          return canAccessPath(user.role, item.path);
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
  };

  // Use filtered structure based on role
  const effectiveSections = isSantri ? santriMenuSections : reorganizedMenuSections;
  const menuSections = filterMenuByRole(effectiveSections);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Al-Bisri</h1>
        <p className="text-sm text-gray-600">Sistem Manajemen LKSA</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                  {section.items.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-9 text-sm",
                        isActive(item.path) 
                          ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium" 
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                      onClick={() => navigate(item.path)}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
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
      </div>
    </div>
  );
};

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop default open
  const navigate = useNavigate();
  const { user: authUser, session, logout: handleLogout, loading: authLoading } = useAuth();

  // Single useEffect for all navigation logic - MUST be called before any early returns
  useEffect(() => {
    // Add timeout to prevent infinite redirect loop
    const timeoutId = setTimeout(() => {
      if (authLoading) {
        console.warn("⚠️ [Layout] Auth loading timeout - redirecting to auth page");
        navigate("/auth");
      }
    }, 6000); // 6 seconds timeout

    // Redirect if no user after loading completes
    if (!authLoading && !authUser && !session && window.location.pathname !== '/auth') {
      navigate("/auth");
    }

    return () => clearTimeout(timeoutId);
  }, [authUser, session, authLoading, navigate]);

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="text-white"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar - collapsible */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'}`}>
        <div className={`flex flex-col w-64 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'}`}>
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="w-6 h-6" />
                </Button>
                <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline">{authUser?.role || 'Unknown'}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
