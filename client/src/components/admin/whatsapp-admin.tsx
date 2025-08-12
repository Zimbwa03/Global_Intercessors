import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Users, TrendingUp, Clock, AlertCircle, CheckCircle, Settings } from 'lucide-react';

interface WhatsAppStats {
  totalSent: number;
  sentToday: number;
  failedToday: number;
  activeUsers: number;
}

export function WhatsAppAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [adminKey, setAdminKey] = useState('');

  // Fetch WhatsApp bot statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/whatsapp/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: WhatsAppStats; isLoading: boolean };

  // Broadcast admin update mutation
  const broadcastMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; adminKey: string }) => {
      const response = await fetch('/api/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to broadcast update');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setUpdateTitle('');
      setUpdateContent('');
      toast({
        title: "Update Broadcast Successful",
        description: "Your update has been sent to all WhatsApp users.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Broadcast Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test devotional mutation
  const testDevotionalMutation = useMutation({
    mutationFn: async (adminKey: string) => {
      const response = await fetch('/api/whatsapp/test-devotional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test devotional');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Devotional Sent",
        description: "A test devotional has been sent to all active users.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBroadcast = () => {
    if (!updateTitle.trim() || !updateContent.trim() || !adminKey.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields including the admin key.",
        variant: "destructive",
      });
      return;
    }

    broadcastMutation.mutate({
      title: updateTitle,
      content: updateContent,
      adminKey: adminKey,
    });
  };

  const handleTestDevotional = () => {
    if (!adminKey.trim()) {
      toast({
        title: "Missing Admin Key",
        description: "Please enter the admin key.",
        variant: "destructive",
      });
      return;
    }

    testDevotionalMutation.mutate(adminKey);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Bot Administration</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage WhatsApp bot operations and broadcast updates</p>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Bot Performance</span>
          </CardTitle>
          <CardDescription>Real-time WhatsApp bot statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.sentToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Sent Today</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">{stats.totalSent}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Sent</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-600">{stats.failedToday}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed Today</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No statistics available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Key Section */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Authentication</CardTitle>
          <CardDescription>Enter your admin key to access bot management functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="admin-key">Admin Secret Key</Label>
            <Input
              id="admin-key"
              type="password"
              placeholder="Enter admin secret key"
              value={adminKey}
              onChange={(e) => {
                e.preventDefault();
                setAdminKey(e.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-sm text-gray-500">
              This key is required for all administrative operations
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Broadcast Update Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Broadcast Update</span>
          </CardTitle>
          <CardDescription>
            Send an announcement to all WhatsApp bot users. The content will be automatically summarized by AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="update-title">Update Title</Label>
            <Input
              id="update-title"
              type="text"
              placeholder="Enter update title"
              value={updateTitle}
              onChange={(e) => {
                e.preventDefault();
                setUpdateTitle(e.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="update-content">Update Content</Label>
            <Textarea
              id="update-content"
              placeholder="Enter the full update content. This will be summarized for WhatsApp delivery."
              rows={6}
              value={updateContent}
              onChange={(e) => {
                e.preventDefault();
                setUpdateContent(e.target.value);
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-sm text-gray-500">
              Content will be processed by AI to create a concise WhatsApp message (under 150 words)
            </p>
          </div>
          
          <Button 
            onClick={handleBroadcast}
            disabled={broadcastMutation.isPending || !updateTitle.trim() || !updateContent.trim() || !adminKey.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {broadcastMutation.isPending ? 'Broadcasting...' : 'Broadcast Update to All Users'}
          </Button>
        </CardContent>
      </Card>

      {/* Test Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Test Operations</CardTitle>
          <CardDescription>Test bot functionality with these manual triggers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Test Daily Devotional</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manually trigger the daily devotional to be sent to all active users
            </p>
            <Button 
              onClick={handleTestDevotional}
              disabled={testDevotionalMutation.isPending || !adminKey.trim()}
              variant="outline"
              className="w-full"
            >
              {testDevotionalMutation.isPending ? 'Sending...' : 'Send Test Devotional'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bot Features Information */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Features Overview</CardTitle>
          <CardDescription>Current functionality of the WhatsApp prayer bot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Automated Features</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Active</Badge>
                  <span className="text-sm">Daily devotionals at 6:00 AM</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Active</Badge>
                  <span className="text-sm">Prayer slot reminders (1hr & 30min)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Active</Badge>
                  <span className="text-sm">Admin update broadcasting</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">User Features</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Available</Badge>
                  <span className="text-sm">WhatsApp registration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Available</Badge>
                  <span className="text-sm">Custom reminder preferences</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Available</Badge>
                  <span className="text-sm">Timezone configuration</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}