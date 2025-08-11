import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Calendar, Save, Edit2, X } from "lucide-react";
import { z } from "zod";
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface UserProfileProps {
  userEmail?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  region?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Define the form schema with updated validation
const userProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required for personalized messages'),
  profilePicture: z.string().url().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().min(10, 'Valid WhatsApp phone number is required').regex(/^\+\d+$/, 'Phone number must include country code (e.g., +263...)'),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().default('UTC+0'),
  bio: z.string().optional(),
  spiritualGifts: z.array(z.string()).default([]),
  prayerPreferences: z.string().optional()
});

type UserProfileFormData = z.infer<typeof userProfileSchema>;

// Re-using the original component structure, but adapting the form handling
export function UserProfile({ userEmail }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const methods = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      fullName: '',
      profilePicture: '',
      gender: undefined,
      dateOfBirth: '',
      phoneNumber: '',
      country: '',
      city: '',
      timezone: 'UTC+0',
      bio: '',
      spiritualGifts: [],
      prayerPreferences: ''
    },
  });

  const { handleSubmit, reset, formState: { errors } } = methods;

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userEmail],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Map Supabase data to form data structure
      const profileData = {
        fullName: data?.full_name || '',
        profilePicture: data?.profile_picture || '',
        gender: data?.gender,
        dateOfBirth: data?.date_of_birth || '',
        phoneNumber: data?.phone_number || '',
        country: data?.country || '',
        city: data?.city || '',
        timezone: data?.timezone || 'UTC+0',
        bio: data?.bio || '',
        spiritualGifts: data?.spiritual_gifts || [],
        prayerPreferences: data?.prayer_preferences || ''
      };
      reset(profileData); // Reset form with fetched data
      return data as UserProfile;
    },
    enabled: !!userEmail
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: UserProfileFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: values.fullName,
          phone_number: values.phoneNumber,
          region: values.city, // Assuming 'city' from form maps to 'region' in DB for this example
          // Add other fields as needed, mapping from form values to DB columns
          profile_picture: values.profilePicture,
          gender: values.gender,
          date_of_birth: values.dateOfBirth,
          country: values.country,
          timezone: values.timezone,
          bio: values.bio,
          spiritual_gifts: values.spiritualGifts,
          prayer_preferences: values.prayerPreferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: async (data) => { // Added async here
      // Register for WhatsApp bot if phone number is provided and changed or new
      if (data?.phone_number && data.id) {
        try {
          const response = await fetch('/api/whatsapp/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: data.id,
              whatsAppNumber: data.phone_number
            })
          });

          if (response.ok) {
            toast({
              title: "WhatsApp Registration",
              description: "You're now registered for prayer reminders and devotional messages!",
            });
          } else {
            // Handle non-ok responses from the API
            const errorData = await response.json();
            toast({
              title: "WhatsApp Registration Failed",
              description: errorData.message || "Please try again later.",
              variant: "destructive",
            });
          }
        } catch (whatsappError) {
          console.error('WhatsApp registration error:', whatsappError);
          toast({
            title: "Error",
            description: "An error occurred during WhatsApp registration. Please try again.",
            variant: "destructive",
          });
          // Don't fail the profile update if WhatsApp registration fails
        }
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
      console.error('Profile update error:', error);
    }
  });

  const onSubmit = async (values: UserProfileFormData) => {
    try {
      // Use the mutation directly
      updateProfileMutation.mutate(values);
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    reset(); // Reset form to its initial state or last fetched state
    setIsEditing(false);
  };

  // Helper for FormFields
  const FormField = ({ control, name, render }: any) => (
    <Controller
      control={control}
      name={name}
      render={render}
    />
  );

  // Helper for FormItem
  const FormItem = ({ children }: { children: React.ReactNode }) => (
    <div className="space-y-2">{children}</div>
  );

  // Helper for FormLabel
  const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => (
    <Label htmlFor={htmlFor} className="flex items-center space-x-2">{children}</Label>
  );

  // Helper for FormControl
  const FormControl = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center">{children}</div>
  );

  // Helper for FormDescription
  const FormDescription = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>
  );

  // Helper for FormMessage
  const FormMessage = ({ error }: { error?: string }) => (
    error ? <p className="text-sm font-medium text-red-500 dark:text-red-400">{error}</p> : null
  );


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-gi-primary mb-4"></i>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-poppins">User Profile</h1>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-gi-primary hover:bg-gi-primary/90"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gi-primary" />
            <span>Personal Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="email">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || userEmail || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <FormField
                  control={methods.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="fullName">
                        Full Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Enter your full name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This name will be used for personalized WhatsApp messages and prayer reminders.
                      </FormDescription>
                      <FormMessage error={errors.fullName?.message} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={methods.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="phoneNumber">
                        WhatsApp Phone Number *
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="phoneNumber"
                          placeholder="+263785494594"
                          {...field}
                          type="tel"
                        />
                      </FormControl>
                      <FormDescription>
                        Include country code (e.g., +263). This will be used for prayer reminders and devotional messages.
                      </FormDescription>
                      <FormMessage error={errors.phoneNumber?.message} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={methods.control}
                  name="region" // Assuming 'region' in form maps to 'city' in DB, adjust if needed
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="region">
                        Region
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="region"
                          type="text"
                          placeholder="Enter your region/city"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage error={errors.region?.message} />
                    </FormItem>
                  )}
                />
              </div>

              {/* Profile Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <FormLabel>
                    <i className="fas fa-user-tag w-4 h-4"></i>
                    <span>Role</span>
                  </FormLabel>
                  <Input
                    value={profile?.role || 'intercessor'}
                    disabled
                    className="bg-gray-50 capitalize"
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel>
                    <Calendar className="w-4 h-4" />
                    <span>Member Since</span>
                  </FormLabel>
                  <Input
                    value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateProfileMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="bg-gi-primary hover:bg-gi-primary/90"
                  >
                    {updateProfileMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin w-4 h-4 mr-2"></i>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </FormProvider>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <i className="fas fa-shield-alt w-5 h-5 text-gi-primary"></i>
            <span>Account Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${profile?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {profile?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}