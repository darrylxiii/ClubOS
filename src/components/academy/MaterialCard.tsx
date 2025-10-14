import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, FileText, Route, Award } from "lucide-react";

interface MaterialCardProps {
  type: "quiz" | "page" | "path" | "course";
  title: string;
  category: string;
  urgency: string;
  count: number;
  countType: string;
  progress?: number;
  status?: string;
  certified?: boolean;
  points?: number;
  passingPoints?: number;
  illustration: string;
}

export function MaterialCard({
  type,
  title,
  category,
  urgency,
  count,
  countType,
  progress = 0,
  status,
  certified,
  points,
  passingPoints,
  illustration,
}: MaterialCardProps) {
  const typeConfig = {
    quiz: { icon: Award, label: "Quiz", color: "bg-warning/10 text-warning" },
    page: { icon: FileText, label: "Page", color: "bg-destructive/10 text-destructive" },
    path: { icon: Route, label: "Learning Path", color: "bg-primary/10 text-primary" },
    course: { icon: BookOpen, label: "Course", color: "bg-blue-500/10 text-blue-500" },
  };

  const illustrationColors = {
    quiz: "from-yellow-100 to-orange-100",
    book: "from-blue-100 to-cyan-100",
    path: "from-orange-100 to-yellow-100",
    design: "from-blue-100 to-purple-100",
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Card className="squircle overflow-hidden hover-lift">
      {/* Illustration */}
      <div className={`h-40 bg-gradient-to-br ${illustrationColors[illustration as keyof typeof illustrationColors] || illustrationColors.design} p-4 flex items-center justify-center relative`}>
        <Badge className="absolute top-3 left-3 squircle-sm bg-background/80 backdrop-blur-sm">
          {count} {countType}
        </Badge>
        <Icon className="h-16 w-16 text-primary/40" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={`squircle-sm ${config.color}`}>
            {config.label}
          </Badge>
          {certified && (
            <Badge variant="outline" className="squircle-sm">
              Certified
            </Badge>
          )}
        </div>

        <h3 className="font-semibold line-clamp-2 min-h-[3rem]">{title}</h3>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="squircle-sm">
            {category}
          </Badge>
          <Badge
            variant="outline"
            className={`squircle-sm ${
              urgency === "Urgent"
                ? "border-destructive/50 text-destructive"
                : "border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            {urgency}
          </Badge>
        </div>

        {points !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-warning" />
            <span className="font-semibold">{points}pts</span>
            <span className="text-muted-foreground">
              Passing point {passingPoints} pts
            </span>
          </div>
        )}

        {status === "Not Started" ? (
          <Button className="w-full squircle-sm" variant="outline">
            Start
          </Button>
        ) : progress > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <Button className="w-full squircle-sm">Continue</Button>
          </div>
        ) : (
          <Button className="w-full squircle-sm" variant="outline">
            View
          </Button>
        )}
      </div>
    </Card>
  );
}
