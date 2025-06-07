import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedCard } from "@/components/ui/animated-card";
import MobileCharts from "@/components/admin/mobile-charts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  Users,
  Calendar,
  Clock,
  Activity,
  Settings,
  Plus,
  Video,
  Download,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Phone,
  Mail
} from "lucide-react";

export default function AdminDashboard() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Form state
  const [newUpdate, setNewUpdate] = useState({ title: "", description: "" });
  const [zoomLink, setZoomLink] = useState("");

  // Data fetching
  const { data: statistics, isLoading: statisticsLoading } = useQuery({
    queryKey: ['/api/admin/statistics'],
    refetchInterval: 30000
  });

  const { data: adminUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    refetchInterval: 30000
  });

  const { data: prayerSlotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['/api/admin/prayer-slots'],
    refetchInterval: 30000
  });

  const { data: intercessorsData, isLoading: intercessorsLoading } = useQuery({
    queryKey: ['/api/admin/intercessors'],
    refetchInterval: 30000
  });

  const { data: fastingData, isLoading: fastingLoading } = useQuery({
    queryKey: ['/api/admin/fasting-registrations'],
    refetchInterval: 30000
  });

  const { data: updatesData, isLoading: updatesLoading } = useQuery({
    queryKey: ['/api/admin/updates'],
    refetchInterval: 30000
  });

  // Type-safe data extraction
  const prayerSlots = Array.isArray(prayerSlotsData) ? prayerSlotsData : [];
  const intercessors = Array.isArray(intercessorsData) ? intercessorsData : [];
  const fastingRegistrations = Array.isArray(fastingData) ? fastingData : [];
  const updates = Array.isArray(updatesData) ? updatesData : [];

  const { data: currentZoomLink, isLoading: zoomLoading } = useQuery({
    queryKey: ['/api/admin/zoom-link'],
    refetchInterval: 30000
  });

  // Mutations
  const createUpdateMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      apiRequest('/api/admin/updates', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/updates'] });
      setNewUpdate({ title: "", description: "" });
      toast({ title: "Success", description: "Update posted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post update", variant: "destructive" });
    }
  });

  const updateZoomLinkMutation = useMutation({
    mutationFn: (data: { zoomLink: string }) =>
      apiRequest('/api/admin/zoom-link', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/zoom-link'] });
      setZoomLink("");
      toast({ title: "Success", description: "Zoom link updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update zoom link", variant: "destructive" });
    }
  });

  // Event handlers
  const handleCreateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUpdate.title && newUpdate.description) {
      createUpdateMutation.mutate(newUpdate);
    }
  };

  const handleUpdateZoomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (zoomLink) {
      updateZoomLinkMutation.mutate({ zoomLink });
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      <MobileCharts 
        prayerSlots={prayerSlots}
        intercessors={intercessors}
        fastingRegistrations={fastingRegistrations}
        updates={updates}
      />
    </div>
  );

  const PrayerSlotsTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Prayer Slots Management
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportToCSV(prayerSlots, 'prayer-slots')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : prayerSlots.length > 0 ? (
                prayerSlots.map((slot: any) => (
                  <div key={slot.id} className={`p-3 rounded-lg border ${
                    isMobile ? 'text-sm' : 'text-base'
                  }`}>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{slot.slot_time}</span>
                        <Badge variant={slot.status === 'active' ? 'default' : 'secondary'}>
                          {slot.status}
                        </Badge>
                      </div>
                      <div className="text-gray-600 text-sm">
                        Assigned to: {slot.user_id || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No prayer slots found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const IntercessorsTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Intercessors Management
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportToCSV(intercessors, 'intercessors')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {intercessorsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : intercessors.length > 0 ? (
                intercessors.map((intercessor: any) => (
                  <div key={intercessor.id} className={`p-3 rounded-lg border ${
                    isMobile ? 'text-sm' : 'text-base'
                  }`}>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{intercessor.email}</span>
                        <Badge variant={intercessor.is_active ? 'default' : 'secondary'}>
                          {intercessor.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-gray-600 text-sm">
                        Role: {intercessor.role}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No intercessors found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const FastingTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Fasting Registrations
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportToCSV(fastingRegistrations, 'fasting-registrations')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {fastingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : fastingRegistrations.length > 0 ? (
                fastingRegistrations.map((registration: any) => (
                  <div key={registration.id} className={`p-3 rounded-lg border ${
                    isMobile ? 'text-sm' : 'text-base'
                  }`}>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{registration.name}</span>
                        <Badge variant="default">
                          {registration.fasting_type}
                        </Badge>
                      </div>
                      <div className="text-gray-600 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {registration.email}
                        </div>
                        {registration.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="w-3 h-3" />
                            {registration.phone}
                          </div>
                        )}
                        {registration.region && (
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3" />
                            {registration.region}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No fasting registrations found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const ManagementTab = () => (
    <div className="space-y-6">
      {/* Post Updates */}
      <AnimatedCard animationType="fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Post New Update
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUpdate} className="space-y-4">
            <div>
              <Label htmlFor="updateTitle">Update Title</Label>
              <Input
                id="updateTitle"
                value={newUpdate.title}
                onChange={(e) => setNewUpdate(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter update title..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="updateDescription">Description</Label>
              <Textarea
                id="updateDescription"
                value={newUpdate.description}
                onChange={(e) => setNewUpdate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter update description..."
                rows={4}
                className="mt-1"
              />
            </div>
            <Button 
              type="submit" 
              disabled={createUpdateMutation.isPending}
              className="w-full"
            >
              {createUpdateMutation.isPending ? "Posting..." : "Post Update"}
            </Button>
          </form>
        </CardContent>
      </AnimatedCard>

      {/* Zoom Link Management */}
      <AnimatedCard animationType="fadeIn" delay={0.1}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="w-5 h-5 mr-2" />
            Zoom Link Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {zoomLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">Current Zoom Link:</Label>
                <p className="text-sm text-gray-600 mt-1 break-all">
                  {String(currentZoomLink || "No zoom link set")}
                </p>
              </div>
            )}
            
            <form onSubmit={handleUpdateZoomLink} className="space-y-4">
              <div>
                <Label htmlFor="zoomLink">New Zoom Meeting Link</Label>
                <Input
                  id="zoomLink"
                  type="url"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="mt-1"
                />
              </div>
              <Button 
                type="submit" 
                disabled={updateZoomLinkMutation.isPending}
                className="w-full"
              >
                {updateZoomLinkMutation.isPending ? "Updating..." : "Update Zoom Link"}
              </Button>
            </form>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Recent Updates Display */}
      <AnimatedCard animationType="fadeIn" delay={0.2}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60">
            {updatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : updates.length > 0 ? (
              <div className="space-y-3">
                {updates.map((update: any) => (
                  <div key={update.id} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">{update.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(update.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No updates found</p>
            )}
          </ScrollArea>
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "slots":
        return <PrayerSlotsTab />;
      case "intercessors":
        return <IntercessorsTab />;
      case "fasting":
        return <FastingTab />;
      case "management":
        return <ManagementTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage prayer slots, intercessors, and platform operations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-5'}`}>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {!isMobile && "Overview"}
            </TabsTrigger>
            <TabsTrigger value="slots" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {!isMobile && "Slots"}
            </TabsTrigger>
            <TabsTrigger value="intercessors" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {!isMobile && "Users"}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="fasting" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fasting
                </TabsTrigger>
                <TabsTrigger value="management" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Manage
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {renderTabContent()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}