import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function PrayerSlotManagement() {
  const [currentSlot, setCurrentSlot] = useState("22:00 - 22:30");
  const [slotStatus, setSlotStatus] = useState("Active");
  const [isChangingSlot, setIsChangingSlot] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    "00:00 - 00:30", "00:30 - 01:00", "01:00 - 01:30", "01:30 - 02:00",
    "02:00 - 02:30", "02:30 - 03:00", "03:00 - 03:30", "03:30 - 04:00",
    "04:00 - 04:30", "04:30 - 05:00", "05:00 - 05:30", "05:30 - 06:00",
    "06:00 - 06:30", "06:30 - 07:00", "07:00 - 07:30", "07:30 - 08:00",
    "08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00",
    "10:00 - 10:30", "10:30 - 11:00", "11:00 - 11:30", "11:30 - 12:00",
    "12:00 - 12:30", "12:30 - 13:00", "13:00 - 13:30", "13:30 - 14:00",
    "14:00 - 14:30", "14:30 - 15:00", "15:00 - 15:30", "15:30 - 16:00",
    "16:00 - 16:30", "16:30 - 17:00", "17:00 - 17:30", "17:30 - 18:00",
    "18:00 - 18:30", "18:30 - 19:00", "19:00 - 19:30", "19:30 - 20:00",
    "20:00 - 20:30", "20:30 - 21:00", "21:00 - 21:30", "21:30 - 22:00",
    "22:00 - 22:30", "22:30 - 23:00", "23:00 - 23:30", "23:30 - 00:00"
  ];

  const handleSlotChange = (newSlot: string) => {
    setCurrentSlot(newSlot);
    setIsChangingSlot(false);
    toast({
      title: "Prayer Slot Updated",
      description: `Your new prayer slot is ${newSlot}`
    });
  };

  const handleRequestSkip = () => {
    setSlotStatus("On Leave");
    toast({
      title: "Skip Requested",
      description: "Your slot has been marked as 'On Leave' for 5 days"
    });
  };

  const handleReactivateSlot = () => {
    setSlotStatus("Active");
    toast({
      title: "Slot Reactivated",
      description: "Your prayer slot is now active again"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "text-green-600 bg-green-50 border-green-200";
      case "Missed": return "text-red-600 bg-red-50 border-red-200";
      case "On Leave": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (isLoadingSlot) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-brand-text font-poppins">Loading your prayer slot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-text mb-2 font-poppins">Prayer Slot Management</h2>
        <p className="text-gray-600">Manage your committed prayer time and schedule</p>
      </div>

      {/* Current Slot Status */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <i className="fas fa-clock text-brand-accent text-sm"></i>
            </div>
            <span className="font-poppins">Current Prayer Slot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-6 border border-blue-100">
            <div className="text-center mb-4">
              <h3 className="text-3xl font-bold text-brand-primary mb-2 font-poppins">{currentSlot}</h3>
              <div className={`inline-flex items-center px-3 py-1 rounded-full border ${getStatusColor(slotStatus)}`}>
                <i className="fas fa-circle mr-2 text-xs"></i>
                <span className="font-semibold font-poppins">{slotStatus}</span>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {slotStatus === "Active" && (
                <Button 
                  onClick={handleRequestSkip}
                  variant="outline"
                  className="border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-brand-primary transition-brand font-poppins"
                >
                  <i className="fas fa-pause mr-2"></i>
                  Request Skip (5 days)
                </Button>
              )}
              
              {slotStatus === "On Leave" && (
                <Button 
                  onClick={handleReactivateSlot}
                  className="bg-brand-primary hover:bg-blue-800 text-white transition-brand font-poppins"
                >
                  <i className="fas fa-play mr-2"></i>
                  Reactivate Slot
                </Button>
              )}
              
              <Button 
                onClick={() => setIsChangingSlot(!isChangingSlot)}
                variant="outline"
                className="border-brand-primary text-brand-primary hover:bg-blue-50 transition-brand font-poppins"
              >
                <i className="fas fa-edit mr-2"></i>
                Change Time Slot
              </Button>
            </div>
          </div>

          {/* Change Slot Interface */}
          {isChangingSlot && (
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-brand-text mb-3 font-poppins">Select New Prayer Slot</h4>
              <div className="space-y-3">
                <Select onValueChange={handleSlotChange}>
                  <SelectTrigger className="w-full border-blue-200 focus:ring-brand-primary focus:border-brand-primary">
                    <SelectValue placeholder="Choose a new time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => setIsChangingSlot(false)}
                  variant="outline"
                  className="w-full border-gray-300 hover:bg-gray-50 transition-brand font-poppins"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slot Information */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <i className="fas fa-info-circle text-brand-accent text-sm"></i>
            </div>
            <span className="font-poppins">Slot Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <i className="fas fa-check-circle text-brand-primary mr-3 mt-0.5"></i>
              <p>Commit to 30 minutes of focused prayer during your assigned slot</p>
            </div>
            <div className="flex items-start">
              <i className="fas fa-clock text-brand-accent mr-3 mt-0.5"></i>
              <p>You can request to skip your slot for up to 5 consecutive days</p>
            </div>
            <div className="flex items-start">
              <i className="fas fa-exclamation-triangle text-yellow-600 mr-3 mt-0.5"></i>
              <p>Missing 5 days in a row will auto-release your slot to other intercessors</p>
            </div>
            <div className="flex items-start">
              <i className="fas fa-users text-brand-primary mr-3 mt-0.5"></i>
              <p>Your commitment helps maintain 24/7 global prayer coverage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prayer Session History */}
      <Card className="shadow-brand-lg border border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3 shadow-brand">
              <i className="fas fa-history text-brand-accent text-sm"></i>
            </div>
            <span className="font-poppins">Recent Prayer Sessions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Dec 6, 2024", status: "Completed", duration: "30 min" },
              { date: "Dec 5, 2024", status: "Completed", duration: "35 min" },
              { date: "Dec 4, 2024", status: "Missed", duration: "-" },
              { date: "Dec 3, 2024", status: "Completed", duration: "30 min" },
              { date: "Dec 2, 2024", status: "Completed", duration: "25 min" }
            ].map((session, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <i className={`fas ${session.status === 'Completed' ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'} mr-3`}></i>
                  <span className="font-medium text-gray-800">{session.date}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${session.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>
                    {session.status}
                  </span>
                  <p className="text-xs text-gray-500">{session.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}