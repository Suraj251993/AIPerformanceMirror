import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Eye } from "lucide-react";

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  department: string | null;
  role: string | null;
  profileImageUrl: string | null;
}

export default function TeamMembersPage() {
  const { data: teamMembers, isLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/manager/team-members'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const getFullName = (firstName: string | null, lastName: string | null) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
  };

  const getRoleBadgeVariant = (role: string | null) => {
    if (role === 'MANAGER') return 'default';
    if (role === 'HR_ADMIN') return 'secondary';
    return 'outline';
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-team-members">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Team Members
          </h1>
          <p className="text-muted-foreground">
            View and manage your team members' tasks and performance
          </p>
        </div>
      </div>

      {!teamMembers || teamMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No team members found. Team members will appear here once assigned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <Card key={member.id} className="hover-elevate" data-testid={`card-team-member-${member.id}`}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate" data-testid={`text-member-name-${member.id}`}>
                    {getFullName(member.firstName, member.lastName)}
                  </CardTitle>
                  <CardDescription className="truncate" data-testid={`text-member-email-${member.id}`}>
                    {member.email || 'No email'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {member.role && (
                    <Badge variant={getRoleBadgeVariant(member.role)} data-testid={`badge-member-role-${member.id}`}>
                      {member.role.replace('_', ' ')}
                    </Badge>
                  )}
                  {member.department && (
                    <Badge variant="outline" data-testid={`badge-member-department-${member.id}`}>
                      {member.department}
                    </Badge>
                  )}
                </div>
                <Link href={`/team-members/${member.id}`}>
                  <Button 
                    variant="default" 
                    className="w-full"
                    data-testid={`button-view-member-${member.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Tasks
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
