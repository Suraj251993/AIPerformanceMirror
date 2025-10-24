import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: connectionStatus, isLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/zoho/connection-status"],
  });

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

  const syncProjectsMutation = useMutation({
    mutationFn: async (portalId: string) => {
      return await apiRequest("/api/zoho/sync/projects", "POST", { portalId });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Sync completed",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "Failed to sync projects from Zoho",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage Zoho integration and performance tracking configuration</p>
      </div>

      <Tabs defaultValue="integration" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3" data-testid="tabs-settings">
          <TabsTrigger value="integration" data-testid="tab-integration">Integration</TabsTrigger>
          <TabsTrigger value="scoring" data-testid="tab-scoring">Scoring</TabsTrigger>
          <TabsTrigger value="sync" data-testid="tab-sync">Data Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
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
                    <div className="flex gap-2">
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
                <CardTitle>Performance Scoring Weights</CardTitle>
                <CardDescription>Configure how different metrics contribute to the overall performance score</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Scoring weight configuration will be available in the next update. Current weights: Task Completion (30%), Timeliness (20%), Efficiency (10%), Velocity (15%), Collaboration (5%), Feedback (20%)
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Data Synchronization</CardTitle>
                <CardDescription>Manage automatic data sync from Zoho Projects and Sprints</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Automatic sync scheduling will be available once Zoho connection is established. Manual sync triggers can be used in the meantime.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
