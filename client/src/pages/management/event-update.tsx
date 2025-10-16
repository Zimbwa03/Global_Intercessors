
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, ArrowLeft, RefreshCw, Send, Sparkles, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventUpdate() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [eventMessage, setEventMessage] = useState("");
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImageMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await fetch('/api/admin/generate-event-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate image' }));
        throw new Error(errorData.error || "Failed to generate image");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
      toast({ title: "Success", description: "Image generated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      console.log('Sending update data:', { 
        ...updateData, 
        imageUrl: updateData.imageUrl ? 'base64 image present' : 'no image' 
      });
      
      const response = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || errorData.details || "Failed to create update");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Update created successfully:', data);
      toast({ title: "Success", description: "Event update posted successfully" });
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
      setEventMessage("");
      setEventImage(null);
      setGeneratedImage(null);
      setAiPrompt("");
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Error", description: "Please enter an image description", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      await generateImageMutation.mutateAsync(aiPrompt);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventMessage.trim()) {
      toast({ title: "Error", description: "Please enter event details", variant: "destructive" });
      return;
    }

    let imageUrl: string | null = null;

    // Use generated image if available
    if (generatedImage) {
      imageUrl = generatedImage;
      console.log('Using AI-generated image');
    }
    // Otherwise convert uploaded image to base64
    else if (eventImage) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(eventImage);
        });
        imageUrl = base64;
        console.log('Image converted to base64, size:', base64.length);
      } catch (error) {
        console.error("Error reading image:", error);
        toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
        return;
      }
    }

    console.log('Submitting event update with image:', !!imageUrl);
    
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
      imageUrl: imageUrl
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
                <Label className="mb-3 block">Event Flyer</Label>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </TabsTrigger>
                    <TabsTrigger value="generate" className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Generate
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4 mt-4">
                    <Input
                      id="event-image"
                      name="event-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setEventImage(e.target.files?.[0] || null);
                        setGeneratedImage(null);
                      }}
                      className="mt-2"
                    />
                    {eventImage && (
                      <p className="text-sm text-green-600">
                        ✓ {eventImage.name} selected
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="generate" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the event flyer you want to generate... (e.g., 'Global prayer gathering with diverse people from different nations, warm and welcoming atmosphere, spiritual unity theme')"
                        rows={4}
                        className="resize-none"
                      />
                      <Button
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating Image...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Image
                          </>
                        )}
                      </Button>
                    </div>

                    {generatedImage && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-green-600">✓ Image generated successfully!</p>
                        <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
                          <img 
                            src={generatedImage} 
                            alt="AI Generated Event Flyer" 
                            className="w-full h-auto max-h-96 object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
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
                    setGeneratedImage(null);
                    setAiPrompt("");
                  }}
                >
                  Clear All
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
                      Send Update
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
