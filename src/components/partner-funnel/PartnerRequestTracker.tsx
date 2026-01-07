import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
}

const TRACKER_STEPS = [
  { 
    id: 1, 
    name: "Fill out Partner Request", 
    description: "Initial information submitted",
    status: "completed" as const
  },
  { 
    id: 2, 
    name: "Contact", 
    description: "Initial response from your strategist",
    status: "in_progress" as const
  },
  { 
    id: 3, 
    name: "Assessment", 
    description: "Needs analysis & partnership fit",
    status: "in_progress" as const
  },
  { 
    id: 4, 
    name: "Sync Call", 
    description: "Strategy alignment meeting",
    status: "pending" as const
  },
  { 
    id: 5, 
    name: "Legal & Kick-off", 
    description: "Agreement & project launch",
    status: "pending" as const
  },
];

export function PartnerRequestTracker() {
  const [strategist, setStrategist] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrategist();
  }, []);

  const loadStrategist = async () => {
    try {
      // First try to get assigned strategist from strategist_assignments
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: assignment } = await supabase
          .from("strategist_assignments")
          .select(`
            strategist_id,
            profiles:strategist_id (id, full_name, avatar_url)
          `)
          .eq("partner_id", user.id)
          .eq("is_active", true)
          .eq("assignment_type", "primary")
          .single();

        if (assignment?.profiles) {
          setStrategist(assignment.profiles as unknown as Profile);
          setLoading(false);
          return;
        }
      }

      // Fallback: Get any available strategist
      const { data: strategists } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:user_id (id, full_name, avatar_url)
        `)
        .eq("role", "strategist")
        .limit(1);

      if (strategists?.[0]?.profiles) {
        setStrategist(strategists[0].profiles as unknown as Profile);
      }
    } catch (error) {
      console.error("Error loading strategist:", error);
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = TRACKER_STEPS.filter(s => s.status === "completed").length;
  const progress = (completedSteps / TRACKER_STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Availability Indicator */}
      <div className="flex items-center justify-center gap-3 p-4 glass-effect border border-primary/20 rounded-2xl">
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
        </div>
        <span className="text-sm font-semibold">
          <span className="text-green-500">2/5</span> partner spots left for this quarter
        </span>
      </div>

      {/* Strategist Card */}
      {!loading && strategist && (
        <Card className="p-6 glass-effect border-primary/20">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Who will handle your request
          </div>
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={strategist.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {strategist.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-lg">{strategist.full_name}</h4>
              <p className="text-sm text-muted-foreground mb-3">Founder & CEO</p>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Avg. response time: <span className="font-semibold text-foreground">19 minutes</span>
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Progress Overview */}
      <Card className="p-6 glass-effect border-primary/20">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Partnership Journey</h3>
            <p className="text-sm text-muted-foreground">
              Step {completedSteps + 1} of {TRACKER_STEPS.length}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {Math.round(progress)}%
          </Badge>
        </div>
        <Progress value={progress} className="h-3" />
      </Card>

      {/* Steps Tracker */}
      <Card className="p-6 glass-effect">
        <h3 className="text-lg font-semibold mb-6">Next Steps</h3>
        <div className="space-y-6">
          {TRACKER_STEPS.map((step, index) => (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                {step.status === "completed" ? (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                ) : step.status === "in_progress" ? (
                  <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                {index < TRACKER_STEPS.length - 1 && (
                  <div className={`w-0.5 h-12 mt-2 ${
                    step.status === "completed" ? "bg-primary" : "bg-border"
                  }`} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{step.name}</h4>
                  {step.status === "in_progress" && (
                    <Badge variant="outline" className="text-xs">In Progress</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
