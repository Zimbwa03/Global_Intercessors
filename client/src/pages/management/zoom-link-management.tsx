
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinkIcon, ArrowLeft, RefreshCw, Send } from "lucide-react";

export default function ZoomLinkManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [zoomLink, setZoomLink] = useState("");

  // Get current Zoom link
  const { data: currentZoomLink } = useQuery({
    queryKey: ["admin-zoom-link"],
    queryFn: async () => {
      const response = await fetch("/api/admin/zoom-link", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch zoom link");
      return response.json();
    },
  });

  const updateZoomLinkMutation = useMutation({
    mutationFn: async (link: string) => {
      const response = await fetch("/api/admin/zoom-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ zoomLink: link }),
      });
      if (!response.ok) throw new Error("Failed to update Zoom link");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Zoom link updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-zoom-link"] });
      setZoomLink("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Zoom link", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomLink.trim()) {
      toast({ title: "Error", description: "Please enter a Zoom link", variant: "destructive" });
      return;
    }
    updateZoomLinkMutation.mutate(zoomLink);
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
              <div className="w-10 h-10 bg-gi-gold rounded-lg flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-gi-primary" />
              </div>
              Zoom Link Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentZoomLink && typeof currentZoomLink === 'object' && 'zoomLink' in currentZoomLink && (
              <div className="p-4 bg-gi-primary/10 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Zoom Link:</p>
                <p className="text-gi-primary font-mono text-sm break-all">{(currentZoomLink as any).zoomLink}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="zoom-link">New Zoom Link *</Label>
                <Input
                  id="zoom-link"
                  name="zoom-link"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setZoomLink("")}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  className="bg-gi-gold hover:bg-gi-gold/90 text-gi-primary"
                  disabled={updateZoomLinkMutation.isPending}
                >
                  {updateZoomLinkMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Update Link
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
