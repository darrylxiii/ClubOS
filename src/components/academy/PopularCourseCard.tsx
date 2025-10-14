import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopularCourseCardProps {
  course: any;
}

export function PopularCourseCard({ course }: PopularCourseCardProps) {
  const categoryColors = {
    DESIGN: "from-red-200 via-orange-200 to-yellow-200",
    BUSINESS: "from-pink-200 via-purple-200 to-blue-200",
    CODE: "from-purple-300 via-pink-300 to-purple-400",
  };

  const category = course.title?.includes("Design")
    ? "DESIGN"
    : course.title?.includes("Business")
    ? "BUSINESS"
    : "CODE";

  return (
    <Link to={`/courses/${course.slug}`}>
      <Card className="squircle overflow-hidden hover-lift h-full">
        {/* Illustration */}
        <div
          className={`h-48 bg-gradient-to-br ${
            categoryColors[category as keyof typeof categoryColors] ||
            categoryColors.CODE
          } p-6 flex items-center justify-center relative overflow-hidden`}
        >
          <Badge className="absolute top-4 right-4 squircle-sm bg-white/90 backdrop-blur-sm text-primary font-bold">
            ${Math.floor(Math.random() * 300) + 100}
          </Badge>
          <BookOpen className="h-24 w-24 text-white/60" />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 left-4 squircle-sm bg-white/20 backdrop-blur-sm hover:bg-white/30"
          >
            <Bookmark className="h-4 w-4 text-white" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <Badge
            variant="outline"
            className="squircle-sm text-xs"
            style={{
              color:
                category === "DESIGN"
                  ? "#f97316"
                  : category === "BUSINESS"
                  ? "#ec4899"
                  : "#a855f7",
              borderColor:
                category === "DESIGN"
                  ? "#f97316"
                  : category === "BUSINESS"
                  ? "#ec4899"
                  : "#a855f7",
            }}
          >
            {category}
          </Badge>

          <h3 className="font-bold line-clamp-2 min-h-[3rem]">
            {course.title}
          </h3>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{course.estimated_hours || 16} Lessons</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{course.estimated_hours || 48} Hours</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
