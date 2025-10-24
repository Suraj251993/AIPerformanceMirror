import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, MessageSquare, GitCommit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityEvent } from "@shared/schema";

interface ActivityTimelineProps {
  activities: ActivityEvent[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getIcon = (eventType: string) => {
    switch (eventType) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'commented':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'updated':
        return <GitCommit className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEventDescription = (activity: ActivityEvent) => {
    const payload = activity.payload as any;
    
    switch (activity.sourceType) {
      case 'task':
        if (activity.eventType === 'completed') {
          return `Completed task: ${payload?.title || 'Untitled'}`;
        }
        if (activity.eventType === 'created') {
          return `Created task: ${payload?.title || 'Untitled'}`;
        }
        return `Updated task: ${payload?.title || 'Untitled'}`;
      case 'time_log':
        return `Logged ${payload?.minutes || 0} minutes on ${payload?.taskTitle || 'a task'}`;
      case 'comment':
        return `Commented on ${payload?.taskTitle || 'a task'}`;
      default:
        return activity.eventType;
    }
  };

  if (activities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <Card key={activity.id} className="p-4 hover-elevate">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                {getIcon(activity.eventType)}
              </div>
              {index < activities.length - 1 && (
                <div className="w-px h-full bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 space-y-1 pt-1">
              <p className="text-sm font-medium text-card-foreground">
                {getEventDescription(activity)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.eventTime), { addSuffix: true })}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
