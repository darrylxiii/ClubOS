import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Mail, 
  UserCheck, 
  Link2, 
  FileText, 
  DollarSign,
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TimelineEvent {
  date: string;
  type: 'created' | 'invited' | 'registered' | 'merged' | 'resume' | 'compensation';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface MergeTimelineProps {
  events: TimelineEvent[];
}

export function MergeTimeline({ events }: MergeTimelineProps) {
  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return <UserPlus className="w-4 h-4" />;
      case 'invited':
        return <Mail className="w-4 h-4" />;
      case 'registered':
        return <UserCheck className="w-4 h-4" />;
      case 'merged':
        return <Link2 className="w-4 h-4" />;
      case 'resume':
        return <FileText className="w-4 h-4" />;
      case 'compensation':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created':
        return "text-blue-600 bg-blue-100";
      case 'invited':
        return "text-purple-600 bg-purple-100";
      case 'registered':
        return "text-green-600 bg-green-100";
      case 'merged':
        return "text-primary bg-primary/10";
      case 'resume':
        return "text-orange-600 bg-orange-100";
      case 'compensation':
        return "text-emerald-600 bg-emerald-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Merge Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No timeline events yet
            </p>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              
              {events.map((event, index) => (
                <div key={index} className="relative flex gap-4 pl-0">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getColor(event.type)} flex items-center justify-center z-10`}>
                    {getIcon(event.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
