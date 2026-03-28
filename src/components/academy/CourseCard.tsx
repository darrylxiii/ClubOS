import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Clock, Star, Users } from "lucide-react";

interface CourseCardProps {
  course: any;
}

const categoryDotColor: Record<string, string> = {
  marketing: "bg-blue-500",
  sales: "bg-emerald-500",
  leadership: "bg-amber-500",
  technology: "bg-violet-500",
  finance: "bg-rose-500",
  operations: "bg-cyan-500",
  recruiting: "bg-indigo-500",
  hr: "bg-pink-500",
};

export function CourseCard({ course }: CourseCardProps) {
  const category = course.category || "Course";
  const creatorName = course.profiles?.full_name || "Anonymous";
  const creatorInitials = creatorName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const dotColor =
    categoryDotColor[category.toLowerCase()] || "bg-primary";

  return (
    <Link to={`/courses/${course.slug}`} className="block h-full">
      <div className="glass-subtle rounded-2xl overflow-hidden hover-lift group h-full flex flex-col hover:border-primary/20 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          {course.cover_image_url ? (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-primary/30" />
            </div>
          )}
          {/* Image overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

          {/* Badges on image */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <Badge
              variant="secondary"
              className="glass border-0 text-xs font-medium capitalize"
            >
              {course.difficulty_level || "all levels"}
            </Badge>
            {course.estimated_hours > 0 && (
              <Badge className="glass border-0 text-xs font-semibold text-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {course.estimated_hours}h
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 flex-1 flex flex-col">
          {/* Category with colored dot */}
          <div className="flex items-center gap-2">
            <span className={`h-1 w-1 rounded-full ${dotColor} shrink-0`} />
            <span className="text-xs font-medium text-muted-foreground">
              {category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {course.enrolled_count > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {course.enrolled_count}
              </span>
            )}
            {course.rating_average > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                {Number(course.rating_average).toFixed(1)}
              </span>
            )}
          </div>

          {/* Creator */}
          <div className="flex items-center gap-2 border-t border-border/10 pt-3 mt-auto">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={course.profiles?.avatar_url}
                alt={creatorName}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {creatorInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {creatorName}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
