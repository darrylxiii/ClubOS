import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, FileText, MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";

interface WaitingRoomConfig {
  company_logo_url?: string;
  welcome_message?: string;
  background_color?: string;
  show_interviewer_names?: boolean;
  show_estimated_wait?: boolean;
  prep_materials_url?: string;
  survey_questions?: SurveyQuestion[];
  template_name?: string;
}

interface SurveyQuestion {
  id: string;
  question: string;
  type: 'text' | 'rating' | 'choice';
  options?: string[];
  required?: boolean;
}

interface WaitingRoomConfigEditorProps {
  meetingId: string;
  onSave?: () => void;
}

const TEMPLATES: { name: string; config: Partial<WaitingRoomConfig> }[] = [
  {
    name: 'Interview',
    config: {
      welcome_message: 'Welcome to your interview. Please wait while we prepare the room.',
      background_color: '#0E0E10',
      show_interviewer_names: true,
      show_estimated_wait: true,
      survey_questions: [
        { id: '1', question: 'How are you feeling about the interview?', type: 'choice' as const, options: ['Confident', 'A bit nervous', 'Excited'] }
      ]
    }
  },
  {
    name: 'Team Meeting',
    config: {
      welcome_message: 'The meeting will begin shortly. Thank you for joining.',
      background_color: '#1a1a2e',
      show_interviewer_names: false,
      show_estimated_wait: true,
      survey_questions: []
    }
  },
  {
    name: 'Client Call',
    config: {
      welcome_message: 'Thank you for joining. Your host will be with you shortly.',
      background_color: '#0d1b2a',
      show_interviewer_names: true,
      show_estimated_wait: false,
      survey_questions: []
    }
  }
];

export function WaitingRoomConfigEditor({ meetingId, onSave }: WaitingRoomConfigEditorProps) {
  const [config, setConfig] = useState<WaitingRoomConfig>({
    welcome_message: '',
    background_color: '#0E0E10',
    show_interviewer_names: true,
    show_estimated_wait: true,
    survey_questions: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [meetingId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_waiting_room_config' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading config:', error);
      } else if (data) {
        const configData = data as any;
        setConfig({
          company_logo_url: configData.company_logo_url,
          welcome_message: configData.welcome_message,
          background_color: configData.background_color,
          show_interviewer_names: configData.show_interviewer_names,
          show_estimated_wait: configData.show_estimated_wait,
          prep_materials_url: configData.prep_materials_url,
          survey_questions: configData.survey_questions || [],
          template_name: configData.template_name
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('meeting_waiting_room_config' as any)
        .upsert({
          meeting_id: meetingId,
          ...config,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_id'
        });

      if (error) throw error;
      toast.success('Waiting room configuration saved');
      onSave?.();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setConfig(prev => {
      const newConfig: WaitingRoomConfig = {
        ...prev,
        welcome_message: template.config.welcome_message ?? prev.welcome_message,
        background_color: template.config.background_color ?? prev.background_color,
        show_interviewer_names: template.config.show_interviewer_names ?? prev.show_interviewer_names,
        show_estimated_wait: template.config.show_estimated_wait ?? prev.show_estimated_wait,
        survey_questions: template.config.survey_questions ?? prev.survey_questions,
        template_name: template.name
      };
      return newConfig;
    });
    toast.success(`Applied "${template.name}" template`);
  };

  const addSurveyQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: crypto.randomUUID(),
      question: '',
      type: 'text',
      required: false
    };
    setConfig(prev => ({
      ...prev,
      survey_questions: [...(prev.survey_questions || []), newQuestion]
    }));
  };

  const updateSurveyQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    setConfig(prev => ({
      ...prev,
      survey_questions: prev.survey_questions?.map(q =>
        q.id === id ? { ...q, ...updates } : q
      ) || []
    }));
  };

  const removeSurveyQuestion = (id: string) => {
    setConfig(prev => ({
      ...prev,
      survey_questions: prev.survey_questions?.filter(q => q.id !== id) || []
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Quick Templates</h3>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(template => (
            <Button
              key={template.name}
              variant={config.template_name === template.name ? "default" : "outline"}
              size="sm"
              onClick={() => applyTemplate(template)}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="survey" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Survey
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Company Logo URL</Label>
            <Input
              id="logo"
              value={config.company_logo_url || ''}
              onChange={e => setConfig(prev => ({ ...prev, company_logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bg-color">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="bg-color"
                type="color"
                value={config.background_color || '#0E0E10'}
                onChange={e => setConfig(prev => ({ ...prev, background_color: e.target.value }))}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={config.background_color || '#0E0E10'}
                onChange={e => setConfig(prev => ({ ...prev, background_color: e.target.value }))}
                placeholder="#0E0E10"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-interviewers">Show Interviewer Names</Label>
              <p className="text-sm text-muted-foreground">Display panel members to guests</p>
            </div>
            <Switch
              id="show-interviewers"
              checked={config.show_interviewer_names !== false}
              onCheckedChange={checked => setConfig(prev => ({ ...prev, show_interviewer_names: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-wait">Show Estimated Wait Time</Label>
              <p className="text-sm text-muted-foreground">Display approximate wait time</p>
            </div>
            <Switch
              id="show-wait"
              checked={config.show_estimated_wait !== false}
              onCheckedChange={checked => setConfig(prev => ({ ...prev, show_estimated_wait: checked }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="welcome">Welcome Message</Label>
            <Textarea
              id="welcome"
              value={config.welcome_message || ''}
              onChange={e => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
              placeholder="Welcome to your interview. Please wait while we prepare the room."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prep">Preparation Materials URL</Label>
            <Input
              id="prep"
              value={config.prep_materials_url || ''}
              onChange={e => setConfig(prev => ({ ...prev, prep_materials_url: e.target.value }))}
              placeholder="https://example.com/interview-prep"
            />
            <p className="text-sm text-muted-foreground">
              Link to preparation materials for guests to review while waiting
            </p>
          </div>
        </TabsContent>

        <TabsContent value="survey" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Pre-Meeting Questions</h4>
              <p className="text-sm text-muted-foreground">
                Ask guests questions while they wait
              </p>
            </div>
            <Button size="sm" onClick={addSurveyQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {config.survey_questions?.length === 0 ? (
            <Card className="p-6 text-center bg-muted/50">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No survey questions configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add questions to gather information from guests while they wait
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {config.survey_questions?.map((question, idx) => (
                <Card key={question.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">
                      Q{idx + 1}
                    </Badge>
                    <div className="flex-1 space-y-3">
                      <Input
                        value={question.question}
                        onChange={e => updateSurveyQuestion(question.id, { question: e.target.value })}
                        placeholder="Enter your question..."
                      />
                      <div className="flex items-center gap-4">
                        <select
                          value={question.type}
                          onChange={e => updateSurveyQuestion(question.id, { type: e.target.value as any })}
                          className="text-sm border rounded px-2 py-1 bg-background"
                        >
                          <option value="text">Text Answer</option>
                          <option value="rating">Rating (1-5)</option>
                          <option value="choice">Multiple Choice</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={question.required}
                            onCheckedChange={checked => updateSurveyQuestion(question.id, { required: checked })}
                          />
                          <Label className="text-sm">Required</Label>
                        </div>
                      </div>
                      {question.type === 'choice' && (
                        <Input
                          value={question.options?.join(', ') || ''}
                          onChange={e => updateSurveyQuestion(question.id, { 
                            options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                          })}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSurveyQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={saveConfig} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
