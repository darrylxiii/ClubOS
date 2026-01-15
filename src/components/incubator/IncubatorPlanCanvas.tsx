import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { REQUIRED_SECTIONS } from '@/data/incubatorScenarios';
import { CheckCircle2, Circle } from 'lucide-react';
import type { IncubatorPlanSection } from '@/types/assessment';

interface IncubatorPlanCanvasProps {
  sections: Partial<IncubatorPlanSection>;
  onSectionUpdate: (sectionId: keyof IncubatorPlanSection, content: string) => void;
  totalWordCount: number;
}

export const IncubatorPlanCanvas = memo(({ 
  sections, 
  onSectionUpdate, 
  totalWordCount 
}: IncubatorPlanCanvasProps) => {
  const getWordCount = (text?: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 border-b">
        <h2 className="text-2xl font-bold font-serif">Your One-Pager</h2>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant={totalWordCount > 450 ? 'destructive' : 'outline'}>
            {totalWordCount} / 450 words
          </Badge>
          <span className="text-sm text-muted-foreground">
            {REQUIRED_SECTIONS.filter(s => getWordCount(sections[s.id as keyof IncubatorPlanSection]) > 0).length} / {REQUIRED_SECTIONS.length} sections started
          </span>
        </div>
      </div>

      {/* Sections */}
      {REQUIRED_SECTIONS.map((section) => {
        const content = sections[section.id as keyof IncubatorPlanSection] || '';
        const wordCount = getWordCount(content);
        const isComplete = wordCount >= section.wordCap * 0.7; // 70% of cap considered complete
        const isOverLimit = wordCount > section.wordCap;

        return (
          <Card key={section.id} className={isOverLimit ? 'border-destructive' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </div>
                <Badge 
                  variant={isOverLimit ? 'destructive' : isComplete ? 'default' : 'outline'}
                >
                  {wordCount} / {section.wordCap}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => onSectionUpdate(section.id as keyof IncubatorPlanSection, e.target.value)}
                placeholder={`Write your ${section.title.toLowerCase()} here...`}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

IncubatorPlanCanvas.displayName = 'IncubatorPlanCanvas';
