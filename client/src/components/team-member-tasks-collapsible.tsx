import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TeamMemberTasksSection } from "@/components/team-member-tasks-section";
import type { Task } from "@shared/schema";

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

interface TeamMemberTasksCollapsibleProps {
  member: TeamMember;
  isExpanded: boolean;
  onToggle: () => void;
  onValidateClick: (task: EmployeeTask) => void;
}

export function TeamMemberTasksCollapsible({
  member,
  isExpanded,
  onToggle,
  onValidateClick,
}: TeamMemberTasksCollapsibleProps) {
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const getFullName = (firstName: string | null, lastName: string | null) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
  };

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onToggle}
      className="border border-border rounded-lg overflow-hidden"
      data-testid={`collapsible-member-${member.id}`}
    >
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 hover-elevate">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.profileImageUrl || undefined} />
              <AvatarFallback>
                {getInitials(member.firstName, member.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-medium" data-testid={`text-member-name-${member.id}`}>
                {getFullName(member.firstName, member.lastName)}
              </p>
              <p className="text-sm text-muted-foreground" data-testid={`text-member-email-${member.id}`}>
                {member.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {member.department && (
              <Badge variant="outline" data-testid={`badge-member-department-${member.id}`}>
                {member.department}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <TeamMemberTasksSection
          employeeId={member.id}
          onValidateClick={onValidateClick}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
