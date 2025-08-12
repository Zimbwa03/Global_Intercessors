import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export function AuthSection() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success!",
          description: "Login successful! Redirecting to dashboard...",
        });
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name
          }
        }
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive"
        });
      } else if (data.user) {
        // Create user profile in database
        try {
          const response = await fetch('/api/users/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              fullName: formData.name
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create user profile');
          }

          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account.",
          });
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          toast({
            title: "Account Created!",
            description: "Account created but profile setup incomplete. Please contact support if issues persist.",
            variant: "destructive"
          });
        }

        setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during registration.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="auth" className="py-20 bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gi-gold rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-brand-lg">
              <img 
                src="/src/assets/GI_GOLD_Green_Icon_1751586542565.png" 
                alt="Global Intercessors Icon" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  console.error('Auth section logo failed to load');
                }}
              />
            </div>
            <h2 className="font-poppins text-4xl font-bold text-brand-text mb-4">Join Our Community</h2>
            <p className="text-gray-600 text-lg">Start your spiritual journey with thousands of believers worldwide</p>
          </div>

          <Card className="bg-white rounded-2xl shadow-brand-lg border border-gi-primary/100">
            <CardContent className="p-8">
              {/* Auth Tabs */}
              <div className="flex mb-8 bg-gi-primary/50 rounded-xl p-1">
                <Button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-brand font-poppins ${
                    isLogin 
                      ? 'bg-gi-primary text-white shadow-brand' 
                      : 'bg-transparent text-gray-600 hover:text-gi-primary hover:bg-transparent'
                  }`}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-brand font-poppins ${
                    !isLogin 
                      ? 'bg-gi-primary text-white shadow-brand' 
                      : 'bg-transparent text-gray-600 hover:text-gi-primary hover:bg-transparent'
                  }`}
                >
                  Sign Up
                </Button>
              </div>

              {/* Forms */}
              {isLogin ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <Label className="block text-sm font-semibold text-brand-text mb-2 font-poppins">Email Address</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gi-primary/200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-brand"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-semibold text-brand-text mb-2 font-poppins">Password</Label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gi-primary/200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-brand"
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gi-gold text-gi-primary py-3 rounded-xl font-semibold hover:bg-gi-gold-dark transition-brand flex items-center justify-center shadow-brand font-poppins"
                  >
                    {isLoading ? (
                      <>
                        <span>Signing In...</span>
                        <i className="fas fa-spinner fa-spin ml-2"></i>
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-6">
                  <div>
                    <Label className="block text-sm font-semibold text-brand-text mb-2 font-poppins">Full Name</Label>
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gi-primary/200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-brand"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-semibold text-brand-text mb-2 font-poppins">Email Address</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gi-primary/200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-brand"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-semibold text-brand-text mb-2 font-poppins">Password</Label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gi-primary/200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-brand"
                      placeholder="Create a password"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-semibold text-brand-text mb-2 font-poppins">Confirm Password</Label>
                    <Input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gi-primary/200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-brand"
                      placeholder="Confirm your password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gi-gold text-gi-primary py-3 rounded-xl font-semibold hover:bg-gi-gold-dark transition-brand flex items-center justify-center shadow-brand font-poppins"
                  >
                    {isLoading ? (
                      <>
                        <span>Creating Account...</span>
                        <i className="fas fa-spinner fa-spin ml-2"></i>
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              )}

              {/* Admin Access Divider */}

            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}