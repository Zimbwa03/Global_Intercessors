import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Camera, 
  Edit, 
  Save, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Globe,
  Heart,
  Star,
  Upload,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion, AnimatePresence } from "framer-motion";
import giIcon from "@assets/GI_GOLD_Green_Icon_1751586542565.png";
import { type UserProfile } from "@shared/schema";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  spiritualGifts: z.array(z.string()).optional(),
  prayerPreferences: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfileManagerProps {
  userId: string;
  onClose?: () => void;
}

const spiritualGiftsOptions = [
  "Intercession", "Prophecy", "Healing", "Teaching", "Evangelism", 
  "Pastoral Care", "Leadership", "Worship", "Mercy", "Discernment",
  "Faith", "Giving", "Helps", "Administration", "Tongues", "Interpretation"
];

const timezones = [
  { value: "UTC-12", label: "(UTC-12:00) International Date Line West" },
  { value: "UTC-11", label: "(UTC-11:00) Coordinated Universal Time-11" },
  { value: "UTC-10", label: "(UTC-10:00) Hawaii" },
  { value: "UTC-9", label: "(UTC-09:00) Alaska" },
  { value: "UTC-8", label: "(UTC-08:00) Pacific Time (US & Canada)" },
  { value: "UTC-7", label: "(UTC-07:00) Mountain Time (US & Canada)" },
  { value: "UTC-6", label: "(UTC-06:00) Central Time (US & Canada)" },
  { value: "UTC-5", label: "(UTC-05:00) Eastern Time (US & Canada)" },
  { value: "UTC-4", label: "(UTC-04:00) Atlantic Time (Canada)" },
  { value: "UTC-3", label: "(UTC-03:00) Brasilia" },
  { value: "UTC-2", label: "(UTC-02:00) Mid-Atlantic" },
  { value: "UTC-1", label: "(UTC-01:00) Azores" },
  { value: "UTC+0", label: "(UTC+00:00) Greenwich Mean Time" },
  { value: "UTC+1", label: "(UTC+01:00) Central European Time" },
  { value: "UTC+2", label: "(UTC+02:00) Eastern European Time" },
  { value: "UTC+3", label: "(UTC+03:00) Moscow" },
  { value: "UTC+4", label: "(UTC+04:00) Abu Dhabi" },
  { value: "UTC+5", label: "(UTC+05:00) Islamabad" },
  { value: "UTC+6", label: "(UTC+06:00) Almaty" },
  { value: "UTC+7", label: "(UTC+07:00) Bangkok" },
  { value: "UTC+8", label: "(UTC+08:00) Beijing" },
  { value: "UTC+9", label: "(UTC+09:00) Tokyo" },
  { value: "UTC+10", label: "(UTC+10:00) Sydney" },
  { value: "UTC+11", label: "(UTC+11:00) Solomon Islands" },
  { value: "UTC+12", label: "(UTC+12:00) Fiji" },
];

export function UserProfileManager({ userId, onClose }: UserProfileManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/profile/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json() as UserProfile;
    },
    enabled: !!userId,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      gender: undefined,
      dateOfBirth: '',
      country: '',
      city: '',
      timezone: 'UTC+0',
      bio: '',
      spiritualGifts: [],
      prayerPreferences: '',
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
        gender: profile.gender as "male" | "female" | "other" || undefined,
        dateOfBirth: profile.dateOfBirth || '',
        country: profile.country || '',
        city: profile.city || '',
        timezone: profile.timezone || 'UTC+0',
        bio: profile.bio || '',
        spiritualGifts: profile.spiritualGifts || [],
        prayerPreferences: profile.prayerPreferences || '',
      });
      setSelectedGifts(profile.spiritualGifts || []);
      setProfilePicture(profile.profilePicture || null);
    }
  }, [profile, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const profileData = {
        ...data,
        spiritualGifts: selectedGifts,
        profilePicture: profilePicture,
      };
      
      const response = await fetch(`/api/users/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      setProfilePicture(publicUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Profile picture uploaded successfully.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Toggle spiritual gift selection
  const toggleGift = (gift: string) => {
    setSelectedGifts(prev => 
      prev.includes(gift) 
        ? prev.filter(g => g !== gift)
        : [...prev, gift]
    );
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gi-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img src={giIcon} alt="GI Icon" className="w-8 h-8 object-contain" />
          <h1 className="text-2xl font-bold text-gi-primary">User Profile</h1>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gi-primary hover:bg-gi-primary/90"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateProfileMutation.isPending}
                className="bg-gi-primary hover:bg-gi-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gi-primary/10 flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gi-primary/50" />
                    )}
                  </div>
                  {isEditing && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <label htmlFor="profile-picture" className="cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                        <input
                          id="profile-picture"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {profile?.fullName || 'Complete your profile'}
                  </h3>
                  <p className="text-gray-600">{profile?.email}</p>
                  {isEditing && (
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <p>Click the camera icon to upload a profile picture</p>
                      <p>Supported formats: JPG, PNG (max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Info Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          placeholder="Enter your full name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          type="email"
                          placeholder="Enter your email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          type="tel"
                          placeholder="Enter your phone number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select disabled={!isEditing} value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select disabled={!isEditing} value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Location Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          placeholder="Enter your country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          placeholder="Enter your city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Spiritual Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="w-5 h-5" />
                <span>Spiritual Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={!isEditing}
                        placeholder="Tell us about yourself and your spiritual journey..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Spiritual Gifts */}
              <div className="space-y-3">
                <Label>Spiritual Gifts</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {spiritualGiftsOptions.map((gift) => (
                    <div
                      key={gift}
                      onClick={() => isEditing && toggleGift(gift)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all ${
                        selectedGifts.includes(gift)
                          ? 'bg-gi-primary text-white border-gi-primary'
                          : 'bg-white border-gray-200 hover:border-gi-primary'
                      } ${!isEditing ? 'cursor-default' : ''}`}
                    >
                      <div className="text-sm font-medium">{gift}</div>
                    </div>
                  ))}
                </div>
                {selectedGifts.length === 0 && (
                  <p className="text-sm text-gray-500">
                    {isEditing ? 'Select your spiritual gifts' : 'No spiritual gifts selected'}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="prayerPreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prayer Preferences</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={!isEditing}
                        placeholder="Share your prayer preferences, favorite scriptures, or prayer styles..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Account Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${profile?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">
                    {profile?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Joined: {profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </motion.div>
  );
}