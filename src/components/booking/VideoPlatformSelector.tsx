import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Video, Sparkles, FileText, Users, Settings, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface VideoPlatformSelectorProps {
  value: string;
  onChange: (value: string) => void;
  hasGoogleCalendar: boolean;
  onConnectGoogle?: () => void;
  enableClubAI?: boolean;
  onEnableClubAIChange?: (enabled: boolean) => void;
  autoRecord?: boolean;
  onAutoRecordChange?: (enabled: boolean) => void;
  requireApproval?: boolean;
  onRequireApprovalChange?: (enabled: boolean) => void;
}

export function VideoPlatformSelector({
  value,
  onChange,
  hasGoogleCalendar,
  onConnectGoogle,
  enableClubAI = false,
  onEnableClubAIChange,
  autoRecord = false,
  onAutoRecordChange,
  requireApproval = false,
  onRequireApprovalChange,
}: VideoPlatformSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Video Conferencing Platform</Label>
      
      <RadioGroup value={value} onValueChange={onChange}>
        {/* Option 1: TQC Meetings (Default, Recommended) */}
        <Card className={cn(
          "p-4 cursor-pointer transition-all hover:shadow-md",
          value === 'quantum_club' && "border-primary bg-primary/5 shadow-sm"
        )}>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="quantum_club" id="quantum" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="quantum" className="flex items-center gap-2 cursor-pointer text-base">
                <Video className="h-5 w-5 text-primary" />
                <span className="font-semibold">TQC Meetings</span>
                <Badge variant="secondary" className="ml-auto">Recommended</Badge>
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Full-featured video calls with AI intelligence, recording, breakout rooms, and advanced interview features.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="text-xs font-normal">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Club AI Insights
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  <FileText className="h-3 w-3 mr-1" />
                  Auto Transcripts
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  <Users className="h-3 w-3 mr-1" />
                  Breakout Rooms
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Option 2: Google Meet */}
        <Card className={cn(
          "p-4 cursor-pointer transition-all hover:shadow-md",
          value === 'google_meet' && "border-primary bg-primary/5 shadow-sm"
        )}>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="google_meet" id="google_meet" className="mt-1" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="google_meet" className="flex items-center gap-2 cursor-pointer text-base">
                <Video className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Google Meet</span>
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use Google Meet for video calls. Automatically creates Meet links via your Google Calendar.
              </p>
              
              {!hasGoogleCalendar && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">Connect Google Calendar to use Google Meet</span>
                    {onConnectGoogle && (
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConnectGoogle();
                        }}
                        className="h-auto p-0 text-primary"
                      >
                        Connect Now
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </Card>

        {/* Option 3: No Video (Phone/In-Person) */}
        <Card className={cn(
          "p-4 cursor-pointer transition-all hover:shadow-md",
          value === 'none' && "border-primary bg-primary/5 shadow-sm"
        )}>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="none" id="none" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="none" className="cursor-pointer text-base font-semibold">
                No Video Conferencing
              </Label>
              <p className="text-sm text-muted-foreground mt-2">
                Phone call or in-person meeting only
              </p>
            </div>
          </div>
        </Card>
      </RadioGroup>

      {/* Advanced Settings for TQC Meetings */}
      {value === 'quantum_club' && (
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced TQC Meeting Settings
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4 pt-3 border-t">
            {onEnableClubAIChange && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_ai" className="text-sm font-medium">
                    Enable Club AI Interview Intelligence
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Real-time insights, auto-transcripts, and post-interview reports
                  </p>
                </div>
                <Switch 
                  id="enable_ai"
                  checked={enableClubAI} 
                  onCheckedChange={onEnableClubAIChange} 
                />
              </div>
            )}
            
            {onAutoRecordChange && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_record" className="text-sm font-medium">
                    Auto-record meetings
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically start recording when meeting begins
                  </p>
                </div>
                <Switch 
                  id="auto_record"
                  checked={autoRecord} 
                  onCheckedChange={onAutoRecordChange} 
                />
              </div>
            )}

            {onRequireApprovalChange && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require_approval" className="text-sm font-medium">
                    Require host approval for guests
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Guests wait in lobby until you admit them
                  </p>
                </div>
                <Switch 
                  id="require_approval"
                  checked={requireApproval} 
                  onCheckedChange={onRequireApprovalChange} 
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
