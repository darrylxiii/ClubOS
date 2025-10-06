import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings } from "lucide-react";

interface DisplaySettings {
  showOwnership: boolean;
  showFormat: boolean;
  showTeam: boolean;
  showLocationMeeting: boolean;
  showMaterials: boolean;
  showEvaluation: boolean;
  showScheduling: boolean;
  showMetadata: boolean;
}

interface PipelineDisplaySettingsProps {
  jobId: string;
  settings: DisplaySettings;
  onSettingsChange: (settings: DisplaySettings) => void;
}

const defaultSettings: DisplaySettings = {
  showOwnership: true,
  showFormat: true,
  showTeam: true,
  showLocationMeeting: false,
  showMaterials: false,
  showEvaluation: false,
  showScheduling: false,
  showMetadata: false,
};

export function PipelineDisplaySettings({ jobId, settings, onSettingsChange }: PipelineDisplaySettingsProps) {
  const handleToggle = (key: keyof DisplaySettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    onSettingsChange(newSettings);
    localStorage.setItem(`pipeline-breakdown-display-${jobId}`, JSON.stringify(newSettings));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-9 px-3 bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30 hover:border-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300"
        >
          <Settings className="w-4 h-4 mr-2" />
          Display Options
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-background/95 backdrop-blur-xl border-accent/20" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Pipeline Display Options</h4>
            <p className="text-xs text-muted-foreground">
              Customize what information is shown in the pipeline breakdown
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="ownership" 
                checked={settings.showOwnership}
                onCheckedChange={() => handleToggle('showOwnership')}
              />
              <Label htmlFor="ownership" className="text-sm font-medium cursor-pointer flex-1">
                Show Ownership Icons
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="format" 
                checked={settings.showFormat}
                onCheckedChange={() => handleToggle('showFormat')}
              />
              <Label htmlFor="format" className="text-sm font-medium cursor-pointer flex-1">
                Show Format Details
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="team" 
                checked={settings.showTeam}
                onCheckedChange={() => handleToggle('showTeam')}
              />
              <Label htmlFor="team" className="text-sm font-medium cursor-pointer flex-1">
                Show Team Assignments
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="locationMeeting" 
                checked={settings.showLocationMeeting}
                onCheckedChange={() => handleToggle('showLocationMeeting')}
              />
              <Label htmlFor="locationMeeting" className="text-sm font-medium cursor-pointer flex-1">
                Show Location/Meeting Info
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="materials" 
                checked={settings.showMaterials}
                onCheckedChange={() => handleToggle('showMaterials')}
              />
              <Label htmlFor="materials" className="text-sm font-medium cursor-pointer flex-1">
                Show Materials & Resources
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="evaluation" 
                checked={settings.showEvaluation}
                onCheckedChange={() => handleToggle('showEvaluation')}
              />
              <Label htmlFor="evaluation" className="text-sm font-medium cursor-pointer flex-1">
                Show Evaluation Setup
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="scheduling" 
                checked={settings.showScheduling}
                onCheckedChange={() => handleToggle('showScheduling')}
              />
              <Label htmlFor="scheduling" className="text-sm font-medium cursor-pointer flex-1">
                Show Scheduling Details
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
              <Checkbox 
                id="metadata" 
                checked={settings.showMetadata}
                onCheckedChange={() => handleToggle('showMetadata')}
              />
              <Label htmlFor="metadata" className="text-sm font-medium cursor-pointer flex-1">
                Show Advanced Metadata
              </Label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { defaultSettings };
export type { DisplaySettings };
