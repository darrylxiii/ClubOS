import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText;
      
      // Extract plain text with basic formatting markers
      const formattedText = text;
      onChange(formattedText);
    }
  };

  const handleFocus = () => {
    setShowToolbar(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't hide toolbar if clicking on a toolbar button
    if (e.relatedTarget?.closest('.rich-text-toolbar')) {
      return;
    }
    setTimeout(() => setShowToolbar(false), 200);
  };

  return (
    <div className={cn("relative", className)}>
      {showToolbar && (
        <div className="rich-text-toolbar flex items-center gap-1 p-2 border-b bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => execCommand('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => execCommand('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => execCommand('insertUnorderedList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) execCommand('createLink', url);
            }}
            title="Add Link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "min-h-[80px] p-3 outline-none",
          "prose prose-sm max-w-none",
          !value && "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        )}
        data-placeholder={placeholder || "What do you want to talk about?"}
        suppressContentEditableWarning
      />
    </div>
  );
}
