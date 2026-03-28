import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, Award, Clock } from "lucide-react";
import { useAcademyDashboard } from "@/hooks/useAcademyDashboard";

const TOPIC_COLORS = ['hsl(var(--primary))', '#6366f1', '#ec4899', '#a855f7'];
const TOPIC_BG_CLASSES = ['bg-primary', 'bg-[#6366f1]', 'bg-[#ec4899]', 'bg-[#a855f7]'];

export function AcademyDashboard() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useAcademyDashboard();

  const stats = [
    { label: "Ongoing", value: data?.stats.ongoing ?? 0, icon: BookOpen, color: "text-blue-500 bg-blue-500/10" },
    { label: "Completed", value: data?.stats.completed ?? 0, icon: CheckCircle2, color: "text-success bg-success/10" },
    { label: "Certificates", value: data?.stats.certificates ?? 0, icon: Award, color: "text-warning bg-warning/10" },
    { label: "Hours Spent", value: data?.stats.hoursSpent ?? 0, icon: Clock, color: "text-primary bg-primary/10" },
  ];

  const topics = data?.topics ?? [];
  const totalCourses = data?.totalCourses ?? 0;

  // Build donut chart segments
  let cumulativeOffset = 0;
  const segments = topics.map((topic, index) => {
    const segment = {
      ...topic,
      color: TOPIC_COLORS[index] || TOPIC_COLORS[3],
      offset: cumulativeOffset,
    };
    cumulativeOffset += topic.percentage;
    return segment;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats Cards */}
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-subtle rounded-2xl p-6 hover-lift">
            <div className={`inline-flex p-3 rounded-xl ${stat.color} mb-4`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold mb-1">{isLoading ? '—' : stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Course Topic Chart */}
      <div className="glass-subtle rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-6">{t("course_topic", "Course Topics")}</h3>
        <div className="flex flex-col items-center">
          {/* Donut Chart */}
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="currentColor" strokeWidth="12"
                className="text-muted/20"
              />
              {segments.map((seg) => (
                <circle
                  key={seg.name}
                  cx="50" cy="50" r="40" fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={`${seg.percentage * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`-${seg.offset * 2.51}`}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold">{isLoading ? '—' : totalCourses}</div>
              <div className="text-sm text-muted-foreground">{t("total_course", "Enrolled")}</div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {topics.length > 0 ? topics.map((topic, index) => (
              <div key={topic.name} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${TOPIC_BG_CLASSES[index] || TOPIC_BG_CLASSES[3]}`} />
                <span className="text-sm text-muted-foreground">
                  {topic.name} <span className="font-medium text-foreground">({topic.percentage}%)</span>
                </span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground col-span-2 text-center">
                Enroll in courses to see your topic breakdown
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
