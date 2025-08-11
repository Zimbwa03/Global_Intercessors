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
    mode: 'onChange'
  });

  const { handleSubmit, reset, formState: { errors } } = methods;

  // Fetch user profile
  const profileQuery = useQuery({ // Renamed from data to profileQuery for clarity in onSuccess
    queryKey: ['user-profile', userEmail],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Profile fetch error:', error);
          // Return default profile structure for new users
          const defaultProfile = {
            id: user.id,
            email: user.email || '',
            full_name: '',
            phone_number: '',
            region: '',
            role: 'intercessor',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const profileData = {
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
          };
          reset(profileData);
          return defaultProfile as UserProfile;
        }

        // Map Supabase data to form data structure
        const profileData = {
          fullName: data?.full_name || '',
          profilePicture: data?.profile_picture || '',
          gender: data?.gender || undefined,
          dateOfBirth: data?.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : '', // Format date for input type="date"
          phoneNumber: data?.phone_number || '',
          country: data?.country || '',
          city: data?.city || '',
          timezone: data?.timezone || 'UTC+0',
          bio: data?.bio || '',
          spiritualGifts: data?.spiritual_gifts || [],
          prayerPreferences: data?.prayer_preferences || ''
        };

        // Use setTimeout to avoid React state update warnings
        setTimeout(() => {
          reset(profileData);
        }, 0);

        return data as UserProfile;
      } catch (error) {
        console.error('Profile query error:', error);
        throw error;
      }
    },
    enabled: !!userEmail,
    retry: 2,
    retryDelay: 1000
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: UserProfileFormData) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Prepare the update data, ensuring proper field mapping
        const updateData: any = {
          full_name: values.fullName || null,
          profile_picture: values.profilePicture || null,
          gender: values.gender || null,
          date_of_birth: values.dateOfBirth && values.dateOfBirth.trim() !== '' ? values.dateOfBirth : null,
          phone_number: values.phoneNumber || null,
          country: values.country || null,
          city: values.city || null,
          timezone: values.timezone || 'UTC+0',
          bio: values.bio || null,
          spiritual_gifts: values.spiritualGifts || [],
          prayer_preferences: values.prayerPreferences || null,
          updated_at: new Date().toISOString()
        };

        // Use upsert to handle both insert and update cases
        const { data, error: updateError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            ...updateData
          }, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw new Error(updateError.message || 'An error occurred during profile update.');
        }

        return data;
      } catch (error) {
        console.error('Profile mutation error:', error);

        // Extract meaningful error message
        let errorMessage = 'Failed to update profile';
        if (error?.message) {
          errorMessage = error.message;
        } else if (error?.details) {
          errorMessage = error.details;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        throw new Error(errorMessage);
      }
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
        title: "Success",
        description: "Your profile has been updated successfully!",
      });
      // Refetch profile data to ensure UI is in sync
      profileQuery.refetch();
    },
    onError: (error) => {
      console.error('Profile update error:', error);

      let errorMessage = "Failed to update profile";
      if (error?.message?.includes('date')) {
        errorMessage = "Please check your date format. Leave date fields empty if not needed.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
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


  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-gi-primary mb-4"></i>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileQuery.error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 text-lg">Error loading profile: {profileQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data; // Get data from the query

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
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="city">
                        City/Region
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Enter your city/region"
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage error={errors.city?.message} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={methods.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="dateOfBirth">
                        Date of Birth
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          placeholder="Select your birth date"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            // Only set valid dates, clear if empty
                            const value = e.target.value;
                            field.onChange(value === '' ? '' : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Enter your date of birth.
                      </FormDescription>
                      <FormMessage error={errors.dateOfBirth?.message} />
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