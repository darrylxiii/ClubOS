import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AssignAgentTaskSchema = z.object({
    description: z.string(),
    priority: z.number().min(1).max(10).default(5),
    required_skills: z.array(z.string()).optional(),
    task_type: z.string().default('delegation'),
    metadata: z.record(z.any()).optional(),
});

interface ActionContext {
    payload: any;
    supabase: any; // SupabaseClient
    userId: string | null;
}

export async function handleAssignAgentTask({ payload, supabase, userId }: ActionContext) {
    const { description, priority, required_skills, task_type, metadata } = AssignAgentTaskSchema.parse(payload);

    if (!userId) {
        throw new Error("Unauthorized: User ID required for task assignment");
    }

    try {
        // 1. Fetch active agents
        const { data: agents, error: agentsError } = await supabase
            .from('agent_profiles')
            .select('id, agent_name, display_name, capabilities')
            .eq('is_active', true);

        if (agentsError) throw agentsError;
        if (!agents || agents.length === 0) throw new Error("No active agents found");

        // 2. Filter by required skills (if any)
        // This is a simple exact match containment or intersection logic.
        // For 'required_skills', let's say the agent MUST have ALL of them? Or at least ONE?
        // Let's go with: Agent must have ALL required skills.
        let candidates = agents;
        if (required_skills && required_skills.length > 0) {
            candidates = agents.filter((agent: any) =>
                required_skills.every(skill => agent.capabilities?.includes(skill))
            );
        }

        // Fallback: If no agent has ALL skills, try finding agent with ANY skill
        if (candidates.length === 0 && required_skills && required_skills.length > 0) {
            candidates = agents.filter((agent: any) =>
                required_skills.some(skill => agent.capabilities?.includes(skill))
            );
        }

        // Final Fallback: If still nobody, use all active agents (Round Robin fallback)
        if (candidates.length === 0) {
            candidates = agents;
        }

        // 3. Get Load for candidates
        const candidateIds = candidates.map((c: any) => c.id);
        const { data: loadData, error: loadError } = await supabase
            .from('agent_tasks')
            .select('assigned_agent_id')
            .in('assigned_agent_id', candidateIds)
            .in('status', ['pending', 'active']); // Only count active work

        if (loadError) throw loadError;

        // Calculate load map
        const loadMap = new Map<string, number>();
        candidates.forEach((c: any) => loadMap.set(c.id, 0));

        loadData?.forEach((task: any) => {
            const current = loadMap.get(task.assigned_agent_id) || 0;
            loadMap.set(task.assigned_agent_id, current + 1);
        });

        // 4. Sort candidates by Load (Ascending)
        candidates.sort((a: any, b: any) => {
            return (loadMap.get(a.id) || 0) - (loadMap.get(b.id) || 0);
        });

        const bestAgent = candidates[0];

        // 5. Create the Task
        const { data: newTask, error: createError } = await supabase
            .from('agent_tasks')
            .insert({
                user_id: userId,
                assigned_agent_id: bestAgent.id,
                task_type,
                description,
                priority,
                status: 'pending',
                metadata: {
                    ...metadata,
                    assigned_via: 'intelligent_dispatch',
                    required_skills,
                    agent_load_at_assignment: loadMap.get(bestAgent.id)
                }
            })
            .select()
            .single();

        if (createError) throw createError;

        return {
            success: true,
            task: newTask,
            assigned_agent: bestAgent
        };

    } catch (error) {
        console.error('Assign Task Error:', error);
        throw error;
    }
}
