
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, ArrowLeft, RefreshCw, Send } from "lucide-react";

export default function SystemMaintenance() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to create update");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Maintenance notice posted successfully" });
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
      setMaintenanceMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceMessage.trim()) {
      toast({ title: "Error", description: "Please enter maintenance details", variant: "destructive" });
      return;
    }
    createUpdateMutation.mutate({
      title: "System Maintenance",
      description: maintenanceMessage,
      type: "maintenance",
      priority: "normal",
      schedule: "immediate",
      expiry: "1week",
      sendNotification: true,
      sendEmail: false,
      pinToTop: false
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              System Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Enter maintenance notice..."
                  rows={8}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMaintenanceMessage("")}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={createUpdateMutation.isPending}
                >
                  {createUpdateMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
