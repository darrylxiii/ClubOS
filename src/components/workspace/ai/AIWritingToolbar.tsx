import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Wand2, 
  Expand, 
  Languages, 
  Sparkles,
  Loader2,
  Briefcase,
  MessageCircle,
  Minimize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAIWriting } from '@/hooks/useAIWriting';

interface AIWritingToolbarProps {
  editorElement: HTMLElement | null;
  onApplyText: (newText: string) => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

const LANGUAGES = [
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
];

export function AIWritingToolbar({ editorElement, onApplyText }: AIWritingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  const { isLoading, improve, summarize, expand, translate, simplify, makeProfessional, makeCasual } = useAIWriting();

  const handleSelectionChange = useCallback(() => {
    if (!editorElement) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setIsVisible(false);
      setSelectedText('');
      return;
    }

    // Check if selection is within the editor
    const range = selection.getRangeAt(0);
    if (!editorElement.contains(range.commonAncestorContainer)) {
      setIsVisible(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setIsVisible(false);
      return;
    }

    setSelectedText(text);

    // Position toolbar above selection
    const rect = range.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    
    setPosition({
      top: rect.top - editorRect.top - 50,
      left: Math.max(0, rect.left - editorRect.left + (rect.width / 2) - 150),
    });
    
    setIsVisible(true);
  }, [editorElement]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const handleAction = async (action: () => Promise<string | null>) => {
    const result = await action();
    if (result) {
      onApplyText(result);
      setIsVisible(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleTranslate = async (language: string) => {
    setShowLanguageMenu(false);
    await handleAction(() => translate(selectedText, language));
  };

  if (!isVisible || isLoading) return null;

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "absolute z-50 flex items-center gap-1 p-1.5 rounded-lg",
        "bg-card/95 backdrop-blur-sm border border-border shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* QUIN branding */}
      <div className="flex items-center gap-1 px-2 border-r border-border mr-1">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium text-muted-foreground">QUIN</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-1">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-xs text-muted-foreground">Processing...</span>
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 hover:bg-accent/20"
            onClick={() => handleAction(() => improve(selectedText))}
            title="Improve writing"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Improve
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 hover:bg-accent/20"
            onClick={() => handleAction(() => summarize(selectedText))}
            title="Summarize text"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            Summarize
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 hover:bg-accent/20"
            onClick={() => handleAction(() => expand(selectedText))}
            title="Expand with more detail"
          >
            <Expand className="h-3.5 w-3.5" />
            Expand
          </Button>

          <Popover open={showLanguageMenu} onOpenChange={setShowLanguageMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5 hover:bg-accent/20"
                title="Translate"
              >
                <Languages className="h-3.5 w-3.5" />
                Translate
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1" align="start">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang.code}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => handleTranslate(lang.name)}
                >
                  {lang.name}
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 hover:bg-accent/20"
            onClick={() => handleAction(() => makeProfessional(selectedText))}
            title="Make professional"
          >
            <Briefcase className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 hover:bg-accent/20"
            onClick={() => handleAction(() => makeCasual(selectedText))}
            title="Make casual"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive/20"
            onClick={() => setIsVisible(false)}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
