import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Setup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ hasAdmin: boolean }>({
    queryKey: ["/api/setup/check"],
  });

  const claimAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/setup/claim-admin", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to claim admin role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You are now an HR Administrator. Redirecting...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim admin role",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (data?.hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Setup Complete</h2>
          <p className="text-muted-foreground mb-6">
            An HR Administrator has already been configured for this application.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-go-home">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-lg p-8">
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-2xl">
                <Shield className="w-10 h-10 text-primary-foreground" />
              </div>
            </motion.div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">
            First-Time Setup
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Welcome to AI Performance Mirror! No HR Administrator has been configured yet.
          </p>

          <div className="space-y-4 mb-8">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <h3 className="font-semibold mb-2">What is an HR Administrator?</h3>
              <p className="text-sm text-muted-foreground">
                HR Administrators have full access to the system, including:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                <li>View all employees and departments</li>
                <li>Manage user roles and permissions</li>
                <li>Configure system settings</li>
                <li>Access performance analytics across the organization</li>
                <li>Manage email report subscriptions</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm">
                <strong>Note:</strong> This setup only needs to be done once. You will become the first
                HR Administrator and can then promote other users through the Settings page.
              </p>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => claimAdminMutation.mutate()}
            disabled={claimAdminMutation.isPending}
            data-testid="button-claim-admin"
            className="w-full text-lg"
          >
            {claimAdminMutation.isPending ? "Setting up..." : "Become HR Administrator"}
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
