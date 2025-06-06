import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

interface PrayerSlot {
  id: string;
  slotTime: string;
  status: string;
  userId: string;
  userEmail?: string;
  userName?: string;
}

interface FastingRegistration {
  id: string;
  fullName: string;
  phoneNumber: string;
  region: string;
  travelCost: number;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [newUpdate, setNewUpdate] = useState({ title: "", description: "" });
  const [zoomLink, setZoomLink] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        .from('users')
        .select('id, email, role')
        .eq('email', user.email)
        .single();

      if (error || userData?.role !== 'admin') {
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
  }, []);

  // Fetch prayer slots
  const { data: prayerSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ["/api/admin/prayer-slots"],
    queryFn: () => apiRequest({ url: "/api/admin/prayer-slots" }),
    enabled: !!adminUser,
  });

  // Fetch fasting registrations
  const { data: fastingRegistrations, isLoading: fastingLoading } = useQuery({
    queryKey: ["/api/admin/fasting-registrations"],
    queryFn: () => apiRequest({ url: "/api/admin/fasting-registrations" }),
    enabled: !!adminUser,
  });

  // Fetch intercessors
  const { data: intercessors, isLoading: intercessorsLoading } = useQuery({
    queryKey: ["/api/admin/intercessors"],
    queryFn: () => apiRequest({ url: "/api/admin/intercessors" }),
    enabled: !!adminUser,
  });

  // Create update mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      return apiRequest({
        url: "/api/admin/updates",
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Update Created",
        description: "Announcement has been published successfully",
      });
      setNewUpdate({ title: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/updates"] });
    },
  });

  // Save Zoom link mutation
  const saveZoomMutation = useMutation({
    mutationFn: async (link: string) => {
      return apiRequest({
        url: "/api/admin/zoom-link",
        method: "POST",
        data: { link },
      });
    },
    onSuccess: () => {
      toast({
        title: "Zoom Link Saved",
        description: "Workspace link has been updated",
      });
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLocation("/admin/login");
  };

  const handleCreateUpdate = () => {
    if (!newUpdate.title.trim() || !newUpdate.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and description",
        variant: "destructive",
      });
      return;
    }
    createUpdateMutation.mutate(newUpdate);
  };

  const handleSaveZoomLink = () => {
    if (!zoomLink.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid Zoom link",
        variant: "destructive",
      });
      return;
    }
    saveZoomMutation.mutate(zoomLink);
  };

  const exportFastingData = () => {
    if (!fastingRegistrations?.length) return;

    const csvContent = [
      ["Name", "Phone", "Region", "Travel Cost", "GPS Latitude", "GPS Longitude", "Registered At"],
      ...fastingRegistrations.map((reg: FastingRegistration) => [
        reg.fullName,
        reg.phoneNumber,
        reg.region,
        reg.travelCost,
        reg.gpsLatitude || "",
        reg.gpsLongitude || "",
        new Date(reg.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fasting-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Fasting registrations exported to CSV",
    });
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="fas fa-shield-alt text-2xl"></i>
            <div>
              <h1 className="text-xl font-bold">Global Intercessors Admin</h1>
              <p className="text-blue-200 text-sm">Management Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, {adminUser.email}</span>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="text-blue-600 border-white hover:bg-blue-50"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Dashboard", icon: "fas fa-chart-line" },
              { id: "slots", label: "Prayer Slots", icon: "fas fa-clock" },
              { id: "intercessors", label: "Intercessors", icon: "fas fa-users" },
              { id: "fasting", label: "Fasting Events", icon: "fas fa-moon" },
              { id: "zoom", label: "Zoom Workspace", icon: "fas fa-video" },
              { id: "updates", label: "Updates", icon: "fas fa-bullhorn" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <i className="fas fa-clock text-blue-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Slots</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {prayerSlots?.filter((slot: PrayerSlot) => slot.status === "taken").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <i className="fas fa-users text-green-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Intercessors</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {intercessors?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <i className="fas fa-moon text-purple-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Fasting Registrations</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {fastingRegistrations?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Unfilled Slots</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {prayerSlots?.filter((slot: PrayerSlot) => slot.status === "available").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "slots" && (
          <Card>
            <CardHeader>
              <CardTitle>Prayer Slot Management</CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Slot
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Intercessor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prayerSlots?.map((slot: PrayerSlot) => (
                        <tr key={slot.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {slot.slotTime}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              slot.status === "taken" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {slot.status === "taken" ? "Assigned" : "Available"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {slot.userName || "Not assigned"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {slot.userEmail || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "fasting" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fasting Event Registrations</CardTitle>
                <Button
                  onClick={exportFastingData}
                  disabled={!fastingRegistrations?.length}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <i className="fas fa-download mr-2"></i>
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fastingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Region
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Travel Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          GPS Verified
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registered
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fastingRegistrations?.map((reg: FastingRegistration) => (
                        <tr key={reg.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {reg.fullName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reg.phoneNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reg.region}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${reg.travelCost}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              reg.gpsLatitude && reg.gpsLongitude
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {reg.gpsLatitude && reg.gpsLongitude ? "Verified" : "Pending"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(reg.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "zoom" && (
          <Card>
            <CardHeader>
              <CardTitle>Zoom Workspace Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="zoomLink">Zoom Meeting Link</Label>
                <Input
                  id="zoomLink"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSaveZoomLink}
                disabled={saveZoomMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveZoomMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save Zoom Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === "updates" && (
          <Card>
            <CardHeader>
              <CardTitle>Create Announcement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="updateTitle">Title</Label>
                <Input
                  id="updateTitle"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                  placeholder="Announcement title"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="updateDescription">Description</Label>
                <Textarea
                  id="updateDescription"
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                  placeholder="Announcement content"
                  rows={4}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleCreateUpdate}
                disabled={createUpdateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createUpdateMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Publishing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-bullhorn mr-2"></i>
                    Publish Update
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}