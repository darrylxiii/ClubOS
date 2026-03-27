import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import {
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle2,
  Award,
  Target,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  PlayCircle
} from "lucide-react";
import { CreateCourseDialog } from "@/components/academy/CreateCourseDialog";
import { AcademyDashboard } from "@/components/academy/AcademyDashboard";
import { ContinueLearningCard } from "@/components/academy/ContinueLearningCard";
import { MaterialCard } from "@/components/academy/MaterialCard";
import { PopularCourseCard } from "@/components/academy/PopularCourseCard";
import { LearnerDashboard } from "@/components/academy/LearnerDashboard";
import { RecommendationsPanel } from "@/components/academy/RecommendationsPanel";
import { BadgesDisplay } from "@/components/academy/BadgesDisplay";
import { EnhancedSearchBar } from "@/components/academy/EnhancedSearchBar";
import { CourseFilters } from "@/components/academy/CourseFilters";
import { CategoryGrid } from "@/components/academy/CategoryGrid";
import { AverageRatingDisplay } from "@/components/academy/AverageRatingDisplay";
import { SkillTagsDisplay } from "@/components/academy/SkillTagsDisplay";
import { HeroBanner } from "@/components/academy/HeroBanner";
import { AcademySidebar } from "@/components/academy/AcademySidebar";
import { CourseCarousel } from "@/components/academy/CourseCarousel";
import { EnhancedCategoryGrid } from "@/components/academy/EnhancedCategoryGrid";
import { CourseAppleCarousel } from "@/components/academy/CourseAppleCarousel";
import { useAcademyData, type AcademyCourse } from "@/hooks/useAcademyData";

export default function Academy() {
  const { t } = useTranslation('common');
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { academy, courses, learningPaths, isExpert, loading, refetch: loadAcademyData } = useAcademyData(slug, user?.id);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("newest");

  const filteredCourses = useMemo(() => {
    let filtered = [...courses];

    if (searchQuery) {
      filtered = filtered.filter((course: AcademyCourse) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((course: AcademyCourse) => course.category === selectedCategory);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter((course: AcademyCourse) => course.difficulty_level === selectedDifficulty);
    }

    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        break;
      case "popular":
        filtered.sort((a, b) => (b.enrolled_count || 0) - (a.enrolled_count || 0));
        break;
      case "rating":
        filtered.sort((a, b) => ((b as Record<string, any>).rating_average || 0) - ((a as Record<string, any>).rating_average || 0));
        break;
      case "shortest":
        filtered.sort((a, b) => ((a as Record<string, any>).estimated_duration || 999) - ((b as Record<string, any>).estimated_duration || 999));
        break;
    }

    return filtered;
  }, [courses, searchQuery, selectedCategory, selectedDifficulty, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">{t('academy.text1')}</div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-4xl font-bold mb-4">{t('academy.text2')}</h1>
        <Link to="/home">
          <Button>{t('academy.text3')}</Button>
        </Link>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-background">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="dashboard" className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 squircle bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{academy?.name || "The Quantum Club Academy"}</h1>
                  <p className="text-muted-foreground">{academy?.tagline || "Master your craft with expert-led courses"}</p>
                </div>
              </div>
              {isExpert && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/academy/creator")}
                    className="squircle"
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Creator Hub
                  </Button>
                  <Button onClick={() => setShowCreateCourse(true)} className="squircle">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Button>
                </div>
              )}
            </div>

            <TabsList className="squircle">
              <TabsTrigger value="dashboard">{t('academy.text4')}</TabsTrigger>
              <TabsTrigger value="my-courses">{t('academy.text5')}</TabsTrigger>
              <TabsTrigger value="explore">{t('academy.text6')}</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-8">
              {/* Hero Banner */}
              <HeroBanner />

              {/* Main Content with Sidebar */}
              <div className="flex gap-6">
                <main className="flex-1 min-w-0 space-y-8">
                  {/* Featured Courses - Apple Carousel Style */}
                  <CourseAppleCarousel
                    title={t('academy.text7')}
                    courses={courses.slice(0, 8)}
                  />

                  {/* Enhanced Category Grid */}
                  <EnhancedCategoryGrid onCategoryClick={(id) => {
                    setSelectedCategory(id);
                    navigate('/academy?tab=explore');
                  }} />

                  {/* Continue Learning */}
                  {courses.some((c: any) => c.progress && c.progress > 0) && (
                    <CourseCarousel
                      title={t('academy.text8')}
                      courses={courses.filter((c: any) => c.progress && c.progress > 0)}
                      showProgress={true}
                    />
                  )}

                  {/* Trending Courses - Apple Carousel Style */}
                  <CourseAppleCarousel
                    title={t('academy.text9')}
                    courses={courses.sort((a: any, b: any) => (b.trending_score || 0) - (a.trending_score || 0)).slice(0, 6)}
                  />

                  {/* New Releases */}
                  <CourseCarousel
                    title={t('academy.text10')}
                    courses={courses.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6)}
                  />
                </main>

                {/* Sticky Sidebar */}
                <AcademySidebar />
              </div>
            </TabsContent>

            <TabsContent value="my-courses" className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">{t('academy.text11')}</h2>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="secondary" className="squircle-sm">{t('academy.text12')}</Button>
                    <Button variant="ghost" className="squircle-sm">{t('academy.text13')}</Button>
                    <Button variant="ghost" className="squircle-sm">{t('academy.text14')}</Button>
                    <Button variant="ghost" className="squircle-sm">{t('academy.text15')}</Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder={t('academy.text16')} className="pl-9 squircle-sm" />
                    </div>
                    <Button variant="outline" className="squircle-sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Add Filter
                    </Button>
                    <Button variant="outline" className="squircle-sm">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      Sort by
                    </Button>
                  </div>
                </div>

                {/* Materials Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {courses.length === 0 ? (
                    <Card className="p-12 text-center squircle col-span-full">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">{t('academy.text17')}</h3>
                      <p className="text-muted-foreground mb-6">
                        {isExpert
                          ? "Be the first to create a course for this academy!"
                          : "Check back soon for new courses"}
                      </p>
                      {isExpert && (
                        <Button onClick={() => setShowCreateCourse(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Course
                        </Button>
                      )}
                    </Card>
                  ) : (
                    filteredCourses.map((course) => (
                      <Link key={course.id} to={`/courses/${course.slug}`}>
                        <Card className="squircle overflow-hidden hover-lift h-full transition-all cursor-pointer">
                          {/* Course image or illustration header */}
                          {course.course_image_url ? (
                            <div className="h-48 relative overflow-hidden">
                              <img
                                src={course.course_image_url}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                              <Badge className="absolute top-4 right-4 squircle-sm bg-background/90 backdrop-blur-sm text-foreground font-bold">
                                {course.estimated_hours || 12} Hours
                              </Badge>
                              {!course.is_published && (
                                <Badge className="absolute top-4 left-4 squircle-sm bg-yellow-500/90 backdrop-blur-sm text-background">
                                  Draft
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="h-48 bg-gradient-to-br from-purple-300 via-pink-300 to-purple-400 p-6 flex items-center justify-center relative overflow-hidden">
                              <Badge className="absolute top-4 right-4 squircle-sm bg-background/90 backdrop-blur-sm text-foreground font-bold">
                                {course.estimated_hours || 12} Hours
                              </Badge>
                              <BookOpen className="h-24 w-24 text-white/60" />
                              {!course.is_published && (
                                <Badge className="absolute top-4 left-4 squircle-sm bg-yellow-500/90 backdrop-blur-sm text-background">
                                  Draft
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div className="p-4 space-y-3 bg-card">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="squircle-sm text-xs text-primary border-primary">
                                {course.category || "Course"}
                              </Badge>
                              {course.difficulty_level && (
                                <Badge variant="secondary" className="squircle-sm text-xs">
                                  {course.difficulty_level}
                                </Badge>
                              )}
                            </div>

                            <h3 className="font-bold line-clamp-2 min-h-[3rem] text-foreground">
                              {course.title}
                            </h3>

                            {course.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {course.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span>{Math.floor((course.estimated_hours || 12) * 2)} Lessons</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{course.estimated_hours || 0}h</span>
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

                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                              <Avatar className="h-6 w-6 border-2 border-border">
                                <AvatarImage src={course.profiles?.avatar_url} alt={course.profiles?.full_name} />
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                  {course.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || "AN"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{course.profiles?.full_name || "Anonymous"}</span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="explore" className="space-y-6">
              {/* Search */}
              <div className="space-y-4">
                <EnhancedSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t('academy.text18')}
                />
              </div>

              {/* Course Grid */}
              {filteredCourses.length === 0 ? (
                <Card className="p-12 text-center squircle">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">{t('academy.text19')}</h3>
                  <p className="text-muted-foreground mb-6">
                    {isExpert
                      ? "Be the first to create a course for this academy!"
                      : "Check back soon for new courses"}
                  </p>
                  {isExpert && (
                    <Button onClick={() => setShowCreateCourse(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Course
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <PopularCourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <CreateCourseDialog
          open={showCreateCourse}
          onOpenChange={setShowCreateCourse}
          academyId={academy?.id}
          onSuccess={loadAcademyData}
        />
      </div>
  );
}
