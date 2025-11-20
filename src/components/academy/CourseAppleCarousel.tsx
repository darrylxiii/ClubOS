import React from "react";
import { Carousel, Card, CardType } from "@/components/ui/apple-cards-carousel";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Users } from "lucide-react";

interface Course {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: string;
  course_image_url?: string;
  estimated_hours?: number;
  enrolled_count?: number;
  difficulty_level?: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface CourseAppleCarouselProps {
  title: string;
  courses: Course[];
}

export function CourseAppleCarousel({ title, courses }: CourseAppleCarouselProps) {
  const courseCards: CardType[] = courses.map((course) => ({
    category: course.category || "Course",
    title: course.title,
    src: course.course_image_url || `https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop`,
    content: (
      <div className="space-y-6">
        <div className="bg-muted p-8 md:p-14 rounded-3xl">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {course.category && (
                <Badge variant="outline" className="squircle-sm">
                  {course.category}
                </Badge>
              )}
              {course.difficulty_level && (
                <Badge variant="secondary" className="squircle-sm">
                  {course.difficulty_level}
                </Badge>
              )}
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              {course.title}
            </h3>
            
            {course.description && (
              <p className="text-muted-foreground text-base md:text-lg">
                {course.description}
              </p>
            )}

            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{course.estimated_hours || 0} hours</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{Math.floor((course.estimated_hours || 0) * 2)} lessons</span>
              </div>
              {course.enrolled_count && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{course.enrolled_count} enrolled</span>
                </div>
              )}
            </div>

            {course.profiles && (
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Instructor: <span className="font-medium text-foreground">{course.profiles.full_name}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link to={`/courses/${course.slug}`} className="flex-1">
            <Button className="w-full squircle" size="lg">
              View Course
            </Button>
          </Link>
          <Link to={`/courses/${course.slug}`}>
            <Button variant="outline" className="squircle" size="lg">
              Preview
            </Button>
          </Link>
        </div>

        {course.course_image_url && (
          <div className="rounded-2xl overflow-hidden">
            <img
              src={course.course_image_url}
              alt={course.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}
      </div>
    ),
  }));

  const cards = courseCards.map((card, index) => (
    <Card key={card.src + index} card={card} index={index} />
  ));

  return (
    <div className="w-full">
      <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4 px-4">
        {title}
      </h2>
      <Carousel items={cards} />
    </div>
  );
}
