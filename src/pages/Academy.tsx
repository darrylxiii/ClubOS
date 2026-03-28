import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

import {
  GraduationCap,
  BookOpen,
  Clock,
  Plus,
  Search,
  Star,
  Users,
  Sparkles,
  TrendingUp,
  PlayCircle,
} from "lucide-react";
import { CreateCourseDialog } from "@/components/academy/CreateCourseDialog";
import { PopularCourseCard } from "@/components/academy/PopularCourseCard";
import { HeroBanner } from "@/components/academy/HeroBanner";
import { AcademySidebar } from "@/components/academy/AcademySidebar";
import { EnhancedCategoryGrid } from "@/components/academy/EnhancedCategoryGrid";
import { useAcademyData, type AcademyCourse } from "@/hooks/useAcademyData";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

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
      filtered = filtered.filter((c: AcademyCourse) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory) filtered = filtered.filter((c: AcademyCourse) => c.category === selectedCategory);
    if (selectedDifficulty) filtered = filtered.filter((c: AcademyCourse) => c.difficulty_level === selectedDifficulty);
    switch (sortBy) {
      case "popular": filtered.sort((a, b) => (b.enrolled_count || 0) - (a.enrolled_count || 0)); break;
      case "rating": filtered.sort((a, b) => ((b as any).rating_average || 0) - ((a as any).rating_average || 0)); break;
      default: filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
    return filtered;
  }, [courses, searchQuery, selectedCategory, selectedDifficulty, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <GraduationCap className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">{t('academy.text1', 'Loading Academy...')}</p>
        </div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-subtle rounded-2xl p-12 text-center max-w-md">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-primary/50" />
          <h1 className="text-xl font-bold mb-2">{t('academy.text2', 'Academy Not Found')}</h1>
          <p className="text-sm text-muted-foreground mb-6">This academy doesn't exist yet.</p>
          <Link to="/home"><Button variant="outline" className="rounded-xl">{t('academy.text3', 'Go Home')}</Button></Link>
        </div>
      </div>
    );
  }

  const trendingCourses = [...courses].sort((a: any, b: any) => (b.trending_score || 0) - (a.trending_score || 0)).slice(0, 6);
  const newCourses = [...courses].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="glass-subtle rounded-xl p-2.5 border-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{academy?.name || "Academy"}</h1>
                <p className="text-xs text-muted-foreground">{academy?.tagline || "Master your craft"}</p>
              </div>
            </div>
            {user && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/academy/creator")} className="rounded-xl border-border/50 hover:border-primary/30 h-9 text-xs">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Creator Hub
                </Button>
                <Button onClick={() => setShowCreateCourse(true)} className="rounded-xl h-9 text-xs shadow-lg hover:shadow-xl transition-shadow">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create Course
                </Button>
              </div>
            )}
          </motion.div>

          {/* ── Tab Bar ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <TabsList className="glass-subtle border-border/20 p-1 h-auto rounded-xl">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-5 py-2 text-sm transition-all">
                {t('academy.text4', 'Dashboard')}
              </TabsTrigger>
              <TabsTrigger value="my-courses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-5 py-2 text-sm transition-all">
                {t('academy.text5', 'My Courses')}
              </TabsTrigger>
              <TabsTrigger value="explore" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-5 py-2 text-sm transition-all">
                {t('academy.text6', 'Explore')}
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* ═══════════════════════ DASHBOARD ═══════════════════════ */}
          <TabsContent value="dashboard" className="space-y-10 mt-0">
            <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ duration: 0.5 }}>
              <HeroBanner />
            </motion.div>

            <div className="flex gap-6">
              <main className="flex-1 min-w-0 space-y-10">
                {/* Categories */}
                <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.2 }}>
                  <EnhancedCategoryGrid onCategoryClick={setSelectedCategory} />
                </motion.div>

                {/* Trending */}
                {trendingCourses.length > 0 && (
                  <motion.section
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="glass-subtle rounded-lg p-1.5">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{t('academy.text9', 'Trending Now')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trendingCourses.map((course) => (
                        <motion.div key={course.id} variants={staggerItem}>
                          <PopularCourseCard course={course} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>
                )}

                {/* New Releases */}
                {newCourses.length > 0 && (
                  <motion.section
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="glass-subtle rounded-lg p-1.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{t('academy.text10', 'New Releases')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {newCourses.map((course) => (
                        <motion.div key={course.id} variants={staggerItem}>
                          <PopularCourseCard course={course} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>
                )}
              </main>

              <AcademySidebar />
            </div>
          </TabsContent>

          {/* ═══════════════════════ MY COURSES ═══════════════════════ */}
          <TabsContent value="my-courses" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('academy.text11', 'My Learning')}</h2>
              <div className="flex gap-1.5">
                {["newest", "popular", "rating"].map((s) => (
                  <Button
                    key={s}
                    variant={sortBy === s ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy(s)}
                    className={`capitalize text-xs rounded-lg h-8 ${sortBy === s ? '' : 'text-muted-foreground'}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder={t('academy.text16', 'Search your courses...')}
                className="pl-9 h-10 glass-subtle border-border/20 rounded-xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredCourses.length === 0 ? (
              <div className="glass-subtle rounded-2xl p-16 text-center">
                <div className="glass-subtle rounded-2xl p-4 w-16 h-16 mx-auto mb-5 flex items-center justify-center">
                  <BookOpen className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-semibold mb-2">{t('academy.text17', 'No courses yet')}</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  Start your learning journey by exploring courses or creating your own.
                </p>
                {user && (
                  <Button onClick={() => setShowCreateCourse(true)} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Create Course
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredCourses.map((course) => (
                  <motion.div key={course.id} variants={staggerItem}>
                    <Link to={`/courses/${course.slug}`}>
                      <div className="glass-subtle rounded-2xl overflow-hidden hover-lift group h-full flex flex-col hover:border-primary/20 transition-all duration-300">
                        {/* Image */}
                        <div className="relative aspect-video overflow-hidden">
                          {course.course_image_url ? (
                            <img
                              src={course.course_image_url}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 via-muted/50 to-muted/30 flex items-center justify-center">
                              <BookOpen className="h-10 w-10 text-primary/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                          {!course.is_published && (
                            <Badge className="absolute top-3 left-3 bg-yellow-500/90 text-black text-xs rounded-lg">Draft</Badge>
                          )}
                          {course.difficulty_level && (
                            <Badge variant="secondary" className="absolute top-3 right-3 glass-subtle border-0 text-xs rounded-lg capitalize">
                              {course.difficulty_level}
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-3 flex-1 flex flex-col">
                          {course.category && (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                              <span className="text-xs text-muted-foreground">{course.category}</span>
                            </div>
                          )}
                          <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-2">
                            {course.estimated_hours ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.estimated_hours}h</span> : null}
                            {course.enrolled_count ? <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.enrolled_count}</span> : null}
                            {(course as any).rating_average > 0 && (
                              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{Number((course as any).rating_average).toFixed(1)}</span>
                            )}
                          </div>
                          {course.profiles && (
                            <div className="flex items-center gap-2 pt-3 border-t border-border/10">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={course.profiles.avatar_url} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{course.profiles.full_name?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate">{course.profiles.full_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* ═══════════════════════ EXPLORE ═══════════════════════ */}
          <TabsContent value="explore" className="space-y-6 mt-0">
            <div className="space-y-4">
              <div className="relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder={t('academy.text18', 'Search courses, topics, skills...')}
                  className="pl-11 h-12 text-sm glass-subtle border-border/20 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5">
                {[null, "beginner", "intermediate", "advanced"].map((level) => (
                  <Button
                    key={level || "all"}
                    variant={selectedDifficulty === level ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedDifficulty(level)}
                    className={`capitalize text-xs rounded-lg h-8 ${selectedDifficulty === level ? '' : 'text-muted-foreground'}`}
                  >
                    {level || "All Levels"}
                  </Button>
                ))}
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="glass-subtle rounded-2xl p-16 text-center">
                <div className="glass-subtle rounded-2xl p-4 w-16 h-16 mx-auto mb-5 flex items-center justify-center">
                  <Search className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-semibold mb-2">{t('academy.text19', 'No courses found')}</h3>
                <p className="text-sm text-muted-foreground mb-6">Try a different search or create a new course.</p>
                {user && (
                  <Button onClick={() => setShowCreateCourse(true)} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Create Course
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredCourses.map((course) => (
                  <motion.div key={course.id} variants={staggerItem}>
                    <PopularCourseCard course={course} />
                  </motion.div>
                ))}
              </motion.div>
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
