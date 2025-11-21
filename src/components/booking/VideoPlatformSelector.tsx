import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  allowGuestChoice?: boolean;
  onAllowGuestChoiceChange?: (enabled: boolean) => void;
  availablePlatforms?: string[];
  onAvailablePlatformsChange?: (platforms: string[]) => void;
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
  allowGuestChoice = false,
  onAllowGuestChoiceChange,
  availablePlatforms = ['quantum_club'],
  onAvailablePlatformsChange,
}: VideoPlatformSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePlatformToggle = (platform: string, checked: boolean) => {
    if (!onAvailablePlatformsChange) return;
    
    if (checked) {
      onAvailablePlatformsChange([...availablePlatforms, platform]);
    } else {
      // Prevent unchecking if it's the last platform
      if (availablePlatforms.length > 1) {
        onAvailablePlatformsChange(availablePlatforms.filter(p => p !== platform));
      }
    }
  };

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

      {/* Guest Platform Choice Toggle */}
      {onAllowGuestChoiceChange && (
        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_guest_choice" className="text-sm font-medium">
                Let guests choose their preferred platform
              </Label>
              <p className="text-xs text-muted-foreground">
                Allow guests to select from multiple video platforms when booking
              </p>
            </div>
            <Switch 
              id="allow_guest_choice"
              checked={allowGuestChoice} 
              onCheckedChange={onAllowGuestChoiceChange} 
            />
          </div>

          {/* Platform Selection for Guests */}
          {allowGuestChoice && onAvailablePlatformsChange && (
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              <Label className="text-sm font-medium">Available Platforms for Guests</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="platform-quantum" 
                    checked={availablePlatforms.includes('quantum_club')}
                    onCheckedChange={(checked) => handlePlatformToggle('quantum_club', checked as boolean)}
                  />
                  <Label 
                    htmlFor="platform-quantum" 
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <Video className="h-4 w-4 text-primary" />
                    TQC Meetings
                    <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="platform-google" 
                    checked={availablePlatforms.includes('google_meet')}
                    onCheckedChange={(checked) => handlePlatformToggle('google_meet', checked as boolean)}
                    disabled={!hasGoogleCalendar}
                  />
                  <Label 
                    htmlFor="platform-google" 
                    className={cn(
                      "text-sm font-normal cursor-pointer flex items-center gap-2",
                      !hasGoogleCalendar && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Video className="h-4 w-4 text-blue-500" />
                    Google Meet
                  </Label>
                </div>
                
                {!hasGoogleCalendar && (
                  <p className="text-xs text-muted-foreground pl-6">
                    Connect Google Calendar to enable Google Meet
                  </p>
                )}
                
                {availablePlatforms.length === 1 && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    At least one platform must remain selected
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
