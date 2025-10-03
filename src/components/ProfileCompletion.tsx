import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
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
        { id: "profile", label: "Complete personal information", completed: false, link: "/profile#personal" },
        { id: "salary", label: "Set salary expectations", completed: false, link: "/profile#salary" },
        { id: "resume", label: "Upload resume/CV", completed: false, link: "/profile#resume" },
        { id: "tqc_resume", label: "Create TQC resume", completed: false, link: "/profile#tqc-resume" },
        { id: "google_calendar", label: "Connect Google Calendar", completed: false, link: "/profile#calendar" },
        { id: "microsoft_calendar", label: "Connect Microsoft Calendar", completed: false, link: "/profile#calendar" },
        { id: "preferences", label: "Set career preferences", completed: false, link: "/profile#preferences" },
      ];

      // Check profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Check if basic profile is complete
        if (profile.full_name && profile.email) {
          items.find(i => i.id === "profile")!.completed = true;
        }

        // For now, we'll check localStorage for other items
        // In a real app, you'd store these in the database
      }

      // Check calendar connections
      const googleToken = localStorage.getItem('google_calendar_token');
      if (googleToken) {
        items.find(i => i.id === "google_calendar")!.completed = true;
      }

      const microsoftToken = localStorage.getItem('microsoft_calendar_token');
      if (microsoftToken) {
        items.find(i => i.id === "microsoft_calendar")!.completed = true;
      }

      // Check if other data exists (you can extend this based on your profile structure)
      // For demo purposes, we'll check localStorage for temporary data
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

      // Calculate percentage
      const completedCount = items.filter(i => i.completed).length;
      const percentage = Math.round((completedCount / items.length) * 100);
      setCompletionPercentage(percentage);
    };

    checkCompletion();
  }, [user]);

  return (
    <Card className="border-2 border-foreground bg-background">
      <CardHeader>
        <CardTitle className="text-lg font-black uppercase flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-foreground"></div>
            Profile Completion
          </div>
          <span className="text-3xl font-black">{completionPercentage}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={completionPercentage} className="h-3" />
        
        <div className="space-y-3">
          {completionItems.map((item) => (
            <Link
              key={item.id}
              to={item.link}
              className="flex items-center gap-3 p-3 border border-border hover:bg-accent/5 transition-colors group"
            >
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-colors" />
              )}
              <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : 'font-medium group-hover:text-foreground transition-colors'}`}>
                {item.label}
              </span>
              {!item.completed && (
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all" />
              )}
            </Link>
          ))}
        </div>

        {completionPercentage < 100 && (
          <Link to="/profile">
            <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
              Complete Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}

        {completionPercentage === 100 && (
          <div className="text-center p-4 bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-bold text-green-600">
              🎉 Profile 100% Complete!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
