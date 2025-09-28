import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { zoomService } from '@/services/zoom-service';

export function ZoomTestPanel() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Fetch real-time Zoom data
  const { data: zoomData, isLoading, error, refetch } = useQuery({
    queryKey: ['zoom-test-data'],
    queryFn: () => zoomService.getDashboardData(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: liveMeetings, isLoading: liveMeetingsLoading } = useQuery({
    queryKey: ['live-meetings-test'],
    queryFn: () => zoomService.getLiveMeetings(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const testZoomConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await zoomService.testConnection();
      setTestResults(result);
      
      if (result.success) {
        toast({
          title: "✅ Zoom Connection Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "❌ Zoom Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResults({
        success: false,
        message: error.message || 'Connection test failed'
      });
      toast({
        title: "❌ Test Failed",
        description: error.message || 'Connection test failed',
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Card className="shadow-xl border border-gi-primary/20">
      <CardHeader className="bg-gradient-to-r from-gi-primary/5 to-gi-gold/5 border-b border-gi-primary/10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gi-primary rounded-xl flex items-center justify-center mr-3 shadow-lg">
              <i className="fas fa-flask text-gi-gold"></i>
            </div>
            <span className="font-poppins text-xl text-gi-primary">Zoom Integration Test</span>
          </div>
          <Button 
            onClick={testZoomConnection} 
            disabled={isTestingConnection}
            className="bg-gi-primary hover:bg-gi-primary/90"
          >
            {isTestingConnection ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testing...
              </>
            ) : (
              <>
                <i className="fas fa-plug mr-2"></i>
                Test Connection
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Connection Test Results */}
        {testResults && (
          <div className={`p-4 rounded-lg mb-6 ${
            testResults.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center mb-2">
              <i className={`fas ${testResults.success ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'} mr-2`}></i>
              <h4 className={`font-semibold ${testResults.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.success ? 'Connection Successful' : 'Connection Failed'}
              </h4>
            </div>
            <p className={`text-sm ${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResults.message}
            </p>
            {testResults.data && (
              <div className="mt-3 text-sm text-gray-600">
                <div>Meetings found: {testResults.data.meetings_count}</div>
                <div>Token obtained: {testResults.data.token_obtained ? 'Yes' : 'No'}</div>
                <div>Credentials configured: {testResults.data.credentials_configured ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-gi-primary/5 rounded-lg border border-gi-primary/20">
            <h4 className="font-semibold text-gi-primary mb-3">Analytics Data</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gi-primary"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-sm">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Failed to load analytics: {(error as Error).message}
              </div>
            ) : zoomData?.analytics ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Meetings:</span>
                  <span className="font-semibold">{zoomData.analytics.totalMeetings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Participants:</span>
                  <span className="font-semibold">{zoomData.analytics.totalParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Participants:</span>
                  <span className="font-semibold">{zoomData.analytics.avgParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span>Attendance Rate:</span>
                  <span className="font-semibold">{zoomData.analytics.attendanceRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Users Today:</span>
                  <span className="font-semibold">{zoomData.analytics.activeUsersToday}</span>
                </div>
                <div className="flex justify-between">
                  <span>Growth:</span>
                  <span className="font-semibold text-green-600">{zoomData.analytics.participantGrowth}</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No analytics data available</div>
            )}
          </div>

          <div className="p-4 bg-gi-gold/5 rounded-lg border border-gi-gold/20">
            <h4 className="font-semibold text-gi-primary mb-3">Live Meetings</h4>
            {liveMeetingsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gi-gold"></div>
              </div>
            ) : liveMeetings && liveMeetings.length > 0 ? (
              <div className="space-y-3">
                {liveMeetings.map((meeting: any, index: number) => (
                  <div key={meeting.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <div>
                      <div className="font-semibold text-red-700">{meeting.topic}</div>
                      <div className="text-red-600 text-xs">Meeting ID: {meeting.id}</div>
                    </div>
                    <Badge variant="destructive" className="animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></div>
                      LIVE
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm flex items-center">
                <i className="fas fa-sleep mr-2"></i>
                No live meetings currently
              </div>
            )}
          </div>
        </div>

        {/* Recent Meetings */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gi-primary mb-3">Recent Meetings</h4>
          {zoomData?.recentMeetings && zoomData.recentMeetings.length > 0 ? (
            <div className="space-y-2">
              {zoomData.recentMeetings.slice(0, 5).map((meeting: any, index: number) => (
                <div key={meeting.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                  <div>
                    <div className="font-medium">{meeting.topic}</div>
                    <div className="text-gray-500 text-xs">
                      {new Date(meeting.start_time).toLocaleDateString()} - {meeting.duration} min
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gi-primary font-semibold">{meeting.participant_count || 0}</div>
                    <div className="text-gray-500 text-xs">participants</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No recent meetings found</div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <Button 
            onClick={() => refetch()} 
            variant="outline"
            className="border-gi-primary text-gi-primary hover:bg-gi-primary/10"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
