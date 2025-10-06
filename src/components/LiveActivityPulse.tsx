import { useEffect, useState } from "react";
import { Briefcase, Users, Calendar, TrendingUp } from "lucide-react";

interface Activity {
  id: number;
  type: "placement" | "member" | "event" | "application";
  text: string;
  icon: any;
}

const activities: Activity[] = [
  { id: 1, type: "placement", text: "Sarah J. placed as Head of Product at Zenith", icon: Briefcase },
  { id: 2, type: "member", text: "12 new elite members joined this week", icon: Users },
  { id: 3, type: "event", text: "Upcoming AMA with Fortune 500 CEO", icon: Calendar },
  { id: 4, type: "application", text: "450+ applications processed this month", icon: TrendingUp },
  { id: 5, type: "placement", text: "Marcus T. accepted VP Engineering role", icon: Briefcase },
  { id: 6, type: "member", text: "Club milestone: 1,200+ active members", icon: Users },
];

export const LiveActivityPulse = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const current = activities[currentIndex];
  const Icon = current.icon;

  return (
    <div className="relative overflow-hidden">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-full border-2 border-foreground/10 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <div className="relative">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping"></div>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{current.text}</span>
      </div>
    </div>
  );
};
