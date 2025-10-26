import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Building2, 
  Sparkles, 
  Video, 
  MapPin, 
  Users, 
  ClipboardList, 
  ChevronDown, 
  ChevronUp,
  MoreVertical,
  FileText,
  Calendar,
  Link as LinkIcon,
  Clock,
  Target,
  GripVertical,
  Edit,
  Eye,
  Copy,
  Trash,
  BarChart3,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DisplaySettings } from "./PipelineDisplaySettings";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EnhancedStage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid' | 'assessment';
  location?: string;
  meeting_link?: string;
  meeting_type?: string;
  assessment_type?: string;
  platform?: string;
  duration_minutes?: number;
  interviewers?: string[];
  materials_required?: string[];
  evaluation_criteria?: string;
  resources?: string[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface StageDetailCardProps {
  stage: EnhancedStage;
  candidateCount: number;
  avgDays: number;
  conversionRate?: number;
  displaySettings: DisplaySettings;
  onEdit?: (stage: EnhancedStage) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onViewAnalytics?: () => void;
  onViewCandidates?: () => void;
}

export function StageDetailCard({
  stage,
  candidateCount,
  avgDays,
  conversionRate,
  displaySettings,
  onEdit,
  onDuplicate,
  onDelete,
  onViewAnalytics,
  onViewCandidates,
}: StageDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [editedStage, setEditedStage] = useState(stage);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `stage-${stage.order}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getFormatIcon = () => {
    switch (stage.format) {
      case 'online':
        return Video;
      case 'in_person':
        return MapPin;
      case 'hybrid':
        return Users;
      case 'assessment':
        return ClipboardList;
      default:
        return Video;
    }
  };

  const getFormatColor = () => {
    // Unified dark theme with subtle variations
    switch (stage.format) {
      case 'online':
      case 'in_person':
      case 'hybrid':
      case 'assessment':
        return 'from-card/90 to-card/60 border-border/40';
      default:
        return 'from-card/90 to-card/60 border-border/40';
    }
  };

  const getFormatLabel = () => {
    switch (stage.format) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'In-Person';
      case 'hybrid':
        return 'Hybrid';
      case 'assessment':
        return 'Assessment';
      default:
        return 'Standard';
    }
  };

  const FormatIcon = getFormatIcon();
  const hasDetails = displaySettings.showLocationMeeting || displaySettings.showMaterials || 
                     displaySettings.showEvaluation || displaySettings.showScheduling || 
                     displaySettings.showMetadata;

  const handleSaveInline = () => {
    onEdit?.(editedStage);
    setIsEditingInline(false);
  };

  const handleCancelEdit = () => {
    setEditedStage(stage);
    setIsEditingInline(false);
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10",
        "bg-gradient-to-br backdrop-blur-xl border-2",
        getFormatColor()
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Primary Row */}
        <div className="flex items-center gap-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none opacity-50 hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex items-center justify-between gap-3 flex-1" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
              {/* Stage Badge */}
              <Badge 
                variant="secondary" 
                className="px-3 py-1.5 font-bold text-sm whitespace-nowrap bg-background/80 backdrop-blur-sm"
              >
                {stage.name}
              </Badge>

            {/* Owner Icon */}
            {displaySettings.showOwnership && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={cn(
                      "p-2 rounded-lg transition-all duration-300 group-hover:scale-110",
                      stage.owner === 'quantum_club' 
                        ? "bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20" 
                        : "bg-accent/20"
                    )}>
                      {stage.owner === 'quantum_club' ? (
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Building2 className="w-4 h-4 text-accent-foreground" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">
                      {stage.owner === 'quantum_club' ? '✦ Quantum Club Elite' : 'Your Company'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Format Icon */}
            {displaySettings.showFormat && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="p-2 rounded-lg bg-background/60 backdrop-blur-sm">
                      <FormatIcon className="w-4 h-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{getFormatLabel()}</p>
                      {stage.format === 'online' && stage.meeting_type && (
                        <p className="text-xs text-muted-foreground">{stage.meeting_type}</p>
                      )}
                      {stage.format === 'assessment' && stage.assessment_type && (
                        <p className="text-xs text-muted-foreground">{stage.assessment_type}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Team Avatars */}
            {displaySettings.showTeam && stage.interviewers && stage.interviewers.length > 0 && (
              <div className="flex -space-x-2">
                {stage.interviewers.slice(0, 3).map((interviewer, idx) => (
                  <Avatar key={idx} className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="bg-primary/10 text-xs">
                      {interviewer.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {stage.interviewers.length > 3 && (
                  <Avatar className="w-8 h-8 border-2 border-background">
                    <AvatarFallback className="bg-accent/20 text-xs">
                      +{stage.interviewers.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-black">{candidateCount}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Candidates</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-black">{avgDays.toFixed(1)}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Avg Days</div>
            </div>

            {conversionRate !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-black text-primary">{conversionRate.toFixed(0)}%</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Convert</div>
              </div>
            )}
          </div>

          </div>

          {/* Quick Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onEdit && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditingInline(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Inline
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(stage)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Edit in Dialog
                  </DropdownMenuItem>
                </>
              )}
              {hasDetails && (
                <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {isExpanded ? 'Hide' : 'View'} Full Details
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Stage
                </DropdownMenuItem>
              )}
              {onViewAnalytics && (
                <DropdownMenuItem onClick={onViewAnalytics}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Stage
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Expand Button */}
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-gradient-to-r from-primary via-secondary to-accent rounded-full transition-all duration-500"
            style={{ width: conversionRate ? `${conversionRate}%` : '0%' }}
          />
        </div>

        {/* Materials & Evaluation Badges */}
        {(displaySettings.showMaterials || displaySettings.showEvaluation) && (
          <div className="flex gap-2 flex-wrap">
            {displaySettings.showMaterials && stage.materials_required && stage.materials_required.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                {stage.materials_required.length} Materials
              </Badge>
            )}
            {displaySettings.showEvaluation && stage.evaluation_criteria && (
              <Badge variant="outline" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Evaluation Set
              </Badge>
            )}
          </div>
        )}

        {/* Inline Edit Form */}
        {isEditingInline && (
          <div className="border-t border-accent/20 pt-4 space-y-4 bg-accent/5 p-4 rounded-lg animate-fade-in">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stage Name</label>
                <input
                  type="text"
                  value={editedStage.name}
                  onChange={(e) => setEditedStage({ ...editedStage, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea
                  value={editedStage.description || ''}
                  onChange={(e) => setEditedStage({ ...editedStage, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
                  <select
                    value={editedStage.format}
                    onChange={(e) => setEditedStage({ ...editedStage, format: e.target.value as any })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  >
                    <option value="online">Online</option>
                    <option value="in_person">In Person</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="assessment">Assessment</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Duration (min)</label>
                  <input
                    type="number"
                    value={editedStage.duration_minutes || 60}
                    onChange={(e) => setEditedStage({ ...editedStage, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
              </div>
              {editedStage.format === 'online' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Meeting Link</label>
                  <input
                    type="text"
                    value={editedStage.meeting_link || ''}
                    onChange={(e) => setEditedStage({ ...editedStage, meeting_link: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
              )}
              {editedStage.format === 'in_person' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                  <input
                    type="text"
                    value={editedStage.location || ''}
                    onChange={(e) => setEditedStage({ ...editedStage, location: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveInline}>
                <Save className="w-3 h-3 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        {isExpanded && !isEditingInline && hasDetails && (
          <div className="space-y-4 pt-4 border-t animate-fade-in">
            {/* Stage Type Details */}
            {displaySettings.showLocationMeeting && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <FormatIcon className="w-4 h-4" />
                  Stage Details
                </h4>
                <div className="space-y-1 text-sm">
                  {stage.format === 'in_person' && stage.location && (
                    <p className="text-muted-foreground flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{stage.location}</span>
                    </p>
                  )}
                  {stage.format === 'online' && (
                    <div className="space-y-1">
                      {stage.meeting_type && (
                        <p className="text-muted-foreground">Type: {stage.meeting_type}</p>
                      )}
                      {stage.meeting_link && (
                        <p className="text-muted-foreground flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          <a href={stage.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                            {stage.meeting_link}
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                  {stage.format === 'assessment' && (
                    <div className="space-y-1">
                      {stage.assessment_type && (
                        <p className="text-muted-foreground">Type: {stage.assessment_type}</p>
                      )}
                      {stage.platform && (
                        <p className="text-muted-foreground">Platform: {stage.platform}</p>
                      )}
                    </div>
                  )}
                  {stage.description && (
                    <p className="text-muted-foreground text-xs mt-2">{stage.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Team Section */}
            {displaySettings.showTeam && stage.interviewers && stage.interviewers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </h4>
                <div className="flex flex-wrap gap-2">
                  {stage.interviewers.map((interviewer, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {interviewer}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {displaySettings.showMaterials && stage.materials_required && stage.materials_required.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Materials Required
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {stage.materials_required.map((material, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {material}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Scheduling */}
            {displaySettings.showScheduling && stage.duration_minutes && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduling
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration: {stage.duration_minutes} minutes
                </p>
              </div>
            )}

            {/* Evaluation */}
            {displaySettings.showEvaluation && stage.evaluation_criteria && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Evaluation Criteria
                </h4>
                <p className="text-sm text-muted-foreground">{stage.evaluation_criteria}</p>
              </div>
            )}

            {/* Metadata */}
            {displaySettings.showMetadata && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold">Metadata</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {stage.created_at && (
                    <div>
                      <span className="font-medium">Created:</span> {new Date(stage.created_at).toLocaleDateString()}
                    </div>
                  )}
                  {stage.updated_at && (
                    <div>
                      <span className="font-medium">Updated:</span> {new Date(stage.updated_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Candidates View Button */}
        {isExpanded && !isEditingInline && onViewCandidates && (
          <div className="border-t border-border/50 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewCandidates}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              View {candidateCount} Candidates in Stage
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
