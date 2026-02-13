import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface Instruction {
  id: string;
  instruction: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export default function AgentInstructionsPanel({ agentName }: { agentName: string }) {
  const { user } = useAuth();
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [newInstruction, setNewInstruction] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('agent_instructions')
        .select('*')
        .eq('agent_name', agentName)
        .order('priority', { ascending: false });
      if (data) setInstructions(data);
      setLoading(false);
    };
    load();
  }, [agentName]);

  const addInstruction = async () => {
    if (!newInstruction.trim() || !user?.id) return;
    const { data, error } = await supabase
      .from('agent_instructions')
      .insert({
        agent_name: agentName,
        instruction: newInstruction.trim(),
        priority: instructions.length,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add instruction');
      return;
    }
    if (data) setInstructions((prev) => [data, ...prev]);
    setNewInstruction('');
    toast.success('Instruction added');
  };

  const toggleInstruction = async (id: string, isActive: boolean) => {
    await supabase
      .from('agent_instructions')
      .update({ is_active: !isActive })
      .eq('id', id);
    setInstructions((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_active: !isActive } : i))
    );
  };

  const deleteInstruction = async (id: string) => {
    await supabase.from('agent_instructions').delete().eq('id', id);
    setInstructions((prev) => prev.filter((i) => i.id !== id));
    toast.success('Instruction removed');
  };

  return (
    <Card variant="static" className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          Standing Instructions for {agentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-muted/20 border border-border/30 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g., Only source candidates with 5+ years for senior roles"
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addInstruction()}
          />
          <Button size="sm" variant="primary" onClick={addInstruction} disabled={!newInstruction.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Instructions list */}
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : instructions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No instructions yet. Add one above to guide this agent.
          </p>
        ) : (
          <div className="space-y-1.5">
            {instructions.map((inst) => (
              <div
                key={inst.id}
                className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-opacity ${
                  inst.is_active
                    ? 'border-border/30 bg-card/20'
                    : 'border-border/10 bg-muted/10 opacity-50'
                }`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span className="flex-1 text-xs">{inst.instruction}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleInstruction(inst.id, inst.is_active)}
                >
                  <Badge
                    variant={inst.is_active ? 'default' : 'outline'}
                    className="text-[9px] cursor-pointer"
                  >
                    {inst.is_active ? 'ON' : 'OFF'}
                  </Badge>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => deleteInstruction(inst.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
