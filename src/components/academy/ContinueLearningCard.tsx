import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ArrowRight } from "lucide-react";

interface ContinueLearningCardProps {
  title: string;
  progress: number;
  materials: number;
  category: string;
  illustration: string;
  nextLesson?: string;
}

export function ContinueLearningCard({
  title,
  progress,
  materials,
  category,
  illustration,
  nextLesson,
}: ContinueLearningCardProps) {
  const bgColors = {
    design: "from-blue-100 to-cyan-100",
    blend: "from-purple-100 to-pink-100",
  };

  return (
    <Card className="squircle overflow-hidden hover-lift">
      <div className="grid md:grid-cols-[300px_1fr] gap-6 p-6">
        {/* Illustration */}
        <div className={`squircle bg-gradient-to-br ${bgColors[illustration as keyof typeof bgColors] || bgColors.design} p-8 flex items-center justify-center relative overflow-hidden`}>
          <Badge className="absolute top-4 left-4 squircle-sm bg-background/80 backdrop-blur-sm">
            {materials} Materials
          </Badge>
          <div className="relative z-10">
            <BookOpen className="h-24 w-24 text-primary/60" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <Badge variant="outline" className="squircle-sm mb-2">
                {category}
              </Badge>
              <h3 className="text-xl font-bold line-clamp-2">{title}</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 pt-4 border-t mt-4">
            {nextLesson && (
              <p className="text-sm text-muted-foreground flex items-start gap-2 flex-1">
                <span className="text-primary mt-0.5">→</span>
                <span>Advance your learning with <span className="text-primary font-medium">{nextLesson.split('with ')[1]}</span></span>
              </p>
            )}
            <Button className="squircle-sm">Continue</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
