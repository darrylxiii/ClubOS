import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Sparkles, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestPlatformSelectorProps {
  availablePlatforms: string[];
  selectedPlatform: string;
  onPlatformChange: (platform: string) => void;
  hostName?: string;
  hasGoogleCalendar: boolean;
}

export function GuestPlatformSelector({
  availablePlatforms,
  selectedPlatform,
  onPlatformChange,
  hostName = "the host",
  hasGoogleCalendar,
}: GuestPlatformSelectorProps) {
  // Filter out platforms that shouldn't be shown
  const validPlatforms = availablePlatforms.filter(platform => {
    if (platform === 'google_meet') {
      // Only show Google Meet if host has Google Calendar connected
      return hasGoogleCalendar;
    }
    return platform === 'quantum_club';
  });

  // If only one platform is available, don't show selector
  if (validPlatforms.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-4 pb-6 border-b">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Choose Your Meeting Platform</Label>
        <p className="text-sm text-muted-foreground">
          {hostName} has enabled multiple video platforms. Select your preferred option below.
        </p>
      </div>
      
      <RadioGroup value={selectedPlatform} onValueChange={onPlatformChange}>
        {validPlatforms.includes('quantum_club') && (
          <Card className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md",
            selectedPlatform === 'quantum_club' && "border-primary bg-primary/5 shadow-sm"
          )}>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="quantum_club" id="guest-quantum" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="guest-quantum" className="flex items-center gap-2 cursor-pointer text-base">
                  <Video className="h-5 w-5 text-primary" />
                  <span className="font-semibold">TQC Meetings</span>
                  <Badge variant="secondary" className="ml-auto">Recommended</Badge>
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Full-featured video calls with AI intelligence, recording, and advanced interview features.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className="text-xs font-normal">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Insights
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
        )}

        {validPlatforms.includes('google_meet') && (
          <Card className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md",
            selectedPlatform === 'google_meet' && "border-primary bg-primary/5 shadow-sm"
          )}>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="google_meet" id="guest-google" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="guest-google" className="flex items-center gap-2 cursor-pointer text-base">
                  <Video className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Google Meet</span>
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Familiar interface for Google users. Meeting link will be automatically added to your calendar.
                </p>
              </div>
            </div>
          </Card>
        )}
      </RadioGroup>
    </div>
  );
}
