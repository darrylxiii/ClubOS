import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { IncubatorPlanCanvas } from './IncubatorPlanCanvas';
import { IncubatorAIChat } from './IncubatorAIChat';
import type { IncubatorScenario, IncubatorFrameAnswers, IncubatorPlanSection } from '@/types/assessment';

interface IncubatorBuildScreenProps {
  scenario: IncubatorScenario;
  frameAnswers: IncubatorFrameAnswers;
  planSections: Partial<IncubatorPlanSection>;
  onSectionUpdate: (sectionId: keyof IncubatorPlanSection, content: string) => void;
  totalWordCount: number;
  onComplete: () => void;
  logAction: (action: any) => void;
}

export const IncubatorBuildScreen = memo(({
  scenario,
  frameAnswers,
  planSections,
  onSectionUpdate,
  totalWordCount,
  onComplete,
  logAction,
}: IncubatorBuildScreenProps) => {
  const canProceed = totalWordCount >= 300 && totalWordCount <= 450;

  return (
    <div className="min-h-screen bg-background">
      {/* Split Screen Layout */}
      <div className="grid lg:grid-cols-2 gap-0 h-screen">
        {/* LEFT: AI Console */}
        <div className="border-r bg-muted/10 overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-background/95 backdrop-blur-sm">
            <h2 className="text-lg font-bold font-serif">Club AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Ask questions, run calculations, and get strategic feedback
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <IncubatorAIChat
              context={{
                scenario,
                frameAnswers,
                currentPlan: planSections,
              }}
              onInteraction={(interaction) => {
                logAction({
                  action_type: 'PROMPT',
                  prompt_text: interaction.message,
                  ai_response: interaction.response,
                  tool_used: interaction.tool,
                  tokens_used: interaction.tokens,
                });
              }}
            />
          </div>
        </div>

        {/* RIGHT: Plan Canvas */}
        <div className="overflow-y-auto">
          <div className="p-6">
            <IncubatorPlanCanvas
              sections={planSections}
              onSectionUpdate={onSectionUpdate}
              totalWordCount={totalWordCount}
            />

            {/* Proceed Button */}
            <div className="fixed bottom-6 right-6 z-20">
              <Button
                onClick={onComplete}
                disabled={!canProceed}
                size="lg"
                className="shadow-lg"
              >
                Proceed to Final Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!canProceed && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Need 300-450 words total to proceed
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

IncubatorBuildScreen.displayName = 'IncubatorBuildScreen';
