import { Project } from "@/types/projects";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  Briefcase, 
  DollarSign,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface ProjectCardProps {
  project: Project & { matchScore?: number };
  isFreelancer: boolean;
}

export function ProjectCard({ project, isFreelancer }: ProjectCardProps) {
  const navigate = useNavigate();

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (!max) return `From €${min?.toLocaleString()}`;
    if (!min) return `Up to €${max?.toLocaleString()}`;
    return `€${min.toLocaleString()} - €${max.toLocaleString()}`;
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate(`/projects/${project.id}`)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isFreelancer && project.matchScore !== undefined && project.matchScore > 0 && (
              <Badge className={`gap-1 ${getMatchColor(project.matchScore)}`}>
                <Sparkles className="h-3 w-3" />
                {project.matchScore}% Match
              </Badge>
            )}
            {project.category && (
              <Badge variant="outline">{project.category}</Badge>
            )}
          </div>
          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
            {project.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
        {project.description}
      </p>

      {/* Skills */}
      {project.skills_required && project.skills_required.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {project.skills_required.slice(0, 4).map((skill, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {project.skills_required.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{project.skills_required.length - 4} more
            </Badge>
          )}
        </div>
      )}

      {/* Project Details */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">{formatBudget(project.budget_min, project.budget_max)}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {project.timeline_weeks ? `${project.timeline_weeks} weeks` : "Timeline flexible"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="h-4 w-4" />
          <span className="capitalize">{project.engagement_type || "Not specified"}</span>
        </div>

        {project.remote_policy && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="capitalize">{project.remote_policy}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-xs text-muted-foreground">
          Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
        </div>

        {isFreelancer ? (
          <Button 
            size="sm" 
            className="gap-2 group-hover:gap-3 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${project.id}/apply`);
            }}
          >
            Apply
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="outline"
            className="gap-2"
          >
            View Details
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
