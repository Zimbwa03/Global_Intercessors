import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase, type AuthUser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user as AuthUser);
      } else {
        navigate("/");
      }
      setIsLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while signing out.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-brand-primary mb-4"></i>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-neutral">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center">
                <i className="fas fa-praying-hands text-brand-primary text-lg"></i>
              </div>
              <h1 className="text-2xl font-bold">Global Intercessors</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-200">
                Welcome, {user.user_metadata?.full_name || user.email}
              </span>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-brand-primary"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Dashboard</h1>
          <p className="text-xl text-gray-600">
            Welcome to your Global Intercessors dashboard. Your spiritual journey begins here.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Prayer Stats Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-chart-line text-brand-accent text-sm"></i>
                </div>
                Prayer Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sessions:</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">This Week:</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Streak:</span>
                  <span className="font-semibold">0 days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-calendar text-brand-accent text-sm"></i>
                </div>
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-4">
                No upcoming events. Check back soon for global prayer initiatives!
              </p>
            </CardContent>
          </Card>

          {/* AI Prayer Tools Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-robot text-brand-accent text-sm"></i>
                </div>
                AI Prayer Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Enhance your prayer life with AI-powered guidance and scripture integration.
              </p>
              <Button className="w-full bg-brand-accent text-brand-primary hover:bg-yellow-400">
                Try AI Tools
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button className="bg-brand-primary hover:bg-green-800 py-6">
                <div className="text-center">
                  <i className="fas fa-play text-2xl mb-2"></i>
                  <div>Start Prayer Session</div>
                </div>
              </Button>
              <Button variant="outline" className="border-brand-primary text-brand-primary py-6">
                <div className="text-center">
                  <i className="fas fa-users text-2xl mb-2"></i>
                  <div>Join Global Event</div>
                </div>
              </Button>
              <Button variant="outline" className="border-brand-primary text-brand-primary py-6">
                <div className="text-center">
                  <i className="fas fa-book text-2xl mb-2"></i>
                  <div>Prayer Resources</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
