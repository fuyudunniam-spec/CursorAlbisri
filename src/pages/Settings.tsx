import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Shield, 
  Key, 
  Database, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Copy,
  Trash2
} from 'lucide-react';
import { getPermissionMatrix, type AppRole } from '@/utils/permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const Settings = () => {
  const { user, session, setTestRole, testRoleOverride, refreshRole } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRoleChange = (newRole: string) => {
    if (newRole === 'none') {
      setTestRole(null);
      toast.success('Role override cleared. Using role from database.');
    } else {
      setTestRole(newRole);
      toast.success(`Role switched to: ${newRole}. This is for testing only and will not persist.`);
    }
    // Small delay to ensure state update
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleRefreshRole = async () => {
    setIsRefreshing(true);
    try {
      await refreshRole();
      toast.success('Role refreshed from database');
    } catch (error) {
      toast.error('Failed to refresh role');
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const clearRoleOverride = () => {
    setTestRole(null);
    toast.success('Role override cleared');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (!user || !session) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading user information...</p>
        </div>
      </div>
    );
  }

  const permissionMatrix = getPermissionMatrix();
  const allRoles: AppRole[] = ['admin', 'admin_keuangan', 'admin_inventaris', 'admin_akademik', 'pengurus', 'santri'];

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and view permissions
          </p>
        </div>
      </div>

      {/* User Info Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>User Information</CardTitle>
          </div>
          <CardDescription>
            Your account details and authentication information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-medium">{user.email || 'N/A'}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(user.email || '', 'Email')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-sm font-medium mt-1">
                {user.profile?.full_name || user.name || 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{user.id}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(user.id, 'User ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">All Roles</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">No roles assigned</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Role Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Current Role</CardTitle>
          </div>
          <CardDescription>
            Your active role determines what modules and features you can access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Active Role
              </label>
              <div className="flex items-center gap-3">
                <Badge variant={testRoleOverride ? "default" : "secondary"} className="text-lg px-3 py-1">
                  {user.role}
                </Badge>
                {testRoleOverride && (
                  <Badge variant="outline" className="text-xs">
                    Override Active
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshRole}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {testRoleOverride && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Role override is active. Your actual role from database is different.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRoleOverride}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Override
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Role Switcher Section (for testing) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle>Role Switcher</CardTitle>
          </div>
          <CardDescription>
            Switch roles for testing purposes. This does not change your actual role in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is a development/testing feature. Changing role here only affects the UI for your current session.
              Your actual role in the database remains unchanged.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Role to Test</label>
            <Select
              value={testRoleOverride || 'none'}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2">
                    <span>Use Database Role</span>
                    {!testRoleOverride && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </span>
                </SelectItem>
                {allRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role === testRoleOverride && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 inline mr-2" />
                    )}
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Permission Matrix</CardTitle>
          </div>
          <CardDescription>
            View which modules each role can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Accessible Modules</th>
                </tr>
              </thead>
              <tbody>
                {allRoles.map((role) => {
                  const modules = permissionMatrix[role] || [];
                  const isCurrentRole = user.role === role;
                  
                  return (
                    <tr
                      key={role}
                      className={`border-b hover:bg-muted/50 ${isCurrentRole ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={isCurrentRole ? "default" : "secondary"}>
                            {role}
                          </Badge>
                          {isCurrentRole && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {modules.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No access</span>
                          ) : (
                            modules.map((module) => (
                              <Badge
                                key={module}
                                variant="outline"
                                className="text-xs"
                              >
                                {module}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Debug Information</CardTitle>
          </div>
          <CardDescription>
            Technical details for debugging purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Session ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1 truncate">
                  {session?.access_token?.substring(0, 20)}...
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(session?.access_token || '', 'Session Token')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Session Expires</label>
              <p className="text-sm font-medium mt-1">
                {session?.expires_at
                  ? new Date(session.expires_at * 1000).toLocaleString()
                  : 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
              <div className="flex items-center gap-2 mt-1">
                {session?.user?.email_confirmed_at ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">Not Verified</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Environment</label>
              <p className="text-sm font-medium mt-1">
                {import.meta.env.MODE || 'development'}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Full User Object (JSON)
            </label>
            <div className="relative">
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-64 font-mono">
                {JSON.stringify({ user, session: { ...session, access_token: '[REDACTED]' } }, null, 2)}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(
                  JSON.stringify({ user, session }, null, 2),
                  'User Object'
                )}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

