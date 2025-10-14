import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Clock, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopularCourseCardProps {
  course: any;
}

export function PopularCourseCard({ course }: PopularCourseCardProps) {
  const categoryColors = {
    Design: "from-red-200 via-orange-200 to-yellow-200",
    Business: "from-pink-200 via-purple-200 to-blue-200",
    Code: "from-purple-300 via-pink-300 to-purple-400",
    Marketing: "from-green-200 via-teal-200 to-cyan-200",
    Leadership: "from-blue-200 via-indigo-200 to-purple-200",
    Data: "from-yellow-200 via-amber-200 to-orange-200",
    Product: "from-pink-200 via-rose-200 to-red-200",
    Other: "from-gray-200 via-slate-200 to-zinc-200",
  };

  const category = course.category || "Other";
  const creatorName = course.profiles?.full_name || "Anonymous";
  const creatorInitials = creatorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Link to={`/courses/${course.slug}`}>
      <Card className="squircle overflow-hidden hover-lift h-full">
        {/* Course Image or Gradient */}
        {course.course_image_url ? (
          <div className="h-48 relative overflow-hidden">
            <img 
              src={course.course_image_url} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
            <Badge className="absolute top-4 right-4 squircle-sm bg-background/90 backdrop-blur-sm text-foreground font-bold">
              {course.estimated_hours || 12}h
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 left-4 squircle-sm bg-background/20 backdrop-blur-sm hover:bg-background/30"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={`h-48 bg-gradient-to-br ${
              categoryColors[category as keyof typeof categoryColors] ||
              categoryColors.Other
            } p-6 flex items-center justify-center relative overflow-hidden`}
          >
            <Badge className="absolute top-4 right-4 squircle-sm bg-background/90 backdrop-blur-sm text-foreground font-bold">
              {course.estimated_hours || 12}h
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
        )}

        {/* Content */}
        <div className="p-4 space-y-3">
          <Badge
            variant="outline"
            className="squircle-sm text-xs font-semibold"
          >
            {category}
          </Badge>

          <h3 className="font-bold line-clamp-2 min-h-[3rem]">
            {course.title}
          </h3>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{Math.floor((course.estimated_hours || 12) * 2)} Lessons</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{course.estimated_hours || 12}h</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                <Avatar className="h-5 w-5 border-2 border-background">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">A</AvatarFallback>
                </Avatar>
                <Avatar className="h-5 w-5 border-2 border-background">
                  <AvatarFallback className="bg-secondary/10 text-secondary text-[10px]">B</AvatarFallback>
                </Avatar>
                <Avatar className="h-5 w-5 border-2 border-background">
                  <AvatarFallback className="bg-accent/10 text-accent text-[10px]">C</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs">26</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Avatar className="h-6 w-6 border-2 border-border">
              <AvatarImage src={course.profiles?.avatar_url} alt={creatorName} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                {creatorInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{creatorName}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
