import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { AlertCircle, Shield, UserPlus } from "lucide-react";
import giLogoPath from "@/assets/GI_Logo_Main_1751586542563.png";

export default function CreateAdmin() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if current user is authorized to create admins
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthorized(false);
          return;
        }

        // Check if user is an admin
        const { data: adminData, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', user.email)
          .eq('is_active', true)
          .single();

        if (error || !adminData) {
          setIsAuthorized(false);
          return;
        }

        setCurrentUser({ ...user, adminRole: adminData.role });
        setIsAuthorized(true);
      } catch (error) {
        console.error('Authorization check failed:', error);
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!currentUser || !isAuthorized) {
        throw new Error('Unauthorized to create admin accounts');
      }

      // First check if target user exists in user_profiles (i.e., is registered as intercessor)
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (profileError || !userProfile) {
        toast({
          title: "User Not Found",
          description: "This email is not registered as an intercessor. They must create an account first.",
          variant: "destructive",
        });
        return;
      }

      // Check if admin already exists
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingAdmin) {
        toast({
          title: "Admin Already Exists",
          description: "An admin with this email already exists.",
          variant: "destructive",
        });
        return;
      }

      // Create new admin (only as regular admin from this interface)
      const { error } = await supabase
        .from('admin_users')
        .insert([
          {
            email: email,
            role: 'admin',
            is_active: true,
            created_by: currentUser.email
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('This user is already an admin.');
        }
        throw error;
      }

      toast({
        title: "Admin Created Successfully",
        description: `${email} has been added as an admin. They can now login at /admin/login`,
      });

      setEmail("");
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error Creating Admin",
        description: error.message || "There was an error creating the admin account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gi-primary/10 to-gi-gold/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="w-12 h-12 text-gi-primary mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Checking authorization...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gi-primary/10 to-gi-gold/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-700 mb-6">
                You must be logged in as an admin to access this page.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => setLocation('/admin/login')}
                  className="w-full bg-gi-primary hover:bg-gi-primary/90"
                >
                  Go to Admin Login
                </Button>
                <Button
                  onClick={() => setLocation('/admin/dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  Go to Admin Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gi-primary/10 to-gi-gold/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={giLogoPath} 
              alt="Global Intercessors" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gi-primary">
            Create Admin Account
          </CardTitle>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="font-medium">Logged in as: {currentUser?.email}</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Role: {currentUser?.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter intercessor's email address"
                required
              />
              <p className="text-xs text-gray-500">
                Note: User must already be registered as an intercessor
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gi-primary hover:bg-gi-primary/90"
              disabled={isLoading}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isLoading ? "Creating Admin..." : "Create Admin"}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation('/admin/dashboard')}
                className="text-sm text-gray-500"
              >
                Back to Admin Dashboard
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}