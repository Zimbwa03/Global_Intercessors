import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: "fast" | "event" | "general";
  date: string;
  registrationRequired: boolean;
}

export function UpdatesAnnouncements() {
  const [announcements] = useState<Announcement[]>([
    {
      id: "1",
      title: "3 Days, 3 Nights Global Fasting",
      description: "Join believers worldwide in a powerful 3-day fasting period for breakthrough and revival. Registration includes location tracking for transport cost estimates.",
      type: "fast",
      date: "Dec 15-17, 2024",
      registrationRequired: true
    },
    {
      id: "2",
      title: "New Year Prayer Marathon",
      description: "24-hour continuous prayer session to welcome 2025 with thanksgiving and intercession for the nations.",
      type: "event",
      date: "Dec 31, 2024 - Jan 1, 2025",
      registrationRequired: true
    },
    {
      id: "3",
      title: "AI Prayer Tools Update",
      description: "New features added to our AI prayer assistant including multilingual support and enhanced biblical integration.",
      type: "general",
      date: "Dec 1, 2024",
      registrationRequired: false
    }
  ]);

  const [registrationData, setRegistrationData] = useState({
    fullName: "",
    phoneNumber: "",
    location: "",
    transportCostEstimate: ""
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegistrationData({
      ...registrationData,
      [e.target.name]: e.target.value
    });
  };

  const getLocation = () => {
    setIsGettingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // In a real app, you'd use Google Maps API to get the address
          setRegistrationData({
            ...registrationData,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          });
          setIsGettingLocation(false);
          toast({
            title: "Location Captured",
            description: "Your current location has been added to the registration form"
          });
        },
        (error) => {
          setIsGettingLocation(false);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enter it manually.",
            variant: "destructive"
          });
        }
      );
    } else {
      setIsGettingLocation(false);
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation. Please enter your location manually.",
        variant: "destructive"
      });
    }
  };

  const handleRegistration = (announcementId: string, announcementTitle: string) => {
    // In a real app, this would submit to your backend
    toast({
      title: "Registration Submitted",
      description: `You've successfully registered for ${announcementTitle}`
    });
    
    // Reset form
    setRegistrationData({
      fullName: "",
      phoneNumber: "",
      location: "",
      transportCostEstimate: ""
    });
  };

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
      case "event": return "bg-blue-100 text-blue-700 border-blue-200";
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

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
                    <i className={`${getTypeIcon(announcement.type)} text-brand-accent`}></i>
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
              <p className="text-gray-600 mb-4 leading-relaxed">{announcement.description}</p>
              
              {announcement.registrationRequired && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-brand-accent text-brand-primary hover:bg-yellow-400 font-semibold">
                      <i className="fas fa-user-plus mr-2"></i>
                      Register for Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Register for {announcement.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          value={registrationData.fullName}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phoneNumber">Phone Number *</Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          value={registrationData.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="Enter your phone number"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <div className="flex space-x-2 mt-1">
                          <Input
                            id="location"
                            name="location"
                            value={registrationData.location}
                            onChange={handleInputChange}
                            placeholder="Enter your location or use GPS"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={getLocation}
                            disabled={isGettingLocation}
                            variant="outline"
                            className="px-3"
                          >
                            {isGettingLocation ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fas fa-map-marker-alt"></i>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="transportCostEstimate">Transport Cost Estimate (Optional)</Label>
                        <Input
                          id="transportCostEstimate"
                          name="transportCostEstimate"
                          value={registrationData.transportCostEstimate}
                          onChange={handleInputChange}
                          placeholder="e.g., $50 or ₦25,000"
                          className="mt-1"
                        />
                      </div>
                      
                      <Button
                        onClick={() => handleRegistration(announcement.id, announcement.title)}
                        className="w-full bg-brand-primary hover:bg-green-800 text-white"
                        disabled={!registrationData.fullName || !registrationData.phoneNumber || !registrationData.location}
                      >
                        Submit Registration
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prayer Requests Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-hands text-brand-accent text-sm"></i>
            </div>
            Submit Prayer Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Share your prayer needs with the global community. All requests are kept confidential.
          </p>
          <Button variant="outline" className="border-brand-primary text-brand-primary hover:bg-brand-neutral">
            <i className="fas fa-plus mr-2"></i>
            Submit Prayer Request
          </Button>
        </CardContent>
      </Card>

      {/* Community Statistics */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-chart-bar text-brand-accent text-sm"></i>
            </div>
            Community Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-primary">1,247</p>
              <p className="text-sm text-gray-600">Active Participants</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-primary">67</p>
              <p className="text-sm text-gray-600">Countries Represented</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-primary">24/7</p>
              <p className="text-sm text-gray-600">Prayer Coverage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}