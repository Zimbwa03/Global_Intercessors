import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First check if admin role exists in database
      const { data: adminData, error: adminCheckError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (adminCheckError) {
        if (adminCheckError.code === '42P01') {
          throw new Error('Database tables not found. Please run the Supabase setup script first.');
        } else if (adminCheckError.code === 'PGRST116') {
          throw new Error('Access denied. Email not found in admin users. Please use /create-admin first.');
        } else {
          throw new Error(`Database error: ${adminCheckError.message}`);
        }
      }

      if (!adminData) {
        throw new Error('Access denied. Email not found in admin users. Please use /create-admin first.');
      }

      console.log('Admin record found:', adminData);

      // Get current session first
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user?.email === email) {
        // User is already logged in with the correct email
        toast({
          title: "Admin Login Successful", 
          description: "Welcome to the Global Intercessors Admin Panel",
        });
        setLocation("/admin/dashboard");
        return;
      }

      // Try to sign in with password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If sign in fails, try to sign up (first time setup)
        console.log('Sign in failed, attempting sign up for admin...');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'admin',
              full_name: adminData.email.split('@')[0] // Use email prefix as name
            }
          }
        });

        if (signUpError) {
          throw new Error(`Authentication failed: ${signUpError.message}`);
        }

        if (signUpData.user) {
          toast({
            title: "Admin Account Created",
            description: "Your admin account has been created successfully.",
          });
        }
      }

      // Check if we have a valid user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Authentication failed - no user session');
      }

      toast({
        title: "Admin Login Successful", 
        description: "Welcome to the Global Intercessors Admin Panel",
      });

      setLocation("/admin/dashboard");
      
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials or insufficient privileges",
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
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-alt text-white text-2xl"></i>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Admin Portal</CardTitle>
          <p className="text-gray-600">Global Intercessors Management</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@globalintercessors.org"
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use the same email added via /create-admin
              </p>
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password for new account"
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                First time? This will create your auth account
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Verifying...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Admin Login / Sign Up
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <h4 className="font-semibold text-blue-800 mb-2">First Time Login?</h4>
            <ol className="text-blue-700 space-y-1 text-xs">
              <li>1. Your email must be added via /create-admin first</li>
              <li>2. Enter your email and create a new password</li>
              <li>3. This will create your Supabase Auth account</li>
              <li>4. Future logins use the same credentials</li>
            </ol>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Access restricted to authorized administrators only
            </p>
            <Button
              variant="link"
              onClick={() => setLocation("/")}
              className="text-blue-600 text-sm mt-2"
            >
              Back to Main Site
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}