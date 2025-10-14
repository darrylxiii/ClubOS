import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Users, Star, BookOpen } from "lucide-react";

interface CourseCardProps {
  course: any;
}

export function CourseCard({ course }: CourseCardProps) {
  const difficultyColors = {
    beginner: "bg-success/10 text-success hover:bg-success/20",
    intermediate: "bg-warning/10 text-warning hover:bg-warning/20",
    advanced: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    expert: "bg-accent/10 text-accent hover:bg-accent/20",
  };

  return (
    <Link to={`/academy/courses/${course.slug}`}>
      <Card className="group overflow-hidden squircle hover-lift transition-all duration-300 h-full">
        {/* Course Image */}
        <div className="relative h-48 overflow-hidden">
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-accent flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-white opacity-80" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          
          {/* Difficulty Badge */}
          {course.difficulty_level && (
            <Badge 
              className={`absolute top-4 right-4 squircle-sm ${difficultyColors[course.difficulty_level as keyof typeof difficultyColors]}`}
            >
              {course.difficulty_level}
            </Badge>
          )}
        </div>

        {/* Course Content */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {course.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {course.description}
            </p>
          </div>

          {/* Course Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {course.estimated_hours && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{course.estimated_hours}h</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>0 enrolled</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span>New</span>
            </div>
          </div>

          {/* Instructor */}
          {course.profiles && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <Avatar className="h-8 w-8">
                <AvatarImage src={course.profiles.avatar_url} />
                <AvatarFallback>
                  {course.profiles.full_name?.charAt(0) || 'E'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {course.profiles.full_name || 'Expert Instructor'}
                </p>
                <p className="text-xs text-muted-foreground">Course Creator</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
