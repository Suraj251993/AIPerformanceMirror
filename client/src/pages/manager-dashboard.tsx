import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/kpi-card";
import { Users, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreCircle } from "@/components/score-circle";
import { motion } from "framer-motion";
import { useState } from "react";
import { ScoreDetailsModal } from "@/components/score-details-modal";
import { FeedbackDialog } from "@/components/feedback-dialog";
import type { User, Score } from "@shared/schema";

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

export default function ManagerDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [feedbackUserId, setFeedbackUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/dashboard/manager"],
  });

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
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your team's performance</p>
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
                          Feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          <Card className="sticky top-4">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Alerts</h2>
            </div>
            <div className="p-6 space-y-3">
              {data?.alerts && data.alerts.length > 0 ? (
                data.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'warning'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-blue-500/30 bg-blue-500/5'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">{alert.userName}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
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
    </div>
  );
}
