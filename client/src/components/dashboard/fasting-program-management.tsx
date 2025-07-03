
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { Calendar, Clock, Users, MapPin, Mail, AlertCircle, CheckCircle } from 'lucide-react';

interface FastingProgramDetails {
  id: number;
  program_title: string;
  program_subtitle: string;
  program_description: string;
  start_date: string;
  end_date: string;
  registration_open_date: string;
  registration_close_date: string;
  max_participants: number;
  current_participants: number;
  program_status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  special_instructions: string;
  contact_email: string;
  location_details: string;
  days_until_start: number;
  days_until_registration_close: number;
  registration_is_open: boolean;
  program_has_started: boolean;
  program_has_ended: boolean;
}

export function FastingProgramManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<FastingProgramDetails>>({});

  // Fetch current fasting program details
  const { data: programDetails, isLoading, error } = useQuery({
    queryKey: ['fasting-program-details'],
    queryFn: async () => {
      const response = await fetch('/api/admin/fasting-program');
      if (!response.ok) {
        throw new Error('Failed to fetch fasting program details');
      }
      return response.json();
    },
  });

  // Update fasting program details
  const updateMutation = useMutation({
    mutationFn: async (updatedData: Partial<FastingProgramDetails>) => {
      const response = await fetch('/api/admin/fasting-program', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) {
        throw new Error('Failed to update fasting program details');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fasting-program-details'] });
      queryClient.invalidateQueries({ queryKey: ['updates'] }); // Refresh user updates
      setIsEditing(false);
      setFormData({});
      toast({
        title: "Program Updated",
        description: "Fasting program details have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update fasting program details. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(programDetails || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof FastingProgramDetails, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatDateForInput = (dateString: string) => {
    return new Date(dateString).toISOString().slice(0, 16);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load fasting program details</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!programDetails) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No fasting program details found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fasting Program Management</h2>
        {!isEditing ? (
          <Button onClick={handleEdit}>Edit Program Details</Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Program Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gi-primary/600" />
              <div>
                <p className="text-sm text-gray-600">Days Until Start</p>
                <p className="text-2xl font-bold">{programDetails.days_until_start}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Registration Status</p>
                <p className="text-2xl font-bold">
                  {programDetails.registration_is_open ? "Open" : "Closed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Participants</p>
                <p className="text-2xl font-bold">
                  {programDetails.current_participants}/{programDetails.max_participants}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold capitalize">{programDetails.program_status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Program Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program_title">Program Title</Label>
              {isEditing ? (
                <Input
                  id="program_title"
                  value={formData.program_title || ''}
                  onChange={(e) => handleInputChange('program_title', e.target.value)}
                />
              ) : (
                <p className="mt-1 text-lg font-semibold">{programDetails.program_title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="program_subtitle">Program Subtitle</Label>
              {isEditing ? (
                <Input
                  id="program_subtitle"
                  value={formData.program_subtitle || ''}
                  onChange={(e) => handleInputChange('program_subtitle', e.target.value)}
                />
              ) : (
                <p className="mt-1 text-lg text-gray-600">{programDetails.program_subtitle}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="program_description">Program Description</Label>
            {isEditing ? (
              <Textarea
                id="program_description"
                value={formData.program_description || ''}
                onChange={(e) => handleInputChange('program_description', e.target.value)}
                rows={3}
              />
            ) : (
              <p className="mt-1">{programDetails.program_description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date & Time</Label>
              {isEditing ? (
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formatDateForInput(formData.start_date || programDetails.start_date)}
                  onChange={(e) => handleInputChange('start_date', new Date(e.target.value).toISOString())}
                />
              ) : (
                <p className="mt-1">{formatDateTime(programDetails.start_date)}</p>
              )}
            </div>

            <div>
              <Label htmlFor="end_date">End Date & Time</Label>
              {isEditing ? (
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formatDateForInput(formData.end_date || programDetails.end_date)}
                  onChange={(e) => handleInputChange('end_date', new Date(e.target.value).toISOString())}
                />
              ) : (
                <p className="mt-1">{formatDateTime(programDetails.end_date)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="registration_open_date">Registration Opens</Label>
              {isEditing ? (
                <Input
                  id="registration_open_date"
                  type="datetime-local"
                  value={formatDateForInput(formData.registration_open_date || programDetails.registration_open_date)}
                  onChange={(e) => handleInputChange('registration_open_date', new Date(e.target.value).toISOString())}
                />
              ) : (
                <p className="mt-1">{formatDateTime(programDetails.registration_open_date)}</p>
              )}
            </div>

            <div>
              <Label htmlFor="registration_close_date">Registration Closes</Label>
              {isEditing ? (
                <Input
                  id="registration_close_date"
                  type="datetime-local"
                  value={formatDateForInput(formData.registration_close_date || programDetails.registration_close_date)}
                  onChange={(e) => handleInputChange('registration_close_date', new Date(e.target.value).toISOString())}
                />
              ) : (
                <p className="mt-1">{formatDateTime(programDetails.registration_close_date)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_participants">Maximum Participants</Label>
              {isEditing ? (
                <Input
                  id="max_participants"
                  type="number"
                  value={formData.max_participants || ''}
                  onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
                />
              ) : (
                <p className="mt-1">{programDetails.max_participants.toLocaleString()}</p>
              )}
            </div>

            <div>
              <Label htmlFor="program_status">Program Status</Label>
              {isEditing ? (
                <Select
                  value={formData.program_status || programDetails.program_status}
                  onValueChange={(value) => handleInputChange('program_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 capitalize">{programDetails.program_status}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="special_instructions">Special Instructions</Label>
            {isEditing ? (
              <Textarea
                id="special_instructions"
                value={formData.special_instructions || ''}
                onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                rows={3}
              />
            ) : (
              <p className="mt-1">{programDetails.special_instructions}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              {isEditing ? (
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{programDetails.contact_email}</span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="location_details">Location Details</Label>
              {isEditing ? (
                <Input
                  id="location_details"
                  value={formData.location_details || ''}
                  onChange={(e) => handleInputChange('location_details', e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{programDetails.location_details}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
