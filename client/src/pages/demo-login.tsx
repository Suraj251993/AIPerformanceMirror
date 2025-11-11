import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, User, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type DemoRole = 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

interface RoleCardProps {
  role: DemoRole;
  title: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  onSelect: (role: DemoRole) => void;
  isLoading: boolean;
}

function RoleCard({ role, title, name, description, icon, color, features, onSelect, isLoading }: RoleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4 }}
    >
      <Card className="relative overflow-hidden hover-elevate cursor-pointer h-full" data-testid={`card-role-${role.toLowerCase()}`}>
        <div className={`absolute top-0 left-0 w-full h-1 ${color}`} />
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
              {icon}
            </div>
            <Badge variant="secondary" className="text-xs">Demo</Badge>
          </div>
          <CardTitle className="text-xl mt-4">{title}</CardTitle>
          <CardDescription className="text-base">{name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Access Includes</p>
            <ul className="space-y-1.5">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start text-sm">
                  <ArrowRight className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button 
            className="w-full mt-4" 
            onClick={() => onSelect(role)}
            disabled={isLoading}
            data-testid={`button-select-${role.toLowerCase()}`}
          >
            {isLoading ? "Loading..." : `Continue as ${title}`}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DemoLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const setRoleMutation = useMutation({
    mutationFn: async (role: DemoRole) => {
      return apiRequest('POST', '/api/demo/set-role', { role });
    },
    onSuccess: (data, role) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role Selected",
        description: `You are now exploring as ${getRoleName(role)}`,
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set demo role",
        variant: "destructive",
      });
    },
  });

  const getRoleName = (role: DemoRole) => {
    switch (role) {
      case 'HR_ADMIN': return 'HR Administrator';
      case 'MANAGER': return 'Manager';
      case 'EMPLOYEE': return 'Employee';
    }
  };

  const roles: Array<Omit<RoleCardProps, 'onSelect' | 'isLoading'>> = [
    {
      role: 'HR_ADMIN',
      title: 'HR Administrator',
      name: 'Meenakshi Dabral',
      description: 'Full system access with organization-wide visibility and control.',
      icon: <Shield className="h-6 w-6 text-red-600" />,
      color: 'bg-red-600',
      features: [
        'View all employee performance data',
        'Manage user roles and permissions',
        'Configure system settings',
        'Send automated reports',
        'Access analytics dashboard',
      ],
    },
    {
      role: 'MANAGER',
      title: 'Manager',
      name: 'Meenakshi Dabral',
      description: 'Team oversight with ability to track and guide team performance.',
      icon: <Users className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-600',
      features: [
        'View team performance metrics',
        'Track employee progress',
        'Monitor team velocity',
        'Identify at-risk team members',
        'Access team analytics',
      ],
    },
    {
      role: 'EMPLOYEE',
      title: 'Employee',
      name: 'Jeeveetha P C K',
      description: 'Personal performance tracking and development insights.',
      icon: <User className="h-6 w-6 text-green-600" />,
      color: 'bg-green-600',
      features: [
        'View personal performance score',
        'Track task completion',
        'Monitor individual metrics',
        'See performance trends',
        'Compare with team average',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] via-[#123B6A] to-[#1E6FB8] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-3">AI Performance Mirror</h1>
          <p className="text-blue-200 text-lg mb-2">Select Your Demo Role</p>
          <p className="text-blue-300 text-sm max-w-2xl mx-auto">
            Choose a role to explore the application with real employee data. Each role shows 
            actual performance metrics and insights from the HR Team database.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((roleProps) => (
            <RoleCard
              key={roleProps.role}
              {...roleProps}
              onSelect={setRoleMutation.mutate}
              isLoading={setRoleMutation.isPending}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 text-blue-200 text-sm"
        >
          You'll be logged in as a real employee with actual performance data from the HR Team database.
        </motion.p>
      </div>
    </div>
  );
}
