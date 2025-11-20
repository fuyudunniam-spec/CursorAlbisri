import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RefreshCw, Key, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { getSantriAccounts, createSantriAccount, resetSantriPassword, deleteSantriAccount, type SantriAccountInfo } from '@/services/santriAuth.service';

export default function SantriAccountManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SantriAccountInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create form state
  const [createIdSantri, setCreateIdSantri] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  
  // Reset form state
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');

  // Fetch santri accounts
  const { data: accounts, isLoading, error, refetch } = useQuery({
    queryKey: ['santri-accounts'],
    queryFn: getSantriAccounts,
    enabled: isAdmin,
  });

  // Filter accounts by search term
  const filteredAccounts = accounts?.filter(acc => 
    acc.idSantri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.namaLengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Create account mutation
  const createMutation = useMutation({
    mutationFn: ({ idSantri, password }: { idSantri: string; password: string }) =>
      createSantriAccount(idSantri, password),
    onSuccess: () => {
      toast.success('Akun berhasil dibuat!');
      setShowCreateDialog(false);
      setCreateIdSantri('');
      setCreatePassword('');
      queryClient.invalidateQueries({ queryKey: ['santri-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal membuat akun');
    },
  });

  // Reset password mutation
  const resetMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      resetSantriPassword(userId, password),
    onSuccess: () => {
      toast.success('Password berhasil direset!');
      setShowResetDialog(false);
      setResetPassword('');
      setSelectedAccount(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal reset password');
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteSantriAccount(userId),
    onSuccess: () => {
      toast.success('Akun berhasil dihapus!');
      setShowDeleteDialog(false);
      setSelectedAccount(null);
      queryClient.invalidateQueries({ queryKey: ['santri-accounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus akun');
    },
  });

  const handleCreate = () => {
    if (!createIdSantri || !createPassword) {
      toast.error('ID Santri dan Password harus diisi');
      return;
    }
    if (createPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    createMutation.mutate({ idSantri: createIdSantri.toUpperCase(), password: createPassword });
  };

  const handleResetPassword = () => {
    if (!selectedAccount?.userId || !resetPassword) {
      toast.error('Password harus diisi');
      return;
    }
    if (resetPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    resetMutation.mutate({ userId: selectedAccount.userId, password: resetPassword });
  };

  const handleDelete = () => {
    if (!selectedAccount?.userId) return;
    deleteMutation.mutate(selectedAccount.userId);
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Anda tidak memiliki akses untuk mengelola akun santri. Hanya admin yang dapat mengakses halaman ini.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kelola Akun Santri</h1>
          <p className="text-muted-foreground mt-1">
            Buat, reset password, dan hapus akun untuk santri
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Akun Baru
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Cari ID Santri, Nama, atau Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Accounts List */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading accounts: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4">
          {filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchTerm ? 'Tidak ada akun yang sesuai dengan pencarian' : 'Belum ada akun santri dibuat'}
              </CardContent>
            </Card>
          ) : (
            filteredAccounts.map((account) => (
              <Card key={account.santriId}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{account.namaLengkap}</h3>
                        <Badge variant={account.statusAkun === 'Aktif' ? 'default' : 'secondary'}>
                          {account.statusAkun}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-mono">{account.idSantri}</span> • {account.email}
                      </p>
                      {account.lastSignIn && (
                        <p className="text-xs text-muted-foreground">
                          Login terakhir: {new Date(account.lastSignIn).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {account.statusAkun === 'Aktif' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowResetDialog(true);
                            }}
                          >
                            <Key className="w-4 h-4 mr-2" />
                            Reset Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                          </Button>
                        </>
                      )}
                      {account.statusAkun === 'Belum Dibuat' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCreateIdSantri(account.idSantri);
                            setShowCreateDialog(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Buat Akun
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Akun Santri</DialogTitle>
            <DialogDescription>
              Buat akun login untuk santri. Mereka akan login menggunakan ID Santri sebagai username.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-id-santri">ID Santri</Label>
              <Input
                id="create-id-santri"
                value={createIdSantri}
                onChange={(e) => setCreateIdSantri(e.target.value.toUpperCase())}
                placeholder="BM240001"
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password Awal</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showCreatePassword ? 'text' : 'password'}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  disabled={createMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                >
                  {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Santri dapat mengubah password ini setelah login pertama kali.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={createMutation.isPending}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Buat Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password untuk <strong>{selectedAccount?.namaLengkap}</strong> ({selectedAccount?.idSantri})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  disabled={resetMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={resetMutation.isPending}>
              Batal
            </Button>
            <Button onClick={handleResetPassword} disabled={resetMutation.isPending}>
              {resetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Akun</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun untuk <strong>{selectedAccount?.namaLengkap}</strong> ({selectedAccount?.idSantri})?
              <br />
              <span className="text-destructive font-semibold">Tindakan ini tidak dapat dibatalkan.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleteMutation.isPending}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

