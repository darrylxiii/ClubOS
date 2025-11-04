import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useOrgChart } from '@/hooks/useOrgChart';
import { OrgChartNode } from '@/types/organization';
import { Building2, Users, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrgChartViewProps {
  companyId: string;
}

export function OrgChartView({ companyId }: OrgChartViewProps) {
  const { orgTree, members, loading } = useOrgChart(companyId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assignedCount = members.filter(m => m.department_id).length;
  const hasReportingStructure = members.some(m => m.reports_to_member_id);

  if (members.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Team Members Yet</h3>
          <p className="text-sm text-muted-foreground">
            Add team members to start building your organization chart
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasReportingStructure || orgTree.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Reporting Structure</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {assignedCount === 0 
              ? "Start by assigning team members to departments in the Manage tab"
              : "Define reporting relationships to visualize your org chart"}
          </p>
          <Badge variant="secondary">
            {assignedCount} of {members.length} members assigned to departments
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="p-6">
        <div className="flex justify-center">
          <div className="space-y-8">
            {orgTree.map(node => (
              <OrgChartNodeComponent key={node.member.id} node={node} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

interface OrgChartNodeComponentProps {
  node: OrgChartNode;
}

function OrgChartNodeComponent({ node }: OrgChartNodeComponentProps) {
  const { member, children } = node;
  const profile = member.profiles;
  const department = member.department;
  
  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??';

  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Person Card */}
      <Card className="w-64 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">
                {profile?.full_name || 'Unknown'}
              </h4>
              {member.job_title && (
                <p className="text-sm text-muted-foreground truncate">
                  {member.job_title}
                </p>
              )}
              {department && (
                <Badge 
                  variant="outline" 
                  className="mt-1"
                  style={{ 
                    borderColor: department.color_hex || undefined,
                    color: department.color_hex || undefined 
                  }}
                >
                  {department.name}
                </Badge>
              )}
              {member.is_people_manager && (
                <Badge variant="secondary" className="mt-1 ml-1">
                  <Users className="h-3 w-3 mr-1" />
                  Manager
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Line */}
      {hasChildren && (
        <>
          <div className="w-0.5 h-8 bg-border" />
          <div className="w-0.5 h-4 bg-border" />
        </>
      )}

      {/* Children */}
      {hasChildren && (
        <div className="relative">
          {/* Horizontal connector line */}
          {children.length > 1 && (
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-border"
              style={{ 
                width: `calc(${(children.length - 1) * 280}px)`,
              }}
            />
          )}
          
          {/* Children grid */}
          <div className="flex gap-8 pt-4">
            {children.map(childNode => (
              <div key={childNode.member.id} className="relative">
                {/* Vertical line to parent */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0.5 h-4 bg-border" />
                <OrgChartNodeComponent node={childNode} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
