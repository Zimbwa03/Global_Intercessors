import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, DollarSign, User, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FastingRegistration {
  fullName: string;
  phoneNumber: string;
  region: string;
  travelCost: number;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  agreedToGPS: boolean;
}

export function FastingRegistration() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FastingRegistration>({
    fullName: "",
    phoneNumber: "",
    region: "",
    travelCost: 0,
    gpsLatitude: null,
    gpsLongitude: null,
    agreedToGPS: false,
  });
  const [locationStatus, setLocationStatus] = useState<"detecting" | "success" | "error" | "idle">("idle");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Get user's current location
  const getCurrentLocation = () => {
    setLocationStatus("detecting");
    
    if (!navigator.geolocation) {
      setLocationStatus("error");
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          gpsLatitude: position.coords.latitude,
          gpsLongitude: position.coords.longitude
        }));
        setLocationStatus("success");
        toast({
          title: "Location Detected",
          description: "Your GPS coordinates have been recorded successfully."
        });
      },
      (error) => {
        setLocationStatus("error");
        toast({
          title: "Location Error",
          description: "Unable to detect your location. Please enable location services.",
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  };

  // Auto-detect location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const registrationMutation = useMutation({
    mutationFn: async (data: FastingRegistration) => {
      const { data: result, error } = await supabase
        .from('fasting_registrations')
        .insert([
          {
            full_name: data.fullName,
            phone_number: data.phoneNumber,
            region: data.region,
            travel_cost: data.travelCost,
            gps_latitude: data.gpsLatitude,
            gps_longitude: data.gpsLongitude
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Registration Complete",
        description: `Thank you, ${formData.fullName}! Your registration is complete. Your location has been recorded.`
      });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: "Failed to submit registration. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your full name.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your WhatsApp phone number.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.region.trim()) {
      toast({
        title: "Region Required",
        description: "Please enter your region or town.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.agreedToGPS) {
      toast({
        title: "GPS Agreement Required",
        description: "Please agree to GPS verification for transport refunds.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.gpsLatitude || !formData.gpsLongitude) {
      toast({
        title: "Location Required",
        description: "Please allow location access for GPS verification.",
        variant: "destructive"
      });
      return;
    }

    registrationMutation.mutate(formData);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-800 dark:text-green-200">
              Registration Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-green-700 dark:text-green-300">
              Thank you, <span className="font-semibold">{formData.fullName}</span>!
            </p>
            <p className="text-green-600 dark:text-green-400">
              Your registration for the 3 Days & 3 Nights Fasting Program is complete.
              Your GPS location has been recorded for transport reimbursement verification.
            </p>
            <div className="bg-green-100 dark:bg-green-800 p-4 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>Next Steps:</strong> You will be contacted via WhatsApp with further details about the fasting program.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-lg border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
          <CardTitle className="text-center text-2xl font-bold">
            3 Days & 3 Nights Fasting Program – June
          </CardTitle>
          <p className="text-center text-blue-100 mt-2">
            Join our special fasting and prayer program with transport reimbursement
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Full Name *
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="border-gray-300 focus:border-blue-500"
                required
              />
            </div>

            {/* WhatsApp Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                WhatsApp Phone Number *
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="border-gray-300 focus:border-blue-500"
                required
              />
              <p className="text-sm text-gray-600">Include country code (e.g., +1, +234)</p>
            </div>

            {/* Region/Town */}
            <div className="space-y-2">
              <Label htmlFor="region" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Region or Town *
              </Label>
              <Input
                id="region"
                type="text"
                placeholder="Enter your region or town"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                className="border-gray-300 focus:border-blue-500"
                required
              />
            </div>

            {/* Travel Cost */}
            <div className="space-y-2">
              <Label htmlFor="travelCost" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Estimated Travel Cost
              </Label>
              <Input
                id="travelCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.travelCost || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, travelCost: parseFloat(e.target.value) || 0 }))}
                className="border-gray-300 focus:border-blue-500"
              />
              <p className="text-sm text-gray-600">Enter your estimated travel cost for reimbursement</p>
            </div>

            {/* GPS Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                GPS Location Verification
              </Label>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                {locationStatus === "detecting" && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                    Detecting your location...
                  </div>
                )}
                
                {locationStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Location detected successfully
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      className="ml-auto"
                    >
                      Update Location
                    </Button>
                  </div>
                )}
                
                {locationStatus === "error" && (
                  <div className="space-y-2">
                    <div className="text-red-600 text-sm">
                      Unable to detect location. Please enable location services.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* GPS Agreement Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Checkbox
                id="gpsAgreement"
                checked={formData.agreedToGPS}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, agreedToGPS: checked as boolean }))
                }
                className="mt-1"
              />
              <Label htmlFor="gpsAgreement" className="text-sm leading-relaxed cursor-pointer">
                I understand that my GPS location will be verified for transport reimbursement purposes. 
                This location data will be used solely for verifying attendance at the fasting program venue.
              </Label>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
              disabled={registrationMutation.isPending || locationStatus !== "success"}
            >
              {registrationMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Submitting Registration...
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Submit Registration
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}