import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CreateAdmin() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest({
        url: "/api/admin/create-admin",
        method: "POST",
        data: { email },
      });

      toast({
        title: "Admin Created",
        description: `${email} has been added as an administrator`,
      });
      
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Failed to Create Admin",
        description: error.message || "Unable to create admin user",
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
            <ol className="text-sm text-blue-700 space-y-1">
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
              className="text-blue-600 text-sm"
            >
              Back to Main Site
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}