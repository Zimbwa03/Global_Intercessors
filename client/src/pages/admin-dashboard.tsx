import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Users, 
  Clock, 
  Calendar, 
  Shield, 
  Settings, 
  BarChart3, 
  RefreshCw,
  LogOut,
  Menu,
  X,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Activity,
  Plus,
  Link as LinkIcon,
  Download
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { motion, AnimatePresence } from "framer-motion";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface PrayerSlot {
  id: string;
  slotTime: string;
  status: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

interface FastingRegistration {
  id: string;
  full_name: string;
  phone_number: string;
  region: string;
  travel_cost: string;
  gps_latitude: string | null;
  gps_longitude: string | null;
  city_name?: string;
  created_at: string;
}

interface Intercessor {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  prayer_slot?: string;
}

interface AdminUpdate {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const MobileNavButton = ({ icon: Icon, label, isActive, onClick }: {
  icon: any;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
      isActive 
        ? 'bg-brand-primary text-white shadow-lg' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon size={20} className="mb-1" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [newUpdate, setNewUpdate] = useState({ title: "", description: "" });
  const [zoomLink, setZoomLink] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Check admin authentication
  useEffect(() => {
    const checkAdminAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLocation("/admin/login");
        return;
      }

      // Verify admin role
      const { data: userData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setLocation("/admin/login");
        return;
      }

      setAdminUser(userData);
    };

    checkAdminAuth();
  }, [setLocation, toast]);

  // Fetch prayer slots
  const { data: prayerSlotsResponse, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ["/api/admin/prayer-slots"],
    queryFn: async () => {
      const response = await apiRequest({ url: "/api/admin/prayer-slots" });
      return response;
    },
    enabled: !!adminUser,
  });

  const prayerSlots = Array.isArray(prayerSlotsResponse) ? prayerSlotsResponse : [];

  // Fetch fasting registrations
  const { data: fastingRegistrationsResponse, isLoading: fastingLoading, refetch: refetchFasting } = useQuery({
    queryKey: ["/api/admin/fasting-registrations"],
    queryFn: async () => {
      const response = await apiRequest({ url: "/api/admin/fasting-registrations" });
      return response;
    },
    enabled: !!adminUser,
  });

  const fastingRegistrations = Array.isArray(fastingRegistrationsResponse) ? fastingRegistrationsResponse : [];

  // Fetch intercessors
  const { data: intercessorsResponse, isLoading: intercessorsLoading, refetch: refetchIntercessors } = useQuery({
    queryKey: ["/api/admin/intercessors"],
    queryFn: async () => {
      const response = await apiRequest({ url: "/api/admin/intercessors" });
      return response;
    },
    enabled: !!adminUser,
  });

  const intercessors = Array.isArray(intercessorsResponse) ? intercessorsResponse : [];

  // Fetch admin updates
  const { data: updatesResponse, isLoading: updatesLoading, refetch: refetchUpdates } = useQuery({
    queryKey: ["/api/admin/updates"],
    queryFn: async () => {
      const response = await apiRequest({ url: "/api/admin/updates" });
      return response;
    },
    enabled: !!adminUser,
  });

  const updates = Array.isArray(updatesResponse) ? updatesResponse : [];

  // Get current Zoom link
  const { data: currentZoomLink } = useQuery({
    queryKey: ["/api/admin/zoom-link"],
    queryFn: async () => {
      const response = await apiRequest({ url: "/api/admin/zoom-link" });
      return response;
    },
    enabled: !!adminUser,
  });

  // Mutations for admin actions
  const createUpdateMutation = useMutation({
    mutationFn: async (updateData: { title: string; description: string }) => {
      return apiRequest({
        url: "/api/admin/updates",
        method: "POST",
        body: updateData,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Update posted successfully" });
      setNewUpdate({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/updates"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post update", variant: "destructive" });
    },
  });

  const updateZoomLinkMutation = useMutation({
    mutationFn: async (link: string) => {
      return apiRequest({
        url: "/api/admin/zoom-link",
        method: "POST",
        body: { zoomLink: link },
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Zoom link updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/zoom-link"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Zoom link", variant: "destructive" });
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLocation("/admin/login");
  };

  const handleCreateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.title.trim() || !newUpdate.description.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createUpdateMutation.mutate(newUpdate);
  };

  const handleUpdateZoomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomLink.trim()) {
      toast({ title: "Error", description: "Please enter a valid Zoom link", variant: "destructive" });
      return;
    }
    updateZoomLinkMutation.mutate(zoomLink);
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(item => headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '_');
        let value = item[key] || '';
        
        // Handle specific fields
        if (key === 'created_at' && value) {
          value = new Date(value).toLocaleDateString();
        }
        
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportFasting = () => {
    if (fastingRegistrations.length === 0) {
      toast({ 
        title: "No Data", 
        description: "No fasting registrations to export",
        variant: "destructive"
      });
      return;
    }

    const exportData = fastingRegistrations.map(reg => ({
      full_name: reg.full_name,
      phone_number: reg.phone_number,
      region: reg.region,
      city_name: reg.city_name || 'GPS location not available',
      travel_cost: reg.travel_cost,
      gps_latitude: reg.gps_latitude || '',
      gps_longitude: reg.gps_longitude || '',
      created_at: reg.created_at
    }));

    exportToCSV(
      exportData,
      `fasting-registrations-${new Date().toISOString().split('T')[0]}.csv`,
      ['Full Name', 'Phone Number', 'Region', 'City Name', 'Travel Cost', 'GPS Latitude', 'GPS Longitude', 'Created At']
    );

    toast({
      title: "Export Complete",
      description: `${fastingRegistrations.length} fasting registrations exported to CSV`,
    });
  };

  const refreshAllData = () => {
    refetchSlots();
    refetchFasting();
    refetchIntercessors();
    refetchUpdates();
    toast({ title: "Data Refreshed", description: "All data has been refreshed" });
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <AnimatedCard animationType="fadeIn" className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Admin Access</h2>
            <p className="text-gray-600">Please wait while we authenticate your credentials...</p>
          </CardContent>
        </AnimatedCard>
      </div>
    );
  }

  const OverviewTab = () => {
    const activeSlots = prayerSlots.filter(slot => slot.status === 'active').length;
    const totalIntercessors = intercessors.length;
    const totalFastingRegistrations = fastingRegistrations.length;
    const recentUpdates = updates.slice(0, 3);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <AnimatedCard animationType="slideIn" delay={0.1}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Slots</p>
                  <p className="text-2xl font-bold text-gray-900">{activeSlots}</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard animationType="slideIn" delay={0.2}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Intercessors</p>
                  <p className="text-2xl font-bold text-gray-900">{totalIntercessors}</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard animationType="slideIn" delay={0.3}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Fasting</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFastingRegistrations}</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard animationType="slideIn" delay={0.4}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Updates</p>
                  <p className="text-2xl font-bold text-gray-900">{updates.length}</p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Recent Activity */}
        <AnimatedCard animationType="fadeIn" delay={0.5}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUpdates.length > 0 ? (
                recentUpdates.map((update, index) => (
                  <div key={update.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-brand-primary rounded-full">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{update.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(update.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recent updates</p>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>
    );
  };

  const PrayerSlotsTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Prayer Slots Management
            </span>
            <Badge variant="secondary">{prayerSlots.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slotsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading prayer slots...</p>
            </div>
          ) : prayerSlots.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {prayerSlots.map((slot) => (
                  <div key={slot.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={slot.status === 'active' ? 'default' : 'secondary'}>
                          {slot.status}
                        </Badge>
                        <span className="font-semibold">{slot.slotTime}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(slot.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><Mail className="w-4 h-4 inline mr-1" />{slot.userEmail || 'No email'}</p>
                      <p className="mt-1">User ID: {slot.userId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 text-center py-8">No prayer slots found</p>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const IntercessorsTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Registered Intercessors
            </span>
            <Badge variant="secondary">{intercessors.length} Total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {intercessorsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading intercessors...</p>
            </div>
          ) : intercessors.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {intercessors.map((intercessor) => (
                  <div key={intercessor.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{intercessor.name || 'Anonymous'}</p>
                          <p className="text-sm text-gray-600">{intercessor.email}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(intercessor.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {intercessor.prayer_slot && (
                      <div className="mt-2">
                        <Badge variant="outline">{intercessor.prayer_slot}</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 text-center py-8">No intercessors found</p>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const FastingTab = () => (
    <div className="space-y-6">
      <AnimatedCard animationType="fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Fasting Registrations
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{fastingRegistrations.length} Total</Badge>
              <Button
                onClick={handleExportFasting}
                size="sm"
                variant="outline"
                className="flex items-center"
                disabled={fastingRegistrations.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fastingLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading fasting registrations...</p>
            </div>
          ) : fastingRegistrations.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {fastingRegistrations.map((registration) => (
                  <div key={registration.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{registration.full_name}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(registration.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {registration.phone_number}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {registration.region}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Travel Cost:</span>
                        ${registration.travel_cost}
                      </div>
                      {registration.city_name && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-medium">{registration.city_name}</span>
                        </div>
                      )}
                      {(registration.gps_latitude && registration.gps_longitude) && (
                        <div className="flex items-center text-gray-600 text-xs">
                          <span className="font-medium mr-2">Coordinates:</span>
                          {parseFloat(registration.gps_latitude).toFixed(4)}, {parseFloat(registration.gps_longitude).toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 text-center py-8">No fasting registrations found</p>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const ManagementTab = () => (
    <div className="space-y-6">
      {/* Post Updates */}
      <AnimatedCard animationType="fadeIn" delay={0.1}>
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
                onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                placeholder="Enter update title..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="updateDescription">Description</Label>
              <Textarea
                id="updateDescription"
                value={newUpdate.description}
                onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
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
              {createUpdateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Post Update
            </Button>
          </form>
        </CardContent>
      </AnimatedCard>

      {/* Zoom Link Management */}
      <AnimatedCard animationType="fadeIn" delay={0.2}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LinkIcon className="w-5 h-5 mr-2" />
            Zoom Link Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentZoomLink && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current Zoom Link:</p>
              <p className="text-blue-600 font-mono text-sm break-all">{currentZoomLink.zoomLink}</p>
            </div>
          )}
          <form onSubmit={handleUpdateZoomLink} className="space-y-4">
            <div>
              <Label htmlFor="zoomLink">New Zoom Link</Label>
              <Input
                id="zoomLink"
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
              {updateZoomLinkMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4 mr-2" />
              )}
              Update Zoom Link
            </Button>
          </form>
        </CardContent>
      </AnimatedCard>

      {/* Recent Updates List */}
      <AnimatedCard animationType="fadeIn" delay={0.3}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {updatesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
              <p>Loading updates...</p>
            </div>
          ) : updates.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{update.title}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(update.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{update.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 text-center py-8">No updates found</p>
          )}
        </CardContent>
      </AnimatedCard>
    </div>
  );

  const UserActivitiesTab = () => (
    <div>
        User Activities Tab
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "activities":
        return <UserActivitiesTab />;
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-brand-primary" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500">Global Intercessors</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshAllData}
                size="sm"
                variant="ghost"
                className="p-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSignOut}
                size="sm"
                variant="ghost"
                className="p-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="bg-brand-primary text-white p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Global Intercessors Admin</h1>
                <p className="text-blue-100 text-sm">Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Welcome, {adminUser.email}</span>
              <Button
                onClick={refreshAllData}
                variant="outline"
                size="sm"
                className="text-brand-primary border-white hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="text-brand-primary border-white hover:bg-blue-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4">
        {/* Mobile Navigation */}
        {isMobile ? (
          <div className="grid grid-cols-5 gap-2 mb-6 bg-white rounded-lg p-3 shadow-sm">
            <MobileNavButton
              icon={BarChart3}
              label="Overview"
              isActive={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            />
             <MobileNavButton
              icon={Activity}
              label="Activities"
              isActive={activeTab === "activities"}
              onClick={() => setActiveTab("activities")}
            />
            <MobileNavButton
              icon={Clock}
              label="Slots"
              isActive={activeTab === "slots"}
              onClick={() => setActiveTab("slots")}
            />
            <MobileNavButton
              icon={Users}
              label="Members"
              isActive={activeTab === "intercessors"}
              onClick={() => setActiveTab("intercessors")}
            />
            <MobileNavButton
              icon={Calendar}
              label="Fasting"
              isActive={activeTab === "fasting"}
              onClick={() => setActiveTab("fasting")}
            />
            <MobileNavButton
              icon={Settings}
              label="Manage"
              isActive={activeTab === "management"}
              onClick={() => setActiveTab("management")}
            />
          </div>
        ) : (
          /* Desktop Navigation */
          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-2 shadow-sm">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "activities", label: "Activities", icon: Activity },
              { id: "slots", label: "Prayer Slots", icon: Clock },
              { id: "intercessors", label: "Intercessors", icon: Users },
              { id: "fasting", label: "Fasting Program", icon: Calendar },
              { id: "management", label: "Management", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  className={`flex items-center space-x-2 px-4 py-2 ${
                    activeTab === tab.id 
                      ? "bg-brand-primary text-white shadow-md" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}