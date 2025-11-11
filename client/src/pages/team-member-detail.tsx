import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { TaskValidationDialog } from "@/components/task-validation-dialog";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  department: string | null;
  role: string | null;
  profileImageUrl: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  progressPercentage: number | null;
  managerValidatedPercentage: number | null;
  validatedBy: string | null;
  validatedAt: Date | null;
  validationComment: string | null;
  dueDate: Date | null;
  updatedAt: Date | null;
  projectName: string | null;
}

export default function TeamMemberDetailPage() {
  const [, params] = useRoute("/team-members/:id");
  const employeeId = params?.id;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['/api/manager/team-members'],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/manager/team-members', employeeId, 'tasks'],
    enabled: !!employeeId,
  });

  const employee = teamMembers?.find(m => m.id === employeeId);

  const handleValidateClick = (task: Task) => {
    setSelectedTask(task);
    setValidationDialogOpen(true);
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const getFullName = (firstName: string | null, lastName: string | null) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
  };

  const getStatusBadgeVariant = (status: string | null) => {
    if (status === 'COMPLETED') return 'default';
    if (status === 'IN_PROGRESS') return 'secondary';
    return 'outline';
  };

  const getPriorityBadgeVariant = (priority: string | null) => {
    if (priority === 'HIGH') return 'destructive';
    if (priority === 'MEDIUM') return 'default';
    return 'secondary';
  };

  if (tasksLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-team-member-detail">
      <div className="flex items-center gap-4">
        <Link href="/team-members">
          <Button variant="ghost" size="icon" data-testid="button-back-to-team-members">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        {employee && (
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-employee-name">
                {getFullName(employee.firstName, employee.lastName)}
              </h1>
              <p className="text-muted-foreground" data-testid="text-employee-email">
                {employee.email}
              </p>
              <div className="flex gap-2 mt-2">
                {employee.role && (
                  <Badge variant="outline" data-testid="badge-employee-role">
                    {employee.role.replace('_', ' ')}
                  </Badge>
                )}
                {employee.department && (
                  <Badge variant="outline" data-testid="badge-employee-department">
                    {employee.department}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Assigned Tasks
          </CardTitle>
          <CardDescription>
            Review and validate task completion for this team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No tasks assigned to this team member
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table data-testid="table-employee-tasks">
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-center">Employee %</TableHead>
                    <TableHead className="text-center">Validated %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-task-project-${task.id}`}>
                        {task.projectName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusBadgeVariant(task.status)}
                          data-testid={`badge-task-status-${task.id}`}
                        >
                          {task.status?.replace('_', ' ') || 'TODO'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getPriorityBadgeVariant(task.priority)}
                          data-testid={`badge-task-priority-${task.id}`}
                        >
                          {task.priority || 'LOW'}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-task-due-date-${task.id}`}>
                        {task.dueDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span 
                          className="font-semibold text-primary"
                          data-testid={`text-task-employee-percentage-${task.id}`}
                        >
                          {task.progressPercentage ?? 0}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {task.managerValidatedPercentage !== null ? (
                          <div className="space-y-1">
                            <span 
                              className="font-semibold text-primary"
                              data-testid={`text-task-validated-percentage-${task.id}`}
                            >
                              {task.managerValidatedPercentage}%
                            </span>
                            {task.validatedAt && (
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.validatedAt), 'MMM d')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span 
                            className="text-muted-foreground text-sm"
                            data-testid={`text-task-not-validated-${task.id}`}
                          >
                            Not Set
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleValidateClick(task)}
                          data-testid={`button-validate-task-${task.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Validate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskValidationDialog
          task={selectedTask}
          open={validationDialogOpen}
          onOpenChange={setValidationDialogOpen}
        />
      )}
    </div>
  );
}
