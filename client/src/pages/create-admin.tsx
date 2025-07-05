import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import giLogoPath from "@/assets/GI_Logo_Main_1751586542563.png";

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
        .from('admins')
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

      // Create new admin
      const { error } = await supabase
        .from('admins')
        .insert([
          {
            email: email,
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Admin Created Successfully",
        description: `Admin account created for ${email}`,
      });

      setEmail("");
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error Creating Admin",
        description: "There was an error creating the admin account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gi-primary hover:bg-gi-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}