import { useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, MapPin, DollarSign, Clock, Building2, 
  ChevronDown, ChevronUp, Edit, Users, Repeat
} from "lucide-react";
import { ContinuousPipelineBadge } from "@/components/jobs/ContinuousPipelineBadge";
import { formatSalaryCompact, formatEmploymentType } from "@/lib/jobFormatters";
import type { JobWithMetrics } from "@/types/job";

interface JobSummaryCardProps {
  job: JobWithMetrics & {
    description?: string | null;
    requirements?: string[] | null;
    department?: string | null;
    experience_level?: string | null;
    job_tools?: Array<{ id: string; tools_and_skills?: { name: string } }>;
  };
  onEdit?: () => void;
}

export const JobSummaryCard = memo(({ job, onEdit }: JobSummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const description = job?.description || "No description provided";
  const truncatedDescription = description.length > 200 
    ? description.substring(0, 200) + "..." 
    : description;
  
  const requirements = job?.requirements || [];
  const displayRequirements = requirements.slice(0, 5);
  const hasMoreRequirements = requirements.length > 5;
  
  // Format salary using centralized utility
  const salaryRange = formatSalaryCompact(
    job?.salary_min,
    job?.salary_max,
    job?.currency || 'EUR'
  ) || 'Not specified';

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/95 to-card/70 backdrop-blur-xl shadow-[var(--shadow-glass-md)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Job Summary
          </CardTitle>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 gap-1 text-xs">
              <Edit className="w-3 h-3" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Location */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{job?.location || 'Remote'}</span>
          </div>
          
          {/* Employment Type */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="capitalize truncate">{formatEmploymentType(job?.employment_type)}</span>
          </div>
          
          {/* Salary */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{salaryRange}</span>
          </div>
          
          {/* Experience */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{job?.experience_level || 'Any level'}</span>
          </div>
        </div>
        
        {/* Department/Team */}
        {job?.department && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span>{job.department}</span>
          </div>
        )}
        
        {/* Pipeline Progress for Continuous Roles */}
        {job?.is_continuous && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Repeat className="w-4 h-4 flex-shrink-0 text-primary" />
            <span className="font-medium">Pipeline:</span>
            <ContinuousPipelineBadge
              isContinuous={true}
              hiredCount={job.hired_count || 0}
              targetHireCount={job.target_hire_count}
              size="md"
              showProgress={true}
            />
          </div>
        )}
        
        {/* Divider */}
        <div className="border-t border-border/30" />
        
        {/* About This Role */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase text-muted-foreground">About This Role</h4>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {isExpanded ? description : truncatedDescription}
          </p>
          {description.length > 200 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs text-primary hover:text-primary/80 p-0"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Read More
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Requirements */}
        {requirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Key Requirements</h4>
            <ul className="space-y-1.5">
              {displayRequirements.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
            {hasMoreRequirements && (
              <p className="text-xs text-muted-foreground">
                +{requirements.length - 5} more requirements
              </p>
            )}
          </div>
        )}
        
        {/* Skills Tags */}
        {job?.job_tools && job.job_tools.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Required Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {job.job_tools.slice(0, 6).map((tool: any) => (
                <Badge 
                  key={tool.id} 
                  variant="secondary" 
                  className="text-xs bg-muted/50 border-0"
                >
                  {tool.tools_and_skills?.name}
                </Badge>
              ))}
              {job.job_tools.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{job.job_tools.length - 6}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

JobSummaryCard.displayName = 'JobSummaryCard';
