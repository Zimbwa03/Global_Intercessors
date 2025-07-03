import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function CreateAdmin() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if admin already exists
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingAdmin) {
        toast({
          title: "Admin Already Exists",
          description: `${email} is already registered as an admin`,
          variant: "destructive",
        });
        return;
      }

      // Insert new admin directly into Supabase
      const { data: newAdmin, error: insertError } = await supabase
        .from('admin_users')
        .insert([{
          email: email,
          role: 'admin',
          is_active: true
        }])
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast({
        title: "Admin Created Successfully",
        description: `${email} has been added as an administrator and can now log in`,
      });
      
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Failed to Create Admin",
        description: error.message || "Unable to create admin user. Make sure the database tables are set up.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gi-primary/600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user-plus text-white text-2xl"></i>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Create Admin User</CardTitle>
          <p className="text-gray-600">Add new administrator to Global Intercessors</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <Label htmlFor="email">Admin Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This email must match the one used for authentication
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gi-primary/600 hover:bg-gi-primary/700 text-white"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus mr-2"></i>
                  Create Admin User
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gi-primary/50 rounded-lg">
            <h4 className="font-semibold text-gi-primary/800 mb-2">Instructions:</h4>
            <ol className="text-sm text-gi-primary/700 space-y-1">
              <li>1. Enter the email address of the person you want to make an admin</li>
              <li>2. They must first create a regular account using that same email</li>
              <li>3. After creating the admin role, they can access /admin/login</li>
              <li>4. Admin privileges will be verified during login</li>
            </ol>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => window.location.href = "/"}
              className="text-gi-primary/600 text-sm"
            >
              Back to Main Site
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}