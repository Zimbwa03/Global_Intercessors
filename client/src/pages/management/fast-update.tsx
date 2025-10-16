import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, ArrowLeft, RefreshCw, Send, CalendarDays } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function FastUpdate() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [fastingTitle, setFastingTitle] = useState("3 Days & 3 Nights Fasting Program - August");
  const [fastingStartDate, setFastingStartDate] = useState<Date>();
  const [fastingEndDate, setFastingEndDate] = useState<Date>();
  const [fastingDescription, setFastingDescription] = useState("");

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
      toast({ title: "Success", description: "Fast update posted successfully" });
      queryClient.invalidateQueries({ queryKey: ['admin-updates'] });
      setFastingTitle("3 Days & 3 Nights Fasting Program - August");
      setFastingStartDate(undefined);
      setFastingEndDate(undefined);
      setFastingDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFastingProgramMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch('/api/admin/fasting-program', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update fasting program");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Fasting program updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['fasting-program-details'] });
      setFastingTitle("3 Days & 3 Nights Fasting Program - August");
      setFastingStartDate(undefined);
      setFastingEndDate(undefined);
      setFastingDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastingTitle || !fastingStartDate || !fastingEndDate || !fastingDescription) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    const dateRange = `${format(fastingStartDate, "MMMM d")}-${format(fastingEndDate, "d, yyyy")}`;
    const fullDescription = `${fastingDescription}\n\n📅 Dates: ${dateRange}`;
    updateFastingProgramMutation.mutate({
      title: fastingTitle,
      description: fullDescription,
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
              <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              Fast Update - Fasting Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="fasting-title">Program Title *</Label>
                <Input
                  id="fasting-title"
                  name="fasting-title"
                  value={fastingTitle}
                  onChange={(e) => setFastingTitle(e.target.value)}
                  placeholder="e.g., 3 Days & 3 Nights Fasting Program - August"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full mt-2 justify-start text-left font-normal ${!fastingStartDate && "text-muted-foreground"}`}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {fastingStartDate ? format(fastingStartDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={fastingStartDate}
                        onSelect={setFastingStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full mt-2 justify-start text-left font-normal ${!fastingEndDate && "text-muted-foreground"}`}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {fastingEndDate ? format(fastingEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={fastingEndDate}
                        onSelect={setFastingEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="fasting-description">Program Description *</Label>
                <Textarea
                  id="fasting-description"
                  name="fasting-description"
                  value={fastingDescription}
                  onChange={(e) => setFastingDescription(e.target.value)}
                  placeholder="Join believers worldwide in a powerful 3-day fasting period for breakthrough and revival..."
                  rows={6}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFastingTitle("3 Days & 3 Nights Fasting Program - August");
                    setFastingStartDate(undefined);
                    setFastingEndDate(undefined);
                    setFastingDescription("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  className="bg-gi-primary hover:bg-gi-primary/90"
                  disabled={updateFastingProgramMutation.isPending}
                >
                  {updateFastingProgramMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Update Fasting Program
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