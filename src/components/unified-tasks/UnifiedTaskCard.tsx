import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, User, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UnifiedTaskCardProps {
    task: any;
    onClick: (task: any) => void;
}

export const UnifiedTaskCard = ({ task, onClick }: UnifiedTaskCardProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: task,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-600 border-red-200/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200/20';
            default: return 'bg-blue-500/10 text-blue-600 border-blue-200/20';
        }
    };

    // Calculate progress override or default
    const subtaskCount = 0; // TODO: Fetch from actual relation if available in board query
    const commentCount = 0; // TODO: Fetch from actual relation

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "group relative transition-all duration-300 touch-none",
                isDragging ? "z-50 opacity-50 scale-105 rotate-2" : "z-0 hover:-translate-y-1"
            )}
            onClick={() => onClick(task)}
        >
            <Card className={cn(
                "p-4 cursor-pointer border-border/40 bg-card/60 backdrop-blur-md shadow-sm hover:shadow-lg transition-all duration-300",
                "hover:border-primary/20",
                isDragging && "ring-2 ring-primary ring-offset-2"
            )}>

                {/* Header Badges */}
                <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-mono", getPriorityColor(task.priority))}>
                        {task.priority}
                    </Badge>

                    <div className="flex items-center gap-1">
                        {task.task_type === 'meeting' && (
                            <div className="p-1 rounded-md bg-purple-500/10 text-purple-500" title="Meeting">
                                <UsersIcon className="h-3 w-3" />
                            </div>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {task.task_number}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {task.title}
                </h3>

                {/* Context (Project/Objective) */}
                {(task.project_tag || task.objective_tag) && (
                    <div className="flex items-center gap-1.5 mb-3">
                        {task.project_tag && (
                            <Badge variant="secondary" className="max-w-[100px] truncate text-[10px] h-5 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 border-blue-200/10 gap-1 px-1.5">
                                <Briefcase className="h-3 w-3" />
                                {task.project_tag}
                            </Badge>
                        )}
                    </div>
                )}

                {/* Footer Info */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                    {/* Assignees */}
                    <div className="flex -space-x-2">
                        {task.assignees && task.assignees.length > 0 ? (
                            task.assignees.slice(0, 3).map((a: any, i: number) => (
                                <Avatar key={i} className="h-6 w-6 border-2 border-background ring-1 ring-border/50">
                                    <AvatarImage src={a.profiles?.avatar_url} />
                                    <AvatarFallback className="text-[9px] bg-primary/5 text-primary">
                                        {a.profiles?.full_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                            ))
                        ) : (
                            <div className="h-6 w-6 rounded-full bg-muted/50 border border-dashed border-muted-foreground/30 flex items-center justify-center">
                                <User className="h-3 w-3 text-muted-foreground/50" />
                            </div>
                        )}
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-3 text-muted-foreground/70">
                        {task.due_date && (
                            <div className="flex items-center gap-1 text-[10px]" title={`Due ${format(new Date(task.due_date), 'MMM d')}`}>
                                <Calendar className="h-3 w-3" />
                                {format(new Date(task.due_date), 'MMM d')}
                            </div>
                        )}

                        {/* Indicators (Mocked for now until query updates) */}
                        {/* 
               <div className="flex items-center gap-1 text-[10px]">
                  <CheckSquare className="h-3 w-3" />
                  <span>0/3</span>
               </div> 
               */}
                    </div>
                </div>
            </Card>
        </div>
    );
};

// Helper components
const UsersIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
