import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  link: string;
}

export const ProfileCompletion = () => {
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const checkCompletion = async () => {
      if (!user) return;

      const items: CompletionItem[] = [
        { id: "avatar", label: "Upload profile picture", completed: false, link: "/profile#personal" },
        { id: "profile", label: "Complete personal information", completed: false, link: "/profile#personal" },
        { id: "salary", label: "Set salary expectations", completed: false, link: "/profile#salary" },
        { id: "resume", label: "Upload resume/CV", completed: false, link: "/profile#resume" },
        { id: "tqc_resume", label: "Create TQC resume", completed: false, link: "/profile#tqc-resume" },
        { id: "google_calendar", label: "Connect Google Calendar", completed: false, link: "/profile#calendar" },
        { id: "microsoft_calendar", label: "Connect Microsoft Calendar", completed: false, link: "/profile#calendar" },
        { id: "preferences", label: "Set career preferences", completed: false, link: "/profile#preferences" },
      ];

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.avatar_url) {
          items.find(i => i.id === "avatar")!.completed = true;
        }
        if (profile.full_name && profile.email) {
          items.find(i => i.id === "profile")!.completed = true;
        }
      }

      const googleToken = localStorage.getItem('google_calendar_token');
      if (googleToken) {
        items.find(i => i.id === "google_calendar")!.completed = true;
      }

      const microsoftToken = localStorage.getItem('microsoft_calendar_token');
      if (microsoftToken) {
        items.find(i => i.id === "microsoft_calendar")!.completed = true;
      }

      const hasResume = localStorage.getItem('resume_uploaded') === 'true';
      const hasSalary = localStorage.getItem('salary_set') === 'true';
      const hasPreferences = localStorage.getItem('preferences_set') === 'true';
      const hasTQCResume = localStorage.getItem('tqc_resume_created') === 'true';

      if (hasResume) {
        items.find(i => i.id === "resume")!.completed = true;
      }
      if (hasSalary) {
        items.find(i => i.id === "salary")!.completed = true;
      }
      if (hasPreferences) {
        items.find(i => i.id === "preferences")!.completed = true;
      }
      if (hasTQCResume) {
        items.find(i => i.id === "tqc_resume")!.completed = true;
      }

      setCompletionItems(items);

      const completedCount = items.filter(i => i.completed).length;
      const percentage = Math.round((completedCount / items.length) * 100);
      setCompletionPercentage(percentage);
    };

    checkCompletion();
  }, [user]);

  const completedCount = completionItems.filter(i => i.completed).length;
  const totalCount = completionItems.length;

  return (
    <Card className="glass-strong border-0 shadow-glass-lg">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              Profile Strength
              {completionPercentage === 100 && (
                <Sparkles className="w-5 h-5 text-success animate-pulse" />
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} of {totalCount} completed
            </p>
          </div>
          <div className="text-3xl font-black text-primary">{completionPercentage}%</div>
        </div>
        
        <Progress value={completionPercentage} className="h-2.5" />
        
        <div className="space-y-2">
          {completionItems.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              to={item.link}
              className="flex items-center gap-3 p-3 rounded-xl glass-subtle hover:bg-card/80 transition-all group"
            >
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
              )}
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : 'font-medium text-foreground'}`}>
                {item.label}
              </span>
              {!item.completed && (
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
              )}
            </Link>
          ))}
        </div>

        {completionPercentage === 100 ? (
          <div className="p-4 rounded-xl glass-subtle bg-success/10 border border-success/20 text-center">
            <p className="text-sm font-semibold text-success flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Profile Complete!
            </p>
          </div>
        ) : (
          <Link to="/profile" className="block">
            <button className="w-full h-11 px-6 rounded-xl font-semibold bg-gradient-accent text-white shadow-glass-md hover:shadow-glass-lg transition-all hover:scale-105 active:scale-95">
              Complete Profile
              <ArrowRight className="inline-block w-4 h-4 ml-2" />
            </button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
