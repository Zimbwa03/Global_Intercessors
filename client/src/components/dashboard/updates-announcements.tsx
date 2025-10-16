import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FastingRegistration } from "./fasting-registration";

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: "fast" | "event" | "general";
  date: string;
  registrationRequired?: boolean;
  priority: string;
  pin_to_top: boolean;
  subtitle?: string;
  registrationStatus?: string;
  registrationCloses?: string | null;
  imageUrl?: string | null;
}

interface DatabaseUpdate {
  id: number;
  title: string;
  description: string;
  type: string;
  priority: string;
  pin_to_top: boolean;
  created_at: string;
  image_url?: string | null;
}

export function UpdatesAnnouncements() {
  const [showFastingRegistration, setShowFastingRegistration] = useState(false);
  const { toast } = useToast();

  // Fetch updates from database
  const { data: databaseUpdates, isLoading } = useQuery({
    queryKey: ["user-updates"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/updates");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('User updates loaded:', Array.isArray(data) ? data.length : 0, 'records');
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error loading updates:', error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: false, // Disabled auto-refresh to prevent disruption during typing
  });

  // Static fasting announcement (always shows first)
  const fastingAnnouncement: Announcement = {
    id: "fasting-program",
    title: "3 Days & 3 Nights Fasting Program - August",
    description: "Join believers worldwide in a powerful 3-day fasting period for breakthrough and revival. Registration includes GPS location tracking for transport reimbursement.",
    type: "fast",
    date: "August 28-31, 2025",
    registrationRequired: true,
    priority: "high",
    pin_to_top: true
  };

  // Convert database updates to announcement format
  const convertToAnnouncements = (updates: DatabaseUpdate[]): Announcement[] => {
    return updates.map(update => ({
      id: update.id.toString(),
      title: update.title,
      description: update.description,
      type: update.type as "fast" | "event" | "general",
      date: new Date(update.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      registrationRequired: false,
      priority: update.priority,
      pin_to_top: update.pin_to_top,
      imageUrl: update.image_url
    }));
  };

  // Combine static fasting announcement with database updates
  const allAnnouncements: Announcement[] = [
    fastingAnnouncement,
    ...(databaseUpdates ? convertToAnnouncements(databaseUpdates) : [])
  ];

  if (showFastingRegistration) {
    return <FastingRegistration />;
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "fast": return "fas fa-moon";
      case "event": return "fas fa-calendar-alt";
      case "general": return "fas fa-info-circle";
      default: return "fas fa-bell";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "fast": return "bg-purple-100 text-purple-700 border-purple-200";
      case "event": return "bg-gi-primary/100 text-gi-primary/700 border-gi-primary/200";
      case "general": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Updates & Announcements</h2>
        <p className="text-gray-600">Stay informed about global prayer events and community updates</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gi-primary/primary border-t-transparent mx-auto mb-4"></div>
          <p>Loading updates...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gi-primary rounded-lg flex items-center justify-center">
                    <i className={`${getTypeIcon(announcement.type)} text-gi-gold`}></i>
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-800">{announcement.title}</CardTitle>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`px-2 py-1 rounded-full border text-xs font-semibold ${getTypeColor(announcement.type)}`}>
                        {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        <i className="fas fa-calendar mr-1"></i>
                        {announcement.date}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {announcement.imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={announcement.imageUrl} 
                    alt={announcement.title}
                    className="w-full h-auto max-h-96 object-cover"
                    data-testid={`image-update-${announcement.id}`}
                  />
                </div>
              )}
              <p className="text-gray-600 mb-4 leading-relaxed">{announcement.description}</p>

              {announcement.registrationRequired && announcement.id === "fasting-program" && (
                <Button 
                  onClick={() => setShowFastingRegistration(true)}
                  className="hover:bg-gi-primary/700 font-semibold bg-[#004921] text-[#d8a86c]"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Register for Fasting Program
                </Button>
              )}

              {announcement.registrationRequired && announcement.id !== "fasting-program" && (
                <Button className="bg-gi-gold text-gi-primary hover:bg-yellow-400 font-semibold">
                  <i className="fas fa-user-plus mr-2"></i>
                  Register for Event
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
}