import { useState, useEffect } from "react";
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

  // Handle email confirmation on component mount
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (data.session) {
        // User is already authenticated, check if they're an admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', data.session.user.email)
          .eq('is_active', true)
          .single();

        if (adminData) {
          toast({
            title: "Login Successful",
            description: "Welcome back to the Admin Panel",
          });
          setLocation("/admin/dashboard");
        }
      }
    };

    handleEmailConfirmation();
  }, []);

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

      // Try to sign in with the provided credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If it's invalid credentials, the auth account exists but wrong password
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid password. Please enter the correct password for your admin account.');
        } else if (signInError.message.includes('Email not confirmed')) {
          throw new Error('Your admin account exists but email is not confirmed. Please check your email for the confirmation link.');
        } else if (signInError.message.includes('User not found') || 
                   signInError.message.includes('Invalid email')) {
          console.log('Auth account not found, creating new auth account...');
          
          // Try to create new auth account for this admin
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                role: 'admin',
                full_name: adminData.email.split('@')[0]
              },
              emailRedirectTo: window.location.origin + '/admin/login'
            }
          });

          if (signUpError) {
            // If user already exists, it means wrong password was used
            if (signUpError.message.includes('User already registered') || 
                signUpError.message.includes('already been registered')) {
              throw new Error('Admin account exists but wrong password provided. Please use the correct password.');
            } else {
              throw new Error(`Account creation failed: ${signUpError.message}`);
            }
          }

          // Check if email confirmation is required
          if (signUpData.user && !signUpData.session) {
            toast({
              title: "Email Confirmation Required",
              description: "Please check your email and click the confirmation link, then try logging in again.",
              variant: "default",
            });
            return; // Stop execution here
          }

          if (signUpData.user && signUpData.session) {
            toast({
              title: "Admin Account Created",
              description: "Your admin authentication account has been created and you're now logged in.",
            });
          }
        } else {
          // Other auth errors
          throw new Error(`Login failed: ${signInError.message}`);
        }
      } else {
        // Sign in was successful
        console.log('Login successful:', signInData.user?.email);
        toast({
          title: "Welcome Back",
          description: "Successfully logged in to admin panel.",
        });
      }

      // Verify we have a valid authenticated user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Authentication failed - no valid user session');
      }

      // Verify the authenticated user matches the admin email
      if (currentUser.email !== email) {
        throw new Error('Email mismatch in authentication');
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
          <div className="flex justify-center mb-4">
            <img 
              src="/client/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
              alt="Global Intercessors Icon" 
              className="w-16 h-16 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                console.error('Admin login logo failed to load');
              }}
            />
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
              className="w-full hover:bg-gi-primary/700 text-white bg-[#104220f7]"
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

          <div className="mt-4 p-3 bg-gi-primary/50 rounded-lg text-sm">
            <h4 className="font-semibold text-gi-primary/800 mb-2">First Time Login?</h4>
            <ol className="text-gi-primary/700 space-y-1 text-xs">
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
              className="text-gi-primary/600 text-sm mt-2"
            >
              Back to Main Site
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}