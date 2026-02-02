import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, 
  Calendar, 
  Shield, 
  Settings, 
  MessageSquare, 
  CheckCircle,
  Users,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { 
  NotificationTypeWithAssignments, 
  NOTIFICATION_CATEGORIES,
  PRIORITY_CONFIG,
  useUpdateNotificationType 
} from "@/hooks/useNotificationTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  applications: Mail,
  bookings: Calendar,
  security: Shield,
  system: Settings,
  communications: MessageSquare,
  approvals: CheckCircle,
};

interface NotificationTypeCardProps {
  notificationType: NotificationTypeWithAssignments;
  onEdit: (type: NotificationTypeWithAssignments) => void;
  onAssign: (type: NotificationTypeWithAssignments) => void;
}

export function NotificationTypeCard({ 
  notificationType, 
  onEdit, 
  onAssign 
}: NotificationTypeCardProps) {
  const updateMutation = useUpdateNotificationType();
  
  const categoryConfig = NOTIFICATION_CATEGORIES.find(c => c.key === notificationType.category);
  const priorityConfig = PRIORITY_CONFIG[notificationType.priority];
  const CategoryIcon = CATEGORY_ICONS[notificationType.category] || Mail;

  const handleToggleActive = async () => {
    await updateMutation.mutateAsync({
      id: notificationType.id,
      updates: { is_active: !notificationType.is_active },
    });
  };

  const getRecipientsSummary = () => {
    if (notificationType.role_assignments.length === 0 && notificationType.assignment_count === 0) {
      return 'No recipients configured';
    }
    
    const parts: string[] = [];
    
    if (notificationType.role_assignments.length > 0) {
      parts.push(notificationType.role_assignments.map(r => 
        r.charAt(0).toUpperCase() + r.slice(1)
      ).join(', '));
    }
    
    const userAssignments = notificationType.assignment_count - notificationType.role_assignments.length;
    if (userAssignments > 0) {
      parts.push(`${userAssignments} individual user${userAssignments > 1 ? 's' : ''}`);
    }
    
    return parts.join(' + ') || 'All users (default)';
  };

  return (
    <Card variant="static" className={!notificationType.is_active ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg bg-muted flex-shrink-0`}>
              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">{notificationType.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {categoryConfig?.label || notificationType.category}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${priorityConfig.color} ${priorityConfig.bgColor}`}
                >
                  {priorityConfig.label}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notificationType.description}
              </p>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {getRecipientsSummary()}
                </span>
                {notificationType.edge_function && (
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                    {notificationType.edge_function}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={notificationType.is_active}
              onCheckedChange={handleToggleActive}
              disabled={updateMutation.isPending}
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(notificationType)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssign(notificationType)}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Recipients
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
