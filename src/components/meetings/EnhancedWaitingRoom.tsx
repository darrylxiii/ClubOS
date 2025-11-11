import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, FileText } from "lucide-react";

interface WaitingRoomConfig {
  company_logo_url?: string;
  welcome_message?: string;
  background_color?: string;
  show_interviewer_names?: boolean;
  show_estimated_wait?: boolean;
  prep_materials_url?: string;
}

interface EnhancedWaitingRoomProps {
  meetingId: string;
  meetingTitle: string;
  estimatedWaitMinutes?: number;
}

export function EnhancedWaitingRoom({
  meetingId,
  meetingTitle,
  estimatedWaitMinutes = 2
}: EnhancedWaitingRoomProps) {
  const [config, setConfig] = useState<WaitingRoomConfig>({});
  const [interviewers, setInterviewers] = useState<string[]>([]);

  useEffect(() => {
    loadConfig();
    loadInterviewers();
  }, [meetingId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_waiting_room_config' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading config:', error);
      } else if (data) {
        setConfig(data as any);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadInterviewers = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('profiles!inner(full_name)')
        .eq('meeting_id', meetingId)
        .in('role', ['host', 'interviewer'])
        .limit(3);

      if (error) throw error;

      const names = data?.map((p: any) => p.profiles.full_name).filter(Boolean) || [];
      setInterviewers(names);
    } catch (error) {
      console.error('Error loading interviewers:', error);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: config.background_color || '#000000' }}
    >
      <Card className="max-w-2xl w-full p-8 space-y-6 bg-card/95 backdrop-blur-sm">
        {config.company_logo_url && (
          <div className="flex justify-center">
            <img 
              src={config.company_logo_url} 
              alt="Company Logo" 
              className="h-16 object-contain"
            />
          </div>
        )}

        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">{meetingTitle}</h1>
          
          {config.welcome_message && (
            <p className="text-lg text-muted-foreground">
              {config.welcome_message}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 pt-4">
            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
            <p className="text-muted-foreground">Waiting for host to admit you...</p>
          </div>
        </div>

        {config.show_estimated_wait !== false && (
          <Card className="p-4 bg-muted/50 flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">Estimated wait time</p>
              <p className="text-sm text-muted-foreground">
                Approximately {estimatedWaitMinutes} minute{estimatedWaitMinutes !== 1 ? 's' : ''}
              </p>
            </div>
          </Card>
        )}

        {config.show_interviewer_names !== false && interviewers.length > 0 && (
          <Card className="p-4 bg-muted/50">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-2">Interview Panel</p>
                <div className="flex flex-wrap gap-2">
                  {interviewers.map((name, idx) => (
                    <Badge key={idx} variant="secondary">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {config.prep_materials_url && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Interview Preparation</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Review these materials while you wait
                </p>
                <a
                  href={config.prep_materials_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View Preparation Materials →
                </a>
              </div>
            </div>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          <p>Having technical issues? Make sure your camera and microphone are enabled.</p>
        </div>
      </Card>
    </div>
  );
}