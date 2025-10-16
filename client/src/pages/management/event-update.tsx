
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, ArrowLeft, RefreshCw, Send } from "lucide-react";

export default function EventUpdate() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [eventMessage, setEventMessage] = useState("");
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
      toast({ title: "Success", description: "Event update posted successfully" });
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
      setEventMessage("");
      setEventImage(null);
      setImagePreview(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventMessage.trim()) {
      toast({ title: "Error", description: "Please enter event details", variant: "destructive" });
      return;
    }

    let imageData = null;
    if (eventImage && imagePreview) {
      imageData = imagePreview; // base64 encoded image
    }

    createUpdateMutation.mutate({
      title: "Event Update",
      description: eventMessage,
      type: "event",
      priority: "normal",
      schedule: "immediate",
      expiry: "never",
      sendNotification: true,
      sendEmail: false,
      pinToTop: false,
      imageUrl: imageData
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
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ImagePlus className="w-5 h-5 text-white" />
              </div>
              Event Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="event-image">Event Flyer (Optional)</Label>
                <Input
                  id="event-image"
                  name="event-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-2"
                />
                {imagePreview && (
                  <div className="mt-4">
                    <img src={imagePreview} alt="Event preview" className="max-w-full h-auto rounded-lg border" />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="event-message">Event Message *</Label>
                <Textarea
                  id="event-message"
                  name="event-message"
                  value={eventMessage}
                  onChange={(e) => setEventMessage(e.target.value)}
                  placeholder="Enter event details..."
                  rows={8}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEventMessage("");
                    setEventImage(null);
                    setImagePreview(null);
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
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
