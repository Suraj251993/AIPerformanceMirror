import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  RefreshCw, 
  Settings2, 
  TrendingUp,
  Database,
  FileText,
  Mail,
  Send,
  Clock,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

interface Settings {
  scoringWeights: {
    taskCompletion: number;
    timeliness: number;
    efficiency: number;
    velocity: number;
    collaboration: number;
    feedback: number;
  };
  syncInterval: { minutes: number };
  dataRetention: { days: number };
}

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  itemsProcessed: number;
  errors: string | null;
  completedAt: Date;
}

interface EmailSubscription {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
}

interface EmailSchedule {
  daily: { hour: number; minute: number };
  weekly: { day: number; hour: number; minute: number };
}

interface DeliveryLog {
  id: string;
  reportType: string;
  status: string;
  recipientEmail: string;
  errorMessage: string | null;
  sentAt: Date;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [weights, setWeights] = useState({
    taskCompletion: 30,
    timeliness: 20,
    efficiency: 10,
    velocity: 15,
    collaboration: 5,
    feedback: 20
  });
  const [syncMinutes, setSyncMinutes] = useState(60);
  const [retentionDays, setRetentionDays] = useState(365);
  const [emailSubscription, setEmailSubscription] = useState<EmailSubscription>({
    dailyEnabled: false,
    weeklyEnabled: false,
  });
  const [emailSchedule, setEmailSchedule] = useState<EmailSchedule>({
    daily: { hour: 8, minute: 0 },
    weekly: { day: 1, hour: 8, minute: 0 },
  });

  const { data: connectionStatus, isLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/zoho/connection-status"],
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings/all"],
  });

  const { data: syncLogs } = useQuery<SyncLog[]>({
    queryKey: ["/api/zoho/sync/logs"],
  });

  const { data: subscription } = useQuery<EmailSubscription>({
    queryKey: ["/api/email-reports/subscription"],
    enabled: user?.role === "HR_ADMIN",
  });

  const { data: schedule } = useQuery<EmailSchedule>({
    queryKey: ["/api/email-reports/schedule"],
    enabled: user?.role === "HR_ADMIN",
  });

  const { data: deliveryLogs } = useQuery<DeliveryLog[]>({
    queryKey: ["/api/email-reports/delivery-log"],
    enabled: user?.role === "HR_ADMIN",
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "HR_ADMIN",
  });

  useEffect(() => {
    if (settings) {
      setWeights(settings.scoringWeights);
      setSyncMinutes(settings.syncInterval.minutes);
      setRetentionDays(settings.dataRetention.days);
    }
  }, [settings]);

  useEffect(() => {
    if (subscription) {
      setEmailSubscription(subscription);
    }
  }, [subscription]);

  useEffect(() => {
    if (schedule) {
      setEmailSchedule(schedule);
    }
  }, [schedule]);

  const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const isValidTotal = Math.abs(total - 100) < 0.01;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/zoho/auth-url", "GET");
      const data = await response.json();
      window.open(data.authUrl, '_blank', 'width=600,height=700');
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Authorization window opened",
        description: "Please complete the Zoho authorization in the new window",
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/zoho/connection-status"] });
      }, 5000);
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Failed to start Zoho authorization",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/zoho/connection", "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Disconnected successfully",
        description: "Zoho connection has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/zoho/connection-status"] });
    },
    onError: () => {
      toast({
        title: "Disconnect failed",
        description: "Failed to remove Zoho connection",
        variant: "destructive",
      });
    },
  });

  const saveWeightsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/settings/scoring-weights", "PUT", weights);
    },
    onSuccess: () => {
      toast({
        title: "Scoring weights updated",
        description: "Performance calculations will use the new weights",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/all"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to save scoring weights",
        variant: "destructive",
      });
    },
  });

  const saveSyncIntervalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/settings/sync-interval", "PUT", { minutes: syncMinutes });
    },
    onSuccess: () => {
      toast({
        title: "Sync interval updated",
        description: `Data will sync every ${syncMinutes} minutes`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/all"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update sync interval",
        variant: "destructive",
      });
    },
  });

  const saveRetentionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/settings/data-retention", "PUT", { days: retentionDays });
    },
    onSuccess: () => {
      toast({
        title: "Data retention updated",
        description: `Data older than ${retentionDays} days will be archived`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/all"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update data retention policy",
        variant: "destructive",
      });
    },
  });

  const saveSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/email-reports/subscription", "PUT", emailSubscription);
    },
    onSuccess: () => {
      toast({
        title: "Subscription updated",
        description: "Email report preferences saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-reports/subscription"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to save email subscription",
        variant: "destructive",
      });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async (reportType: string) => {
      return await apiRequest("/api/email-reports/test", "POST", { reportType });
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test report",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send",
        description: "Could not send test email",
        variant: "destructive",
      });
    },
  });

  const saveDailyScheduleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/email-reports/daily-schedule", "PUT", emailSchedule.daily);
    },
    onSuccess: () => {
      toast({
        title: "Schedule updated",
        description: "Daily email time has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-reports/schedule"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update daily schedule",
        variant: "destructive",
      });
    },
  });

  const saveWeeklyScheduleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/email-reports/weekly-schedule", "PUT", emailSchedule.weekly);
    },
    onSuccess: () => {
      toast({
        title: "Schedule updated",
        description: "Weekly email schedule has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-reports/schedule"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update weekly schedule",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage Zoho integration and performance tracking configuration</p>
      </div>

      <Tabs defaultValue="integration" className="space-y-6">
        <TabsList className={`grid w-full max-w-2xl ${user?.role === 'HR_ADMIN' ? 'grid-cols-5' : 'grid-cols-3'}`} data-testid="tabs-settings">
          <TabsTrigger value="integration" data-testid="tab-integration">Integration</TabsTrigger>
          <TabsTrigger value="scoring" data-testid="tab-scoring">Scoring</TabsTrigger>
          <TabsTrigger value="sync" data-testid="tab-sync">Data Sync</TabsTrigger>
          {user?.role === 'HR_ADMIN' && (
            <>
              <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
              <TabsTrigger value="email" data-testid="tab-email">Email Reports</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="integration" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="w-5 h-5" />
                      Zoho Integration
                    </CardTitle>
                    <CardDescription>Connect to Zoho Projects and Sprints for real-time data sync</CardDescription>
                  </div>
                  {connectionStatus?.connected && (
                    <Badge variant="default" className="gap-1" data-testid="badge-connection-status">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                  )}
                  {!connectionStatus?.connected && !isLoading && (
                    <Badge variant="outline" className="gap-1" data-testid="badge-connection-status">
                      <XCircle className="w-3 h-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!connectionStatus?.connected ? (
                  <>
                    <Alert>
                      <AlertDescription>
                        Connect your Zoho account to sync projects, tasks, sprints, and time logs automatically.
                        This enables real-time performance tracking based on actual work data.
                      </AlertDescription>
                    </Alert>
                    <Button 
                      onClick={() => connectMutation.mutate()}
                      disabled={connectMutation.isPending}
                      data-testid="button-connect-zoho"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Zoho Account
                    </Button>
                  </>
                ) : (
                  <>
                    <Alert>
                      <AlertDescription>
                        Your Zoho account is connected. Data will sync automatically based on your configured schedule.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        onClick={() => disconnectMutation.mutate()}
                        disabled={disconnectMutation.isPending}
                        variant="outline"
                        data-testid="button-disconnect-zoho"
                      >
                        Disconnect
                      </Button>
                      <Button 
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/zoho/connection-status"] })}
                        variant="outline"
                        data-testid="button-refresh-status"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Status
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Scoring Weights
                </CardTitle>
                <CardDescription>Configure how different metrics contribute to the overall performance score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {settingsLoading ? (
                  <div className="text-muted-foreground">Loading settings...</div>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="task-completion">Task Completion</Label>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="weight-task-completion">
                            {weights.taskCompletion}%
                          </span>
                        </div>
                        <Slider
                          id="task-completion"
                          value={[weights.taskCompletion]}
                          onValueChange={(val) => setWeights({ ...weights, taskCompletion: val[0] })}
                          max={100}
                          step={1}
                          data-testid="slider-task-completion"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="timeliness">Timeliness</Label>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="weight-timeliness">
                            {weights.timeliness}%
                          </span>
                        </div>
                        <Slider
                          id="timeliness"
                          value={[weights.timeliness]}
                          onValueChange={(val) => setWeights({ ...weights, timeliness: val[0] })}
                          max={100}
                          step={1}
                          data-testid="slider-timeliness"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="efficiency">Efficiency</Label>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="weight-efficiency">
                            {weights.efficiency}%
                          </span>
                        </div>
                        <Slider
                          id="efficiency"
                          value={[weights.efficiency]}
                          onValueChange={(val) => setWeights({ ...weights, efficiency: val[0] })}
                          max={100}
                          step={1}
                          data-testid="slider-efficiency"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="velocity">Sprint Velocity</Label>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="weight-velocity">
                            {weights.velocity}%
                          </span>
                        </div>
                        <Slider
                          id="velocity"
                          value={[weights.velocity]}
                          onValueChange={(val) => setWeights({ ...weights, velocity: val[0] })}
                          max={100}
                          step={1}
                          data-testid="slider-velocity"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="collaboration">Collaboration</Label>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="weight-collaboration">
                            {weights.collaboration}%
                          </span>
                        </div>
                        <Slider
                          id="collaboration"
                          value={[weights.collaboration]}
                          onValueChange={(val) => setWeights({ ...weights, collaboration: val[0] })}
                          max={100}
                          step={1}
                          data-testid="slider-collaboration"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="feedback">Peer Feedback</Label>
                          <span className="text-sm font-medium text-muted-foreground" data-testid="weight-feedback">
                            {weights.feedback}%
                          </span>
                        </div>
                        <Slider
                          id="feedback"
                          value={[weights.feedback]}
                          onValueChange={(val) => setWeights({ ...weights, feedback: val[0] })}
                          max={100}
                          step={1}
                          data-testid="slider-feedback"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Weight</span>
                        <span 
                          className={`text-sm font-bold ${isValidTotal ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                          data-testid="total-weight"
                        >
                          {total.toFixed(1)}%
                        </span>
                      </div>
                      
                      {!isValidTotal && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            Weights must sum to exactly 100%. Currently at {total.toFixed(1)}%.
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button 
                        onClick={() => saveWeightsMutation.mutate()}
                        disabled={!isValidTotal || saveWeightsMutation.isPending}
                        className="w-full"
                        data-testid="button-save-weights"
                      >
                        Save Scoring Weights
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Sync Configuration
                </CardTitle>
                <CardDescription>Configure how often data is synchronized from Zoho</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sync-interval"
                        type="number"
                        min={1}
                        max={1440}
                        value={syncMinutes}
                        onChange={(e) => setSyncMinutes(Number(e.target.value))}
                        data-testid="input-sync-interval"
                      />
                      <Button 
                        onClick={() => saveSyncIntervalMutation.mutate()}
                        disabled={syncMinutes < 1 || syncMinutes > 1440 || saveSyncIntervalMutation.isPending}
                        data-testid="button-save-sync-interval"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Data will sync every {syncMinutes} minutes (1-1440 min range)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retention-days">Data Retention (days)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="retention-days"
                        type="number"
                        min={30}
                        max={3650}
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                        data-testid="input-retention-days"
                      />
                      <Button 
                        onClick={() => saveRetentionMutation.mutate()}
                        disabled={retentionDays < 30 || retentionDays > 3650 || saveRetentionMutation.isPending}
                        data-testid="button-save-retention"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Data older than {retentionDays} days will be archived (30-3650 days range)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Sync Audit Log
                </CardTitle>
                <CardDescription>View recent data synchronization operations</CardDescription>
              </CardHeader>
              <CardContent>
                {!syncLogs || syncLogs.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No sync operations recorded yet. Data will appear here after the first sync.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {syncLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                        data-testid={`sync-log-${log.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">{log.syncType}</span>
                            <Badge 
                              variant={log.status === 'success' ? 'default' : log.status === 'partial_success' ? 'outline' : 'destructive'}
                              className="text-xs"
                            >
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {log.itemsProcessed} items processed
                            {log.completedAt && ` • ${format(new Date(log.completedAt), 'PPp')}`}
                          </p>
                          {log.errors && (
                            <p className="text-xs text-destructive">{log.errors}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {user?.role === 'HR_ADMIN' && (
          <TabsContent value="users" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>Manage user roles and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {!allUsers || allUsers.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        No users found in the system yet.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {allUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                          data-testid={`user-row-${u.id}`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {u.firstName} {u.lastName}
                              </span>
                              {u.id === user?.id && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            {u.department && (
                              <p className="text-xs text-muted-foreground">Department: {u.department}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={u.role || "EMPLOYEE"}
                              onValueChange={(newRole) => {
                                updateUserRoleMutation.mutate({ userId: u.id, role: newRole });
                              }}
                              disabled={u.id === user?.id}
                              data-testid={`select-role-${u.id}`}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HR_ADMIN">HR Admin</SelectItem>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        )}

        {user?.role === 'HR_ADMIN' && (
          <TabsContent value="email" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Report Subscriptions
                </CardTitle>
                <CardDescription>Manage your automated performance report subscriptions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="daily-reports" className="text-base">Daily Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive a daily performance summary every morning
                      </p>
                    </div>
                    <Switch
                      id="daily-reports"
                      checked={emailSubscription.dailyEnabled}
                      onCheckedChange={(checked) => setEmailSubscription({ ...emailSubscription, dailyEnabled: checked })}
                      data-testid="switch-daily-reports"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="weekly-reports" className="text-base">Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive a comprehensive weekly team performance report
                      </p>
                    </div>
                    <Switch
                      id="weekly-reports"
                      checked={emailSubscription.weeklyEnabled}
                      onCheckedChange={(checked) => setEmailSubscription({ ...emailSubscription, weeklyEnabled: checked })}
                      data-testid="switch-weekly-reports"
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={() => saveSubscriptionMutation.mutate()}
                    disabled={saveSubscriptionMutation.isPending}
                    data-testid="button-save-subscription"
                  >
                    Save Preferences
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendTestEmailMutation.mutate('daily')}
                    disabled={sendTestEmailMutation.isPending}
                    data-testid="button-test-daily"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Test Daily Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => sendTestEmailMutation.mutate('weekly')}
                    disabled={sendTestEmailMutation.isPending}
                    data-testid="button-test-weekly"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Test Weekly Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {user?.role === 'HR_ADMIN' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Email Schedule Configuration
                  </CardTitle>
                  <CardDescription>Configure when automated emails are sent (HR Admin only)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Daily Report Time</Label>
                      <div className="flex gap-2">
                        <Select
                          value={emailSchedule.daily.hour.toString()}
                          onValueChange={(val) => setEmailSchedule({
                            ...emailSchedule,
                            daily: { ...emailSchedule.daily, hour: Number(val) }
                          })}
                        >
                          <SelectTrigger className="w-32" data-testid="select-daily-hour">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {String(i).padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => saveDailyScheduleMutation.mutate()}
                          disabled={saveDailyScheduleMutation.isPending}
                          data-testid="button-save-daily-schedule"
                        >
                          Save
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Daily reports will be sent at {String(emailSchedule.daily.hour).padStart(2, '0')}:00
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Weekly Report Schedule</Label>
                      <div className="flex gap-2 flex-wrap">
                        <Select
                          value={emailSchedule.weekly.day.toString()}
                          onValueChange={(val) => setEmailSchedule({
                            ...emailSchedule,
                            weekly: { ...emailSchedule.weekly, day: Number(val) }
                          })}
                        >
                          <SelectTrigger className="w-40" data-testid="select-weekly-day">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dayNames.map((day, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={emailSchedule.weekly.hour.toString()}
                          onValueChange={(val) => setEmailSchedule({
                            ...emailSchedule,
                            weekly: { ...emailSchedule.weekly, hour: Number(val) }
                          })}
                        >
                          <SelectTrigger className="w-32" data-testid="select-weekly-hour">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {String(i).padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => saveWeeklyScheduleMutation.mutate()}
                          disabled={saveWeeklyScheduleMutation.isPending}
                          data-testid="button-save-weekly-schedule"
                        >
                          Save
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Weekly reports will be sent on {dayNames[emailSchedule.weekly.day]} at {String(emailSchedule.weekly.hour).padStart(2, '0')}:00
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Delivery History
                </CardTitle>
                <CardDescription>View recent email report deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                {!deliveryLogs || deliveryLogs.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No email deliveries recorded yet. Reports will appear here after they are sent.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {deliveryLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                        data-testid={`delivery-log-${log.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium capitalize">{log.reportType} Report</span>
                            <Badge
                              variant={log.status === 'sent' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            To: {log.recipientEmail}
                            {log.sentAt && ` • ${format(new Date(log.sentAt), 'PPp')}`}
                          </p>
                          {log.errorMessage && (
                            <p className="text-xs text-destructive">{log.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
