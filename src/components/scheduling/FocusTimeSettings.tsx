import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusTimeDefender, FocusTimeBlock, FocusTimePreferences } from '@/hooks/useFocusTimeDefender';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Brain, 
  Clock, 
  AlertTriangle,
  Coffee,
  Zap,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BLOCK_TYPES = [
  { value: 'focus', label: 'Focus Time', icon: Zap, color: 'bg-blue-500' },
  { value: 'deep_work', label: 'Deep Work', icon: Brain, color: 'bg-purple-500' },
  { value: 'lunch', label: 'Lunch', icon: Coffee, color: 'bg-orange-500' },
  { value: 'personal', label: 'Personal', icon: Calendar, color: 'bg-green-500' },
  { value: 'no_meetings', label: 'No Meetings', icon: Shield, color: 'bg-red-500' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

export function FocusTimeSettings() {
  const { user } = useAuth();
  const {
    focusBlocks,
    preferences,
    todayLoad,
    isLoading,
    createBlock,
    updateBlock,
    deleteBlock,
    savePreferences,
    analyzePatterns,
    calculateLoad,
    dayNames,
  } = useFocusTimeDefender(user?.id);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBlock, setNewBlock] = useState<Partial<FocusTimeBlock>>({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '11:00',
    block_type: 'focus',
    label: '',
    is_active: true,
    sync_to_calendar: true,
  });

  const [localPrefs, setLocalPrefs] = useState<Partial<FocusTimePreferences>>(
    preferences || {
      enable_focus_defender: true,
      auto_detect_patterns: true,
      min_focus_block_minutes: 60,
      max_daily_meetings: 6,
      max_weekly_meeting_hours: 20,
      preferred_meeting_hours: { start: 9, end: 17 },
      buffer_between_meetings_minutes: 15,
      protect_mornings: true,
      morning_end_hour: 11,
      allow_override_with_reason: true,
      notification_when_protected: true,
    }
  );

  React.useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const handleSavePreferences = () => {
    savePreferences.mutate(localPrefs);
  };

  const handleAddBlock = () => {
    createBlock.mutate(newBlock, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewBlock({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '11:00',
          block_type: 'focus',
          label: '',
          is_active: true,
          sync_to_calendar: true,
        });
      },
    });
  };

  const handleDeleteBlock = (id: string) => {
    deleteBlock.mutate(id);
  };

  const handleToggleBlock = (block: FocusTimeBlock) => {
    updateBlock.mutate({ id: block.id, is_active: !block.is_active });
  };

  const getBlockTypeConfig = (type: string) => {
    return BLOCK_TYPES.find(t => t.value === type) || BLOCK_TYPES[0];
  };

  const groupedBlocks = dayNames.map((day, index) => ({
    day,
    dayIndex: index,
    blocks: focusBlocks.filter(b => b.day_of_week === index),
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading focus settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Load Summary */}
      {todayLoad && (
        <Card className={cn(
          "border-l-4",
          todayLoad.burnout_risk === 'critical' ? "border-l-destructive" :
          todayLoad.burnout_risk === 'high' ? "border-l-orange-500" :
          todayLoad.burnout_risk === 'medium' ? "border-l-yellow-500" :
          "border-l-green-500"
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Today's Meeting Load
              </CardTitle>
              <Badge variant={
                todayLoad.burnout_risk === 'critical' ? 'destructive' :
                todayLoad.burnout_risk === 'high' ? 'secondary' :
                'outline'
              }>
                {todayLoad.load_score}% Load
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Meetings</span>
                <p className="font-semibold">{todayLoad.meeting_count}</p>
              </div>
              <div>
                <span className="text-muted-foreground">In Meetings</span>
                <p className="font-semibold">{Math.round(todayLoad.meeting_minutes / 60)}h {todayLoad.meeting_minutes % 60}m</p>
              </div>
              <div>
                <span className="text-muted-foreground">Focus Time</span>
                <p className="font-semibold">{Math.round(todayLoad.focus_time_minutes / 60)}h {todayLoad.focus_time_minutes % 60}m</p>
              </div>
              <div>
                <span className="text-muted-foreground">Back-to-Back</span>
                <p className="font-semibold">{todayLoad.back_to_back_count}</p>
              </div>
            </div>
            {todayLoad.recommendations?.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Recommendations
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {todayLoad.recommendations.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="blocks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="blocks">Focus Blocks</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Focus Time Blocks
                  </CardTitle>
                  <CardDescription>
                    Define protected time blocks for deep work
                  </CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Block
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Focus Block</DialogTitle>
                      <DialogDescription>
                        Create a new protected time block
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Day</Label>
                          <Select
                            value={String(newBlock.day_of_week)}
                            onValueChange={(v) => setNewBlock({ ...newBlock, day_of_week: parseInt(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dayNames.map((day, i) => (
                                <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={newBlock.block_type}
                            onValueChange={(v) => setNewBlock({ ...newBlock, block_type: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOCK_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time</Label>
                          <Select
                            value={newBlock.start_time}
                            onValueChange={(v) => setNewBlock({ ...newBlock, start_time: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((slot) => (
                                <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>End Time</Label>
                          <Select
                            value={newBlock.end_time}
                            onValueChange={(v) => setNewBlock({ ...newBlock, end_time: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((slot) => (
                                <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Label (optional)</Label>
                        <Input
                          value={newBlock.label || ''}
                          onChange={(e) => setNewBlock({ ...newBlock, label: e.target.value })}
                          placeholder="e.g., Deep work session"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newBlock.sync_to_calendar}
                          onCheckedChange={(v) => setNewBlock({ ...newBlock, sync_to_calendar: v })}
                        />
                        <Label>Sync to calendar</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddBlock} disabled={createBlock.isPending}>
                        {createBlock.isPending ? 'Creating...' : 'Create Block'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupedBlocks.filter(g => g.blocks.length > 0).map((group) => (
                  <div key={group.dayIndex} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">{group.day}</h4>
                    <div className="space-y-2">
                      {group.blocks.map((block) => {
                        const typeConfig = getBlockTypeConfig(block.block_type);
                        return (
                          <div
                            key={block.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              block.is_active ? "bg-card" : "bg-muted opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-10 rounded-full", typeConfig.color)} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <typeConfig.icon className="h-4 w-4" />
                                  <span className="font-medium">{typeConfig.label}</span>
                                  {block.label && (
                                    <span className="text-muted-foreground">- {block.label}</span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={block.is_active}
                                onCheckedChange={() => handleToggleBlock(block)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBlock(block.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {focusBlocks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No focus blocks configured</p>
                    <p className="text-sm">Add blocks to protect your deep work time</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Focus Time Preferences</CardTitle>
              <CardDescription>
                Configure how focus time protection works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Focus Defender</Label>
                    <p className="text-sm text-muted-foreground">
                      Protect focus blocks from meeting requests
                    </p>
                  </div>
                  <Switch
                    checked={localPrefs.enable_focus_defender}
                    onCheckedChange={(v) => setLocalPrefs({ ...localPrefs, enable_focus_defender: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Protect Mornings</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep mornings free for focused work
                    </p>
                  </div>
                  <Switch
                    checked={localPrefs.protect_mornings}
                    onCheckedChange={(v) => setLocalPrefs({ ...localPrefs, protect_mornings: v })}
                  />
                </div>

                {localPrefs.protect_mornings && (
                  <div className="ml-4">
                    <Label>Morning Protection Until</Label>
                    <Select
                      value={String(localPrefs.morning_end_hour)}
                      onValueChange={(v) => setLocalPrefs({ ...localPrefs, morning_end_hour: parseInt(v) })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[9, 10, 11, 12].map((hour) => (
                          <SelectItem key={hour} value={String(hour)}>{hour}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Override with Reason</Label>
                    <p className="text-sm text-muted-foreground">
                      Let bookers override protection with a reason
                    </p>
                  </div>
                  <Switch
                    checked={localPrefs.allow_override_with_reason}
                    onCheckedChange={(v) => setLocalPrefs({ ...localPrefs, allow_override_with_reason: v })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Daily Meetings</Label>
                    <Input
                      type="number"
                      value={localPrefs.max_daily_meetings}
                      onChange={(e) => setLocalPrefs({ ...localPrefs, max_daily_meetings: parseInt(e.target.value) })}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div>
                    <Label>Buffer Between Meetings (min)</Label>
                    <Input
                      type="number"
                      value={localPrefs.buffer_between_meetings_minutes}
                      onChange={(e) => setLocalPrefs({ ...localPrefs, buffer_between_meetings_minutes: parseInt(e.target.value) })}
                      min={0}
                      max={60}
                    />
                  </div>
                </div>

                <div>
                  <Label>Preferred Meeting Hours</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Select
                      value={String(localPrefs.preferred_meeting_hours?.start || 9)}
                      onValueChange={(v) => setLocalPrefs({ 
                        ...localPrefs, 
                        preferred_meeting_hours: { 
                          ...localPrefs.preferred_meeting_hours!, 
                          start: parseInt(v) 
                        } 
                      })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 6).map((hour) => (
                          <SelectItem key={hour} value={String(hour)}>{hour}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select
                      value={String(localPrefs.preferred_meeting_hours?.end || 17)}
                      onValueChange={(v) => setLocalPrefs({ 
                        ...localPrefs, 
                        preferred_meeting_hours: { 
                          ...localPrefs.preferred_meeting_hours!, 
                          end: parseInt(v) 
                        } 
                      })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 12).map((hour) => (
                          <SelectItem key={hour} value={String(hour)}>{hour}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={handleSavePreferences} disabled={savePreferences.isPending}>
                {savePreferences.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Pattern Analysis
              </CardTitle>
              <CardDescription>
                Let QUIN analyze your meeting patterns and suggest optimal focus blocks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => analyzePatterns.mutate()}
                disabled={analyzePatterns.isPending}
              >
                {analyzePatterns.isPending ? 'Analyzing...' : 'Analyze My Patterns'}
              </Button>

              {analyzePatterns.data && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Suggested Focus Blocks</h4>
                    <div className="space-y-2">
                      {analyzePatterns.data.suggestedBlocks?.map((block: any, i: number) => (
                        <div key={i} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {dayNames[block.day_of_week]} {block.start_time} - {block.end_time}
                            </p>
                            <p className="text-sm text-muted-foreground">{block.reason}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => createBlock.mutate({
                              day_of_week: block.day_of_week,
                              start_time: block.start_time,
                              end_time: block.end_time,
                              block_type: block.block_type,
                              label: block.label,
                              is_active: true,
                              auto_detected: true,
                            })}
                          >
                            Add Block
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Analyzed {analyzePatterns.data.totalMeetingsAnalyzed} meetings from the past 30 days
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FocusTimeSettings;
