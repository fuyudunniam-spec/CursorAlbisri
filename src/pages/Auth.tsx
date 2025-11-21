import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Use timeout untuk prevent hang
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 2000)
        );
        
        const result: any = await Promise.race([sessionPromise, timeoutPromise]);
        if (result?.data?.session) {
          navigate('/');
        }
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let loginIdentifier = loginEmail.trim().toUpperCase();
      
      // Check if input is id_santri format (8 chars alphanumeric)
      const isIdSantri = /^[A-Z0-9]{8}$/.test(loginIdentifier);
      
      let emailToUse = loginIdentifier;
      if (isIdSantri) {
        // Convert id_santri to email format
        emailToUse = `${loginIdentifier}@pondoksukses.local`;
        console.log('🔐 [Auth] Detected id_santri login:', loginIdentifier, '→', emailToUse);
      } else {
        // Regular email login
        emailToUse = loginIdentifier.toLowerCase();
      }
      
      console.log('🔐 [Auth] Attempting login for:', emailToUse);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: loginPassword,
      });

      if (error) {
        console.error('❌ [Auth] Login error:', error);
        if (isIdSantri && error.message.includes('Invalid login')) {
          setError('ID Santri atau password salah. Pastikan akun Anda sudah dibuat oleh admin.');
        } else {
          setError(error.message || 'Email/ID Santri atau password salah');
        }
      } else {
        console.log('✅ [Auth] Login successful!', { userId: data.user?.id, email: data.user?.email });
        
        // Wait a bit for session to be set in localStorage
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify session was created with timeout
        const verifySession = async () => {
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((resolve) => 
              setTimeout(() => resolve({ data: { session: null } }), 2000)
            );
            const result: any = await Promise.race([sessionPromise, timeoutPromise]);
            return result?.data?.session;
          } catch (err) {
            console.error('Error verifying session:', err);
            return null;
          }
        };
        
        const session = await verifySession();
        if (session) {
          console.log('✅ [Auth] Session verified, redirecting...');
          setSuccess('Login berhasil!');
        } else {
          // Even if getSession timeout, if login was successful, data.user exists
          // So we can still redirect - useAuth will pick up session from localStorage
          console.log('⚠️ [Auth] getSession timeout, but login data exists. Redirecting anyway...');
          setSuccess('Login berhasil!');
        }
        
        // Check user role to determine redirect destination
        // For santri, redirect to their profile page
        setTimeout(async () => {
          try {
            // Try to get user role from session metadata or check via RPC
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            
            if (checkSession?.user?.id) {
              // Check if user is santri by checking user_roles or santri table
              const { data: rolesData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', checkSession.user.id)
                .limit(1);
              
              const isSantri = rolesData?.some(r => r.role === 'santri');
              
              if (isSantri) {
                // Get santri ID using RPC function with timeout and error handling
                let santriData: any = null;
                let santriError: any = null;
                
                try {
                  const result: any = await Promise.race([
                    supabase.rpc('get_santri_by_user_id', { p_user_id: checkSession.user.id }),
                    new Promise((resolve) => 
                      setTimeout(() => resolve({ data: null, error: { message: 'RPC timeout' } }), 3000)
                    )
                  ]);
                  
                  santriData = result.data;
                  santriError = result.error;
                  
                  // Check if it's a CORS/network error - silently fail
                  if (santriError && (
                    santriError.message?.includes('CORS') || 
                    santriError.message?.includes('520') || 
                    santriError.message?.includes('523') || 
                    santriError.message?.includes('Failed to fetch') ||
                    santriError.message?.includes('unreachable') ||
                    santriError.message?.includes('Access-Control-Allow-Origin')
                  )) {
                    santriError = null; // Silently ignore network errors
                    santriData = null;
                  }
                } catch (err: any) {
                  // Silently handle network errors
                  if (!err?.message?.includes('CORS') && 
                      !err?.message?.includes('520') && 
                      !err?.message?.includes('523') && 
                      !err?.message?.includes('Failed to fetch')) {
                    console.warn('⚠️ [Auth] Error fetching santri data:', err);
                  }
                  santriError = err;
                  santriData = null;
                }
                
                // RPC returns array, get first item
                const santri = Array.isArray(santriData) && santriData.length > 0 ? santriData[0] : null;
                
                if (santri?.id) {
                  console.log('🔐 [Auth] Redirecting santri to profile:', {
                    santriId: santri.id,
                    idSantri: santri.id_santri,
                    nama: santri.nama_lengkap
                  });
                  // Redirect to santri profile
                  window.location.href = `/santri/profile?santriId=${santri.id}&santriName=${encodeURIComponent(santri.nama_lengkap || 'Santri')}`;
                  return;
                } else {
                  console.warn('⚠️ [Auth] Santri role detected but santri data not found:', santriError);
                }
              }
            }
            
            // Default redirect to dashboard for admin/staff
            window.location.href = '/';
          } catch (err) {
            console.error('Error determining redirect:', err);
            // Fallback to dashboard
            window.location.href = '/';
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('❌ [Auth] Login exception:', err);
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: registerFullName,
            phone: registerPhone,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        if (data.user && !data.user.email_confirmed_at) {
          setSuccess('Pendaftaran berhasil! Silakan cek email untuk konfirmasi.');
        } else {
          setSuccess('Pendaftaran berhasil!');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan saat pendaftaran');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Logo and Header Section */}
        <div className="text-center space-y-4">
          {/* Logo - Large on desktop, proportional on mobile */}
          <div className="flex justify-center">
            <img 
              src="/kop-albisri.png" 
              alt="Logo Pesantren Al-Bisri" 
              className="h-24 w-auto sm:h-32 md:h-40 object-contain"
            />
          </div>
          
          {/* Welcome Text */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">
              Selamat Datang di E-Maktab
            </h1>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-700">
              Pesantren Anak Yatim Al-Bisri
            </h2>
          </div>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100">
            <TabsTrigger value="login" className="data-[state=active]:bg-white">Masuk</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-white">Daftar</TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="login">
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold text-slate-800">Masuk ke Akun</CardTitle>
                <CardDescription className="text-slate-600">
                  Masukkan email dan password Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-700 font-medium">ID Santri atau Email</Label>
                    <Input
                      id="login-email"
                      type="text"
                      placeholder="admin@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      style={{ textTransform: 'none' }}
                    />
                    <p className="text-xs text-slate-500">
                      Santri: gunakan ID Santri Anda. Admin/Staff: gunakan email.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-slate-700 font-medium">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 transition-colors" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Masuk
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold text-slate-800">Daftar Akun Baru</CardTitle>
                <CardDescription className="text-slate-600">
                  Buat akun baru untuk mengakses sistem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-fullname" className="text-slate-700 font-medium">Nama Lengkap</Label>
                    <Input
                      id="register-fullname"
                      type="text"
                      placeholder="Masukkan nama lengkap"
                      value={registerFullName}
                      onChange={(e) => setRegisterFullName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      style={{ textTransform: 'none' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-slate-700 font-medium">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      style={{ textTransform: 'none' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone" className="text-slate-700 font-medium">No. Telepon</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      disabled={isLoading}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                      style={{ textTransform: 'none' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-slate-700 font-medium">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 transition-colors" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Daftar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
