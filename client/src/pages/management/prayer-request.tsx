
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ArrowLeft, RefreshCw, Send } from "lucide-react";

export default function PrayerRequest() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [prayerRequestMessage, setPrayerRequestMessage] = useState("");

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
      toast({ title: "Success", description: "Prayer request posted successfully" });
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
      setPrayerRequestMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerRequestMessage.trim()) {
      toast({ title: "Error", description: "Please enter a prayer request", variant: "destructive" });
      return;
    }
    createUpdateMutation.mutate({
      title: "Prayer Request",
      description: prayerRequestMessage,
      type: "prayer",
      priority: "high",
      schedule: "immediate",
      expiry: "never",
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
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              Prayer Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Textarea
                  value={prayerRequestMessage}
                  onChange={(e) => setPrayerRequestMessage(e.target.value)}
                  placeholder="Enter prayer request..."
                  rows={8}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrayerRequestMessage("")}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700"
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
