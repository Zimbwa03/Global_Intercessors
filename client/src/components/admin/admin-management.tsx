import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { UserPlus, Crown, Shield, Trash2, User, Eye, EyeOff } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

interface AdminManagementProps {
  currentAdminEmail: string;
  currentAdminRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminManagement({ currentAdminEmail, currentAdminRole, isOpen, onClose }: AdminManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Check if current user can create the selected role
  const canCreateRole = (targetRole: string) => {
    if (currentAdminRole === 'super_admin') return true;
    if (currentAdminRole === 'admin' && targetRole === 'admin') return true;
    return false;
  };

  // Fetch all admin users
  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdminUser[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Create new admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'super_admin' }) => {
      // First check if user exists in user_profiles (i.e., is registered as intercessor)
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (profileError || !userProfile) {
        throw new Error('User must be registered as an intercessor first. Please ask them to create an account at the main website.');
      }

      // Check admin creation permissions via database function
      const { data: canCreate, error: permissionError } = await supabase
        .rpc('can_create_admin', {
          creator_email: currentAdminEmail,
          target_role: role
        });

      if (permissionError || !canCreate) {
        throw new Error('You do not have permission to create this type of admin account.');
      }

      // Create the admin user
      const { data, error } = await supabase
        .from('admin_users')
        .insert([{
          email,
          role,
          is_active: true,
          created_by: currentAdminEmail
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('This user is already an admin.');
        }
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Admin Created Successfully",
        description: `${data.email} has been added as ${data.role === 'super_admin' ? 'Super Admin' : 'Admin'}`,
      });
      setNewAdminEmail('');
      setNewAdminRole('admin');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Admin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle admin active status
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!canCreateRole(newAdminRole)) {
      toast({
        title: "Permission Denied",
        description: "You cannot create this type of admin account",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAdmin(true);
    try {
      await createAdminMutation.mutateAsync({ email: newAdminEmail.trim(), role: newAdminRole });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const getRoleIcon = (role: string) => {
    return role === 'super_admin' ? <Crown className="w-4 h-4 text-yellow-500" /> : <Shield className="w-4 h-4 text-blue-500" />;
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'super_admin' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-blue-100 text-blue-800 border-blue-300';
  };

  // Handle dialog state changes
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Admin Management
          </DialogTitle>
          <DialogDescription>
            Manage admin users for Global Intercessors. Only registered intercessors can be made admins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Admin Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-email">Email Address *</Label>
                    <Input
                      id="admin-email"
                      name="admin-email"
                      type="email"
                      placeholder="Enter intercessor's email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="mt-1"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      User must already be registered as an intercessor
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="admin-role">Admin Role *</Label>
                    <Select value={newAdminRole} onValueChange={(value: 'admin' | 'super_admin') => setNewAdminRole(value)}>
                      <SelectTrigger id="admin-role" name="admin-role" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin" disabled={!canCreateRole('admin')}>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500" />
                            Admin
                          </div>
                        </SelectItem>
                        {currentAdminRole === 'super_admin' && (
                          <SelectItem value="super_admin">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-yellow-500" />
                              Super Admin
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isCreatingAdmin || !canCreateRole(newAdminRole)}
                  className="w-full md:w-auto"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isCreatingAdmin ? 'Creating Admin...' : 'Create Admin'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Admins List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Admins ({adminUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading admin users...</p>
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No admin users found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adminUsers.map((admin) => (
                    <div
                      key={admin.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        admin.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(admin.role)}
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{admin.email}</p>
                            {admin.email === currentAdminEmail && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-xs ${getRoleBadgeColor(admin.role)}`}>
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Created {new Date(admin.created_at).toLocaleDateString()}
                            </span>
                            {admin.created_by && (
                              <span className="text-xs text-gray-500">
                                by {admin.created_by}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Don't allow disabling yourself or other super admins if you're not super admin */}
                        {admin.email !== currentAdminEmail && 
                         (currentAdminRole === 'super_admin' || admin.role !== 'super_admin') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleAdminMutation.mutate({ 
                              id: admin.id, 
                              isActive: !admin.is_active 
                            })}
                          >
                            {admin.is_active ? (
                              <EyeOff className="w-4 h-4 text-red-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permission Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Your Permissions ({currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin'}):</p>
                  <ul className="space-y-1 text-xs">
                    {currentAdminRole === 'super_admin' ? (
                      <>
                        <li>✅ Create Super Admins</li>
                        <li>✅ Create Regular Admins</li>
                        <li>✅ Disable any admin account</li>
                        <li>✅ Full system access</li>
                      </>
                    ) : (
                      <>
                        <li>✅ Create Regular Admins</li>
                        <li>❌ Cannot create Super Admins</li>
                        <li>❌ Cannot disable Super Admins</li>
                        <li>✅ Full admin dashboard access</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
