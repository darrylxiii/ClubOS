import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Clock, BookOpen, TrendingUp } from "lucide-react";

interface LearningPathCardProps {
  path: any;
}

export function LearningPathCard({ path }: LearningPathCardProps) {
  const difficultyColors = {
    beginner: "bg-success/10 text-success",
    intermediate: "bg-warning/10 text-warning",
    advanced: "bg-destructive/10 text-destructive",
    expert: "bg-accent/10 text-accent",
  };

  return (
    <Link to={`/academy/paths/${path.slug}`}>
      <Card className="group squircle hover-lift transition-all duration-300 p-6 h-full">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            {path.difficulty_level && (
              <Badge className={`squircle-sm ${difficultyColors[path.difficulty_level as keyof typeof difficultyColors]}`}>
                {path.difficulty_level}
              </Badge>
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
              {path.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {path.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
            {path.estimated_hours && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{path.estimated_hours}h total</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>0 courses</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-primary">
            <TrendingUp className="h-4 w-4" />
            <span>View Learning Path</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
