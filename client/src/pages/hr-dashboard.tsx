import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/kpi-card";
import { Users, TrendingUp, Award, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScoreCircle } from "@/components/score-circle";
import { motion } from "framer-motion";
import { useState } from "react";
import { ScoreDetailsModal } from "@/components/score-details-modal";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { GridBackground } from "@/components/grid-background";
import type { User, Score } from "@shared/schema";
import { MessageSquare } from "lucide-react";

interface DashboardData {
  kpis: {
    totalEmployees: number;
    avgScore: number;
    topPerformers: number;
    needsAttention: number;
  };
  employees: (User & { latestScore?: Score })[];
  departmentStats: { department: string; avgScore: number; count: number }[];
}

export default function HRDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [feedbackUserId, setFeedbackUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/hr"],
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

  const exportToCSV = () => {
    if (!data?.employees) return;
    
    const headers = ["Name", "Email", "Department", "Role", "Score", "Status"];
    const rows = data.employees.map(emp => [
      `${emp.firstName} ${emp.lastName}`,
      emp.email || '',
      emp.department || '',
      emp.role,
      emp.latestScore?.scoreValue.toFixed(1) || 'N/A',
      emp.latestScore ? getScoreLabel(emp.latestScore.scoreValue) : 'N/A'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
      {/* Header with 3D Background */}
      <div className="relative flex items-center justify-between pb-6 -mx-8 px-8">
        <GridBackground />
        <div className="relative z-10">
          <motion.h1 
            className="text-3xl font-bold text-foreground"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            HR Dashboard
          </motion.h1>
          <motion.p 
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Organization-wide performance overview
          </motion.p>
        </div>
        <div className="flex gap-2 relative z-10">
          <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" data-testid="button-export-pdf">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Employees"
          value={data?.kpis.totalEmployees || 0}
          icon={<Users className="w-5 h-5" />}
          delay={0}
        />
        <KPICard
          title="Average Score"
          value={data?.kpis.avgScore.toFixed(1) || '0'}
          change={3.2}
          trend="up"
          icon={<TrendingUp className="w-5 h-5" />}
          delay={0.1}
        />
        <KPICard
          title="Top Performers"
          value={data?.kpis.topPerformers || 0}
          icon={<Award className="w-5 h-5" />}
          delay={0.2}
        />
        <KPICard
          title="Needs Attention"
          value={data?.kpis.needsAttention || 0}
          icon={<AlertCircle className="w-5 h-5" />}
          delay={0.3}
        />
      </div>

      {/* Department Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Department Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.departmentStats.map((dept, i) => (
              <div
                key={dept.department}
                className="p-4 rounded-lg border border-border hover-elevate"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{dept.department}</h3>
                    <p className="text-sm text-muted-foreground">{dept.count} employees</p>
                  </div>
                  <ScoreCircle score={dept.avgScore} size="sm" showLabel={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Employee Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card>
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold">All Employees</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.employees.map((employee) => (
                  <TableRow key={employee.id} className="hover-elevate">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={employee.profileImageUrl || undefined} />
                          <AvatarFallback className="text-sm">
                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{employee.firstName} {employee.lastName}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{employee.department || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{(employee.role || 'N/A').replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-semibold tabular-nums">
                        {employee.latestScore?.scoreValue.toFixed(1) || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {employee.latestScore && (
                        <Badge variant={getScoreBadgeVariant(employee.latestScore.scoreValue)}>
                          {getScoreLabel(employee.latestScore.scoreValue)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFeedbackUserId(employee.id)}
                          data-testid={`button-give-feedback-${employee.id}`}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Comment
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUserId(employee.id)}
                          data-testid={`button-view-details-${employee.id}`}
                        >
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </motion.div>

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
