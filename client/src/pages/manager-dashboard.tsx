import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/kpi-card";
import { Users, TrendingUp, AlertTriangle, Target, ChevronDown, ChevronUp, CheckCircle2, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreCircle } from "@/components/score-circle";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ScoreDetailsModal } from "@/components/score-details-modal";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { TaskValidationDialog } from "@/components/task-validation-dialog";
import { AnimatedBackground } from "@/components/animated-background";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { TeamMemberTasksCollapsible } from "@/components/team-member-tasks-collapsible";
import type { User, Score, Task } from "@shared/schema";

interface TeamData {
  kpis: {
    teamSize: number;
    teamAvgScore: number;
    topPerformers: number;
    needsAttention: number;
  };
  teamMembers: (User & { latestScore?: Score })[];
  alerts: { userId: string; userName: string; message: string; severity: 'warning' | 'info' }[];
}

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  department: string | null;
  role: string | null;
  profileImageUrl: string | null;
}

interface EmployeeTask extends Task {
  projectName?: string;
}

export default function ManagerDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [feedbackUserId, setFeedbackUserId] = useState<string | null>(null);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [validationTask, setValidationTask] = useState<EmployeeTask | null>(null);

  const { data, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/dashboard/manager"],
  });

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['/api/manager/team-members'],
  });

  const toggleMember = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 75) return "secondary";
    if (score >= 60) return "outline";
    return "destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Attention";
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 h-32 animate-pulse bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          {/* Header with Animated Background */}
          <div className="relative pb-6 -mx-8 px-8">
            <AnimatedBackground particleCount={30} />
            <div className="relative z-10">
              <motion.h1 
                className="text-3xl font-bold text-foreground"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Team Dashboard
              </motion.h1>
              <motion.p 
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Manage and monitor your team's performance
              </motion.p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Team Size"
              value={data?.kpis.teamSize || 0}
              icon={<Users className="w-5 h-5" />}
              delay={0}
            />
            <KPICard
              title="Team Avg Score"
              value={data?.kpis.teamAvgScore.toFixed(1) || '0'}
              change={2.5}
              trend="up"
              icon={<TrendingUp className="w-5 h-5" />}
              delay={0.1}
            />
            <KPICard
              title="Top Performers"
              value={data?.kpis.topPerformers || 0}
              icon={<Target className="w-5 h-5" />}
              delay={0.2}
            />
            <KPICard
              title="Needs Attention"
              value={data?.kpis.needsAttention || 0}
              icon={<AlertTriangle className="w-5 h-5" />}
              delay={0.3}
            />
          </div>

          {/* Team Members */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Team Members</h2>
              </div>
              <div className="p-6 space-y-4">
                {data?.teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.firstName} {member.lastName}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums">
                          {member.latestScore?.scoreValue.toFixed(1) || 'N/A'}
                        </p>
                        {member.latestScore && (
                          <Badge variant={getScoreBadgeVariant(member.latestScore.scoreValue)} className="mt-1">
                            {getScoreLabel(member.latestScore.scoreValue)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUserId(member.id)}
                          data-testid={`button-view-member-${member.id}`}
                        >
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setFeedbackUserId(member.id)}
                          data-testid={`button-feedback-${member.id}`}
                        >
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Team Tasks with Validation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Task Validation
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Expand team members to view and validate their task completion
                </p>
              </CardHeader>
              <CardContent className="space-y-2" data-testid="section-task-validation">
                {!teamMembers || teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No team members found</p>
                  </div>
                ) : (
                  teamMembers.map((member) => (
                    <TeamMemberTasksCollapsible
                      key={member.id}
                      member={member}
                      isExpanded={expandedMembers.has(member.id)}
                      onToggle={() => toggleMember(member.id)}
                      onValidateClick={setValidationTask}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Alert Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="w-full lg:w-80"
        >
          <Card className="sticky top-4 backdrop-blur-sm bg-card/95 overflow-hidden">
            {/* Subtle glow header */}
            <div className="p-6 border-b border-border relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
              <h2 className="text-lg font-semibold relative z-10 flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-amber-500"
                />
                Alerts
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {data?.alerts && data.alerts.length > 0 ? (
                data.alerts.map((alert, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                    whileHover={{ 
                      y: -2,
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    className={`p-3 rounded-lg border relative overflow-hidden ${
                      alert.severity === 'warning'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-blue-500/30 bg-blue-500/5'
                    }`}
                    style={{
                      boxShadow: alert.severity === 'warning'
                        ? '0 2px 8px rgba(245, 158, 11, 0.1)'
                        : '0 2px 8px rgba(59, 130, 246, 0.1)'
                    }}
                  >
                    {/* Side accent bar */}
                    <div 
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{
                        boxShadow: alert.severity === 'warning'
                          ? '0 0 8px rgba(245, 158, 11, 0.5)'
                          : '0 0 8px rgba(59, 130, 246, 0.5)'
                      }}
                    />
                    
                    {/* Content */}
                    <div className="relative z-10 pl-2">
                      <p className="text-sm font-medium mb-1">{alert.userName}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>

                    {/* Floating particles for warning alerts */}
                    {alert.severity === 'warning' && (
                      <motion.div
                        className="absolute top-1 right-1 w-1 h-1 rounded-full bg-amber-500/50"
                        animate={{
                          y: [0, -10, 0],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3,
                        }}
                      />
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No alerts at this time
                </p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {selectedUserId && (
        <ScoreDetailsModal
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
        />
      )}

      {feedbackUserId && (
        <FeedbackDialog
          toUserId={feedbackUserId}
          open={!!feedbackUserId}
          onOpenChange={(open) => !open && setFeedbackUserId(null)}
        />
      )}

      {validationTask && (
        <TaskValidationDialog
          task={validationTask}
          open={!!validationTask}
          onOpenChange={(open) => !open && setValidationTask(null)}
        />
      )}
    </div>
  );
}
