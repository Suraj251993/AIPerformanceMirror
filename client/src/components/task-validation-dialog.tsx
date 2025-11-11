import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

interface TaskValidationDialogProps {
  task: Task & { assigneeName?: string; projectName?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskValidationDialog({ task, open, onOpenChange }: TaskValidationDialogProps) {
  const [newPercentage, setNewPercentage] = useState<number>(
    task.managerValidatedPercentage !== null && task.managerValidatedPercentage !== undefined
      ? task.managerValidatedPercentage
      : task.progressPercentage
  );
  const [validationComment, setValidationComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { newPercentage: number; validationComment: string }) => {
      return await apiRequest('POST', `/api/tasks/${task.id}/validate`, data);
    },
    onSuccess: () => {
      toast({
        title: "Validation saved",
        description: "Task completion percentage has been validated successfully.",
      });
      // Invalidate all relevant queries to refresh data across the application
      // This ensures validated percentages update in all views
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/manager"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/hr"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/team-tasks"] });
      // Invalidate all team member task queries (uses partial matching)
      // This covers: ["/api/manager/team-members", employeeId, "tasks"]
      queryClient.invalidateQueries({ queryKey: ["/api/manager/team-members"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to validate task",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    const defaultPercentage = task.managerValidatedPercentage !== null && task.managerValidatedPercentage !== undefined
      ? task.managerValidatedPercentage
      : task.progressPercentage;
    setNewPercentage(defaultPercentage);
    setValidationComment('');
  };

  // Reset form whenever task changes or dialog opens
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [task?.id, open]);

  const handleSubmit = () => {
    if (validationComment.trim().length < 10) {
      toast({
        title: "Validation required",
        description: "Please provide a comment of at least 10 characters explaining the validation.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      newPercentage,
      validationComment: validationComment.trim(),
    });
  };

  const employeeReported = task.progressPercentage;
  // Allow saving if: 
  // 1. Percentage changed from last validated value, OR
  // 2. This is first validation (even if confirming employee's percentage)
  const hasChanged = task.managerValidatedPercentage === null || task.managerValidatedPercentage === undefined
    ? true  // First validation - always allow
    : newPercentage !== task.managerValidatedPercentage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-validate-task">
        <DialogHeader>
          <DialogTitle>Validate Task Completion</DialogTitle>
          <DialogDescription>
            Review and adjust the completion percentage for this task. A comment is required to explain your validation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Task Info */}
          <div className="space-y-2">
            <div className="text-sm font-medium">{task.title}</div>
            {task.projectName && (
              <div className="text-xs text-muted-foreground">Project: {task.projectName}</div>
            )}
            {task.assigneeName && (
              <div className="text-xs text-muted-foreground">Assignee: {task.assigneeName}</div>
            )}
          </div>

          {/* Progress comparison */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Employee Reported</div>
              <div className="text-2xl font-bold" data-testid="text-employee-reported">{employeeReported}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {task.managerValidatedPercentage !== null && task.managerValidatedPercentage !== undefined
                  ? 'Current Validated'
                  : 'New Validated'}
              </div>
              <div className="text-2xl font-bold text-primary" data-testid="text-manager-validated">
                {task.managerValidatedPercentage ?? 'Not Set'}
                {task.managerValidatedPercentage !== null && task.managerValidatedPercentage !== undefined && '%'}
              </div>
            </div>
          </div>

          {/* Percentage slider */}
          <div className="space-y-3">
            <Label htmlFor="percentage-slider">
              Validated Percentage: <span className="font-bold">{newPercentage}%</span>
            </Label>
            <Slider
              id="percentage-slider"
              value={[newPercentage]}
              onValueChange={([value]) => setNewPercentage(value)}
              min={0}
              max={100}
              step={5}
              className="w-full"
              data-testid="slider-percentage"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Validation comment */}
          <div className="space-y-2">
            <Label htmlFor="validation-comment">
              Validation Comment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="validation-comment"
              placeholder="Explain why you're adjusting the completion percentage (e.g., 'Task is only 50% complete, pending integration testing')"
              value={validationComment}
              onChange={(e) => setValidationComment(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="input-validation-comment"
            />
            <div className="text-xs text-muted-foreground">
              {validationComment.length}/1000 characters (minimum 10)
            </div>
          </div>

          {/* Previous validation info */}
          {task.validationComment && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Previous Validation</div>
              <div className="text-sm">{task.validationComment}</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={mutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanged || mutation.isPending}
            data-testid="button-submit-validation"
          >
            {mutation.isPending ? 'Saving...' : 'Save Validation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
