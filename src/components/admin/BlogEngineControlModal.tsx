import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Loader2 } from 'lucide-react';
import { useBlogEngineSettings, type BlogEngineSettings } from '@/hooks/useBlogEngineSettings';
import type { ContentFormat } from '@/hooks/useBlogGeneration';

const FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'career-playbook', label: 'Career Playbook' },
  { value: 'market-analysis', label: 'Market Analysis' },
  { value: 'trend-report', label: 'Trend Report' },
  { value: 'success-story', label: 'Success Story' },
  { value: 'myth-buster', label: 'Myth-Buster' },
  { value: 'talent-origin', label: 'Talent Origin' },
  { value: 'executive-stack', label: 'Executive Stack' },
];

const CATEGORIES = [
  { value: 'career-insights', label: 'Career Insights' },
  { value: 'talent-strategy', label: 'Talent Strategy' },
  { value: 'industry-trends', label: 'Industry Trends' },
  { value: 'leadership', label: 'Leadership' },
];

const BlogEngineControlModal: React.FC = () => {
  const { settings, isLoading, isEngineActive, updateSettings, isSaving } = useBlogEngineSettings();
  const [open, setOpen] = useState(false);

  const [localSettings, setLocalSettings] = useState({
    is_active: false,
    posts_per_day: 1,
    preferred_formats: [] as string[],
    categories: [] as string[],
    auto_publish: false,
    require_medical_review: true,
    min_quality_score: 70,
    publishing_window_start: '09:00',
    publishing_window_end: '17:00',
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        is_active: settings.is_active,
        posts_per_day: settings.posts_per_day,
        preferred_formats: settings.preferred_formats || [],
        categories: settings.categories || [],
        auto_publish: settings.auto_publish,
        require_medical_review: settings.require_medical_review,
        min_quality_score: settings.min_quality_score,
        publishing_window_start: settings.publishing_window_start || '09:00',
        publishing_window_end: settings.publishing_window_end || '17:00',
      });
    }
  }, [settings]);

  const toggleFormat = (format: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      preferred_formats: prev.preferred_formats.includes(format)
        ? prev.preferred_formats.filter((f) => f !== format)
        : [...prev.preferred_formats, format],
    }));
  };

  const toggleCategory = (category: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSave = async () => {
    await updateSettings(localSettings as any);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Engine Control
          <div className={`w-2 h-2 rounded-full ${isEngineActive ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Blog Engine Control</DialogTitle>
          <DialogDescription>Configure the AI content generation engine.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Master Switch */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Engine Active</Label>
                <p className="text-sm text-muted-foreground">Master switch for automated generation.</p>
              </div>
              <Switch
                checked={localSettings.is_active}
                onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, is_active: v }))}
              />
            </div>

            <Separator />

            {/* Posts per day */}
            <div className="space-y-2">
              <Label>Posts per day: {localSettings.posts_per_day}</Label>
              <Slider
                value={[localSettings.posts_per_day]}
                onValueChange={([v]) => setLocalSettings((p) => ({ ...p, posts_per_day: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <Separator />

            {/* Formats */}
            <div className="space-y-3">
              <Label>Content Formats</Label>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => (
                  <div key={f.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={localSettings.preferred_formats.includes(f.value)}
                      onCheckedChange={() => toggleFormat(f.value)}
                    />
                    <span className="text-sm">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Categories */}
            <div className="space-y-3">
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <div key={c.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={localSettings.categories.includes(c.value)}
                      onCheckedChange={() => toggleCategory(c.value)}
                    />
                    <span className="text-sm">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Auto-publish */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-publish</Label>
                <p className="text-xs text-muted-foreground">Publish articles automatically when quality passes.</p>
              </div>
              <Switch
                checked={localSettings.auto_publish}
                onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, auto_publish: v }))}
              />
            </div>

            {localSettings.auto_publish && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                Articles will publish without manual review.
              </Badge>
            )}

            {/* Expert Review */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Require expert review</Label>
                <p className="text-xs text-muted-foreground">Hold articles for manual review before publishing.</p>
              </div>
              <Switch
                checked={localSettings.require_medical_review}
                onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, require_medical_review: v }))}
              />
            </div>

            <Separator />

            {/* Quality Score */}
            <div className="space-y-2">
              <Label>Min Quality Score: {localSettings.min_quality_score}</Label>
              <Slider
                value={[localSettings.min_quality_score]}
                onValueChange={([v]) => setLocalSettings((p) => ({ ...p, min_quality_score: v }))}
                min={50}
                max={100}
                step={5}
              />
            </div>

            <Separator />

            {/* Publishing Window */}
            <div className="space-y-3">
              <Label>Publishing Window</Label>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Start</span>
                  <Input
                    type="time"
                    value={localSettings.publishing_window_start}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, publishing_window_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">End</span>
                  <Input
                    type="time"
                    value={localSettings.publishing_window_end}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, publishing_window_end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlogEngineControlModal;
