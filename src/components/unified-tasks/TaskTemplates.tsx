import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  default_priority: string;
  default_task_type: string;
  default_estimated_minutes: number | null;
}

interface TaskTemplatesProps {
  onApply: (template: TaskTemplate) => void;
  currentTask?: { title: string; description: string | null; priority: string; task_type: string; estimated_duration_minutes: number | null };
}

export function TaskTemplates({ onApply, currentTask }: TaskTemplatesProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await (supabase.from("task_templates") as any)
      .select("id, name, description, default_priority, default_task_type, default_estimated_minutes")
      .order("created_at", { ascending: false })
      .limit(20);
    setTemplates((data as TaskTemplate[]) || []);
    setLoading(false);
  };

  const saveAsTemplate = async () => {
    if (!newName.trim() || !user || !currentTask) return;
    setSaving(true);
    const { error } = await (supabase.from("task_templates") as any).insert({
      name: newName.trim(),
      description: currentTask.description,
      default_priority: currentTask.priority || "medium",
      default_task_type: currentTask.task_type || "general",
      default_estimated_minutes: currentTask.estimated_duration_minutes,
      created_by: user.id,
    });
    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success("Template saved");
      setNewName("");
      loadTemplates();
    }
    setSaving(false);
  };

  const deleteTemplate = async (id: string) => {
    await (supabase.from("task_templates") as any).delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <FileText className="h-3.5 w-3.5" />
                Templates
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Task Templates</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Task Templates</h4>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No templates yet. Save a task as a template to reuse it.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer group transition-colors"
                  onClick={() => { onApply(tpl); setOpen(false); toast.success(`Applied "${tpl.name}"`); }}
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">{tpl.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{tpl.default_priority} · {tpl.default_task_type}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {currentTask && (
            <div className="border-t pt-2 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Save current as template</p>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Template name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && saveAsTemplate()}
                />
                <Button size="sm" className="h-8 px-2.5" onClick={saveAsTemplate} disabled={!newName.trim() || saving}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
