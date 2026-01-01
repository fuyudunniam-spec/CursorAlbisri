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

  // Check if user is already logged in (only on component mount)
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Skip check if logout is in progress to prevent redirect loop
        const isLoggingOut = sessionStorage.getItem('is_logging_out');
        if (isLoggingOut) {
          sessionStorage.removeItem('is_logging_out');
          return;
        }

        // Check for existing session with timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 2000)
        );
        
        const result: any = await Promise.race([sessionPromise, timeoutPromise]);
        if (result?.data?.session) {
          // User already has active session, redirect to dashboard
          // Layout component will handle routing (e.g., redirect santri to profile)
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };
    
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, don't re-run on every render

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const loginIdentifier = loginEmail.trim().toUpperCase();
      
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
        
        // Handle santri login errors with better messaging
        if (isIdSantri) {
          // Check for common login credential errors
          const errorMsg = error.message?.toLowerCase() || '';
          const errorStatus = (error as any).status || (error as any).code;
          const isCredentialError = 
            errorMsg.includes('invalid login') ||
            errorMsg.includes('invalid credentials') ||
            errorMsg.includes('email not confirmed') ||
            errorStatus === 400 ||
            errorStatus === 401;
          
          if (isCredentialError) {
            setError('Akun tidak ditemukan atau password salah. Jika akun Anda belum dibuat, silakan hubungi admin untuk membuatkan akun.');
          } else {
            setError(error.message || 'Terjadi kesalahan saat login. Silakan hubungi admin jika masalah berlanjut.');
          }
        } else {
          // Regular email login errors
          setError(error.message || 'Email atau password salah');
        }
      } else {
        console.log('✅ [Auth] Login successful!', { userId: data.user?.id, email: data.user?.email });
        setSuccess('Login berhasil! Mengarahkan...');
        
        // Redirect to dashboard - useAuth hook and Layout component will handle proper routing
        // This prevents race conditions and multiple redirects by centralizing redirect logic
        // For santri users, Layout will automatically redirect to their profile page
        navigate('/', { replace: true });
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

  // Handle logout if user is stuck
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Clear Session Button - for users who are stuck */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear Session
          </Button>
        </div>
        
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
                <CardTitle className="text-xl font-semibold text-slate-800">Daftar Akun Pengajar</CardTitle>
                <CardDescription className="text-slate-600">
                  Form pendaftaran khusus untuk Pengajar. Akun akan memerlukan persetujuan admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>Catatan Penting:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Form ini khusus untuk <strong>Pengajar</strong> yang ingin mendaftar</li>
                      <li>Akun Santri <strong>tidak dapat</strong> dibuat melalui form ini. Silakan hubungi admin</li>
                      <li>Setelah pendaftaran, akun Anda akan menunggu persetujuan admin</li>
                      <li>Anda akan menerima email notifikasi setelah akun disetujui</li>
                    </ul>
                  </AlertDescription>
                </Alert>
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
