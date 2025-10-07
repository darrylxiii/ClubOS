import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Edit2, Lock, Globe, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface InlineEditProps {
  value: string;
  onSave: (value: string, visibility?: string) => Promise<void>;
  placeholder?: string;
  type?: "text" | "textarea";
  className?: string;
  editClassName?: string;
  showPrivacy?: boolean;
  currentVisibility?: "public" | "club_only" | "private";
  aiSuggestion?: string;
  label?: string;
}

export function InlineEdit({
  value,
  onSave,
  placeholder,
  type = "text",
  className,
  editClassName,
  showPrivacy = false,
  currentVisibility = "public",
  aiSuggestion,
  label,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [visibility, setVisibility] = useState(currentVisibility);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === "textarea") {
        const textarea = inputRef.current as HTMLTextAreaElement;
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  }, [isEditing, type]);

  const handleSave = async () => {
    if (editValue === value && visibility === currentVisibility) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue, visibility);
      toast.success("✓ Updated", {
        description: "Changes saved successfully",
        duration: 2000,
      });
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to save", {
        description: "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setVisibility(currentVisibility);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    if (e.key === "Enter" && type === "text" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      setEditValue(aiSuggestion);
      toast.success("AI suggestion applied", {
        icon: <Sparkles className="w-4 h-4 text-accent" />,
      });
    }
  };

  const visibilityIcons = {
    public: <Globe className="w-3 h-3" />,
    club_only: <Users className="w-3 h-3" />,
    private: <Lock className="w-3 h-3" />,
  };

  if (!isEditing) {
    return (
      <div className="group relative">
        <div
          onClick={() => setIsEditing(true)}
          className={cn(
            "cursor-pointer rounded-lg transition-all hover:bg-accent/10 p-2 -m-2",
            "border border-transparent hover:border-accent/30",
            className
          )}
        >
          {value || <span className="text-muted-foreground italic">{placeholder}</span>}
        </div>
        <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0 glass backdrop-blur-xl border border-accent/30"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          {showPrivacy && (
            <div className="h-6 px-2 flex items-center gap-1 glass backdrop-blur-xl border border-accent/30 rounded-md text-xs">
              {visibilityIcons[currentVisibility]}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-scale-in">
      {label && (
        <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>{label}</span>
          {aiSuggestion && (
            <Button
              size="sm"
              variant="ghost"
              onClick={applyAISuggestion}
              className="h-6 text-xs gap-1 text-accent"
            >
              <Sparkles className="w-3 h-3" />
              AI Suggest
            </Button>
          )}
        </div>
      )}
      
      <div className="relative">
        {type === "text" ? (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn("glass backdrop-blur-xl border-2 border-accent", editClassName)}
            disabled={isSaving}
          />
        ) : (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn("glass backdrop-blur-xl border-2 border-accent min-h-[100px]", editClassName)}
            disabled={isSaving}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1"
          >
            <Check className="w-4 h-4" />
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </div>

        {showPrivacy && (
          <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
            <SelectTrigger className="w-[140px] h-8 glass border-accent/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass backdrop-blur-xl border-accent/30">
              <SelectItem value="public" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Public
                </div>
              </SelectItem>
              <SelectItem value="club_only" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Club Only
                </div>
              </SelectItem>
              <SelectItem value="private" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Private
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {type === "text" && (
        <p className="text-xs text-muted-foreground">
          Press Enter to save, Esc to cancel
        </p>
      )}
    </div>
  );
}
