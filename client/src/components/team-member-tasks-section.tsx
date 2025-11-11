import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Task } from "@shared/schema";

interface EmployeeTask extends Task {
  projectName?: string;
}

interface TeamMemberTasksSectionProps {
  employeeId: string;
  onValidateClick: (task: EmployeeTask) => void;
}

export function TeamMemberTasksSection({ employeeId, onValidateClick }: TeamMemberTasksSectionProps) {
  const { data: tasks, isLoading } = useQuery<EmployeeTask[]>({
    queryKey: ['/api/manager/team-members', employeeId, 'tasks'],
    enabled: !!employeeId,
  });

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

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-muted/20 rounded" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No tasks assigned to this employee</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      <Table data-testid={`table-employee-tasks-${employeeId}`}>
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
                  onClick={() => onValidateClick(task)}
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
  );
}
