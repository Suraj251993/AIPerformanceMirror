import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import SettingsPage from "@/pages/settings";
import Landing from "@/pages/landing";
import Setup from "@/pages/setup";
import DemoLogin from "@/pages/demo-login";
import HRDashboard from "@/pages/hr-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import EmployeeView from "@/pages/employee-view";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // If user has no role, show demo login to select role
  // This allows easy testing of different roles
  if (!user?.role) {
    return (
      <Switch>
        <Route path="/demo" component={DemoLogin} />
        <Route path="/" component={DemoLogin} />
        <Route component={DemoLogin} />
      </Switch>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              {/* Demo role selection - available to all authenticated users */}
              <Route path="/demo-login" component={DemoLogin} />
              
              {user?.role === 'HR_ADMIN' && (
                <>
                  <Route path="/" component={HRDashboard} />
                  <Route path="/settings" component={SettingsPage} />
                </>
              )}
              {user?.role === 'MANAGER' && (
                <Route path="/" component={ManagerDashboard} />
              )}
              {user?.role === 'EMPLOYEE' && (
                <Route path="/" component={EmployeeView} />
              )}
              {/* Fallback for unknown roles */}
              {!user?.role && <Route component={NotFound} />}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
