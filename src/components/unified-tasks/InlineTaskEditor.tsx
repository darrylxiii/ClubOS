import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface InlineTaskEditorProps {
  taskId: string;
  field: 'title' | 'description';
  value: string;
  onSave: () => void;
  onCancel: () => void;
}

export const InlineTaskEditor = ({ 
  taskId, 
  field, 
  value: initialValue, 
  onSave, 
  onCancel 
}: InlineTaskEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (inputRef.current instanceof HTMLInputElement) {
      inputRef.current.select();
    }
  }, []);

  const handleSave = async () => {
    if (value.trim() === initialValue) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .update({ [field]: value.trim() })
        .eq("id", taskId);

      if (error) throw error;
      
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
      onSave();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (field === 'description') {
    return (
      <div className="relative">
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={saving}
          className="min-h-[80px] pr-16"
          placeholder="Add description..."
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1 rounded hover:bg-green-500/20 text-green-600"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="p-1 rounded hover:bg-red-500/20 text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        disabled={saving}
        className="pr-16"
      />
      <div className="absolute right-2 flex gap-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 rounded hover:bg-green-500/20 text-green-600"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="p-1 rounded hover:bg-red-500/20 text-red-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
