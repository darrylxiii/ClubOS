import { Card } from "@/components/ui/card";
import { BookOpen, CheckCircle2, Award, Clock } from "lucide-react";

export function AcademyDashboard() {
  const stats = [
    { label: "Ongoing", value: "5", icon: BookOpen, color: "text-blue-500 bg-blue-500/10" },
    { label: "Completed", value: "37", icon: CheckCircle2, color: "text-success bg-success/10" },
    { label: "Certificate", value: "25", icon: Award, color: "text-warning bg-warning/10" },
    { label: "Hour Spent", value: "705", icon: Clock, color: "text-primary bg-primary/10" },
  ];

  const topics = [
    { name: "Design", percentage: 40, color: "text-primary" },
    { name: "Code", percentage: 30, color: "text-blue-500" },
    { name: "Business", percentage: 20, color: "text-pink-500" },
    { name: "Data", percentage: 10, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats Cards */}
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 squircle hover-lift">
            <div className={`inline-flex p-3 squircle-sm ${stat.color} mb-4`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Course Topic Chart */}
      <Card className="p-6 squircle">
        <h3 className="text-lg font-semibold mb-6">Course Topic</h3>
        <div className="flex flex-col items-center">
          {/* Donut Chart */}
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-muted/20"
              />
              {/* Design - 40% */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="12"
                strokeDasharray={`${40 * 2.51} ${100 * 2.51}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              {/* Code - 30% */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#6366f1"
                strokeWidth="12"
                strokeDasharray={`${30 * 2.51} ${100 * 2.51}`}
                strokeDashoffset={`-${40 * 2.51}`}
                strokeLinecap="round"
              />
              {/* Business - 20% */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#ec4899"
                strokeWidth="12"
                strokeDasharray={`${20 * 2.51} ${100 * 2.51}`}
                strokeDashoffset={`-${70 * 2.51}`}
                strokeLinecap="round"
              />
              {/* Data - 10% */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#a855f7"
                strokeWidth="12"
                strokeDasharray={`${10 * 2.51} ${100 * 2.51}`}
                strokeDashoffset={`-${90 * 2.51}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold">42</div>
              <div className="text-sm text-muted-foreground">Total Course</div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {topics.map((topic, index) => (
              <div key={topic.name} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-primary' : 
                    index === 1 ? 'bg-[#6366f1]' : 
                    index === 2 ? 'bg-[#ec4899]' : 
                    'bg-[#a855f7]'
                  }`}
                />
                <span className="text-sm text-muted-foreground">
                  {topic.name} <span className="font-medium text-foreground">({topic.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
