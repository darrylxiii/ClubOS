import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Briefcase, CheckSquare, MessageSquare, Calendar } from "lucide-react";

interface ToolCall {
  name: string;
  status: 'running' | 'completed' | 'failed';
  result?: any;
}

interface AIToolCallProgressProps {
  toolCalls: ToolCall[];
}

export function AIToolCallProgress({ toolCalls }: AIToolCallProgressProps) {
  if (toolCalls.length === 0) return null;

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('job')) return Briefcase;
    if (toolName.includes('task')) return CheckSquare;
    if (toolName.includes('message')) return MessageSquare;
    if (toolName.includes('meeting') || toolName.includes('booking')) return Calendar;
    return CheckSquare;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return Loader2;
      case 'completed': return CheckCircle2;
      case 'failed': return XCircle;
      default: return Loader2;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          AI Tools Active
        </div>

        {toolCalls.map((toolCall, index) => {
          const ToolIcon = getToolIcon(toolCall.name);
          const StatusIcon = getStatusIcon(toolCall.status);
          const statusColor = getStatusColor(toolCall.status);

          return (
            <div
              key={`${toolCall.name}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/30"
            >
              <ToolIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {formatToolName(toolCall.name)}
                </p>
                {toolCall.result?.message && (
                  <p className="text-xs text-muted-foreground truncate">
                    {toolCall.result.message}
                  </p>
                )}
              </div>

              <StatusIcon 
                className={`h-4 w-4 flex-shrink-0 ${statusColor} ${toolCall.status === 'running' ? 'animate-spin' : ''}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function formatToolName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
