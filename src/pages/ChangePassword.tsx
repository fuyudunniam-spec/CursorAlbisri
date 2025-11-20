import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '@/services/santriAuth.service';
import { useAuth } from '@/hooks/useAuth';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Semua field harus diisi');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi password tidak cocok');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Password baru harus berbeda dengan password lama');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      toast.success('Password berhasil diubah!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.message || 'Gagal mengubah password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Ubah Password</CardTitle>
              <CardDescription>
                {user?.idSantri 
                  ? `Santri: ${user.idSantri} - ${user.name}`
                  : user?.email
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Password berhasil diubah! Anda akan dialihkan ke halaman utama.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="current-password">Password Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password lama"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password minimal 6 karakter
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/')}
                  disabled={isLoading}
                >
                  Batal
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ubah Password
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

