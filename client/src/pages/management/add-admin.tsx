
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, UserPlus } from "lucide-react";
import { AdminManagement } from "@/components/admin/admin-management";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export default function AddAdminPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const checkAdminAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Access Denied", description: "Please login as admin", variant: "destructive" });
        setLocation("/admin/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        toast({ title: "Access Denied", description: "Admin privileges required", variant: "destructive" });
        setLocation("/admin/login");
        return;
      }

      setAdminUser(userData);
    };

    checkAdminAuth();
  }, [setLocation, toast]);

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              Admin Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminManagement
              currentAdminEmail={adminUser.email}
              currentAdminRole={adminUser.role}
              isOpen={true}
              onClose={() => setLocation("/admin/dashboard")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
