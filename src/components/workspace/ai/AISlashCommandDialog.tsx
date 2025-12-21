import { useState } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAIWriting } from '@/hooks/useAIWriting';

interface AISlashCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertText: (text: string) => void;
  context?: string;
}

const QUICK_PROMPTS = [
  { label: 'Write an introduction', prompt: 'Write a compelling introduction paragraph for this document' },
  { label: 'Create a summary', prompt: 'Write a summary of the key points' },
  { label: 'Draft a conclusion', prompt: 'Write a professional conclusion' },
  { label: 'Brainstorm ideas', prompt: 'Generate 5 creative ideas related to this topic' },
  { label: 'Create an outline', prompt: 'Create a structured outline for this content' },
  { label: 'Write bullet points', prompt: 'Convert the following into clear bullet points' },
];

export function AISlashCommandDialog({ 
  open, 
  onOpenChange, 
  onInsertText,
  context 
}: AISlashCommandDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const { isLoading, generate } = useAIWriting();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    const result = await generate(prompt, context);
    if (result) {
      setGeneratedText(result);
    }
  };

  const handleInsert = () => {
    if (generatedText) {
      onInsertText(generatedText);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setGeneratedText('');
    onOpenChange(false);
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Ask QUIN to Write
          </DialogTitle>
          <DialogDescription>
            Tell QUIN what you want to write and it will generate content for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <Button
                key={qp.label}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickPrompt(qp.prompt)}
                disabled={isLoading}
              >
                {qp.label}
              </Button>
            ))}
          </div>

          {/* Prompt input */}
          <div className="relative">
            <Textarea
              placeholder="e.g., Write a paragraph about the benefits of remote work..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] pr-12 resize-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handleGenerate();
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 bottom-2 h-8 w-8"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Generated text preview */}
          {generatedText && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Generated Content:
              </div>
              <div className="max-h-[200px] overflow-y-auto p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                {generatedText}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGeneratedText('')}
                >
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  onClick={handleInsert}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Insert
                </Button>
              </div>
            </div>
          )}

          {/* Keyboard shortcut hint */}
          <div className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted">⌘ Enter</kbd> to generate
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
