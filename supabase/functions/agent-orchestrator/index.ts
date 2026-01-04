import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrchestrationRequest {
  operation: 'create_goal' | 'update_goal' | 'delegate_task' | 'get_agent_status' | 'execute_plan' | 'check_goal_progress';
  userId: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, userId, data } = await req.json() as OrchestrationRequest;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any;

    switch (operation) {
      case 'create_goal':
        result = await createGoal(supabase, userId, data);
        break;
      case 'update_goal':
        result = await updateGoal(supabase, userId, data);
        break;
      case 'delegate_task':
        result = await delegateTask(supabase, userId, data);
        break;
      case 'get_agent_status':
        result = await getAgentStatus(supabase, userId);
        break;
      case 'execute_plan':
        result = await executePlan(supabase, userId, data);
        break;
      case 'check_goal_progress':
        result = await checkGoalProgress(supabase, userId, data);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Agent Orchestrator error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Create a new goal with execution plan
async function createGoal(supabase: any, userId: string, data: any) {
  const { 
    goalType, 
    goalDescription, 
    targetEntityType, 
    targetEntityId, 
    successCriteria, 
    deadline, 
    priority = 5 
  } = data;

  // Generate execution plan based on goal type
  const executionPlan = await generateExecutionPlan(goalType, goalDescription, successCriteria);

  const { data: goal, error } = await supabase
    .from('agent_goals')
    .insert({
      user_id: userId,
      goal_type: goalType,
      goal_description: goalDescription,
      target_entity_type: targetEntityType,
      target_entity_id: targetEntityId,
      success_criteria: successCriteria || {},
      deadline,
      priority,
      assigned_agents: executionPlan.assignedAgents,
      execution_plan: executionPlan,
      next_action_at: new Date().toISOString(),
      next_action_description: executionPlan.steps[0]?.description || 'Initialize goal'
    })
    .select()
    .single();

  if (error) throw error;

  // Log the decision
  await supabase.from('agent_decision_log').insert({
    agent_name: 'quin',
    user_id: userId,
    decision_type: 'create_goal',
    decision_made: `Created goal: ${goalDescription}`,
    reasoning: { goalType, executionPlan },
    confidence_score: 0.9,
    affected_entities: { goal_id: goal.id }
  });

  // Create initial progress entry
  await supabase.from('agent_goal_progress').insert({
    goal_id: goal.id,
    action_taken: 'Goal created and execution plan generated',
    agent_name: 'quin',
    outcome: 'success',
    progress_delta: 0
  });

  return { success: true, goal, executionPlan };
}

// Generate execution plan based on goal type
async function generateExecutionPlan(goalType: string, description: string, criteria: any) {
  const planTemplates: Record<string, any> = {
    fill_role: {
      steps: [
        { id: 1, description: 'Analyze role requirements', agent: 'analytics_agent', status: 'pending' },
        { id: 2, description: 'Source qualified candidates', agent: 'sourcing_agent', status: 'pending' },
        { id: 3, description: 'Match and rank candidates', agent: 'sourcing_agent', status: 'pending' },
        { id: 4, description: 'Initiate engagement', agent: 'engagement_agent', status: 'pending' },
        { id: 5, description: 'Prepare interview materials', agent: 'interview_agent', status: 'pending' },
        { id: 6, description: 'Track and optimize pipeline', agent: 'analytics_agent', status: 'pending' }
      ],
      assignedAgents: ['quin', 'sourcing_agent', 'engagement_agent', 'interview_agent', 'analytics_agent']
    },
    increase_pipeline: {
      steps: [
        { id: 1, description: 'Analyze current pipeline health', agent: 'analytics_agent', status: 'pending' },
        { id: 2, description: 'Identify sourcing gaps', agent: 'sourcing_agent', status: 'pending' },
        { id: 3, description: 'Expand candidate pool', agent: 'sourcing_agent', status: 'pending' },
        { id: 4, description: 'Re-engage dormant candidates', agent: 'engagement_agent', status: 'pending' },
        { id: 5, description: 'Monitor pipeline velocity', agent: 'analytics_agent', status: 'pending' }
      ],
      assignedAgents: ['quin', 'sourcing_agent', 'engagement_agent', 'analytics_agent']
    },
    engage_company: {
      steps: [
        { id: 1, description: 'Research company context', agent: 'partner_agent', status: 'pending' },
        { id: 2, description: 'Identify key stakeholders', agent: 'partner_agent', status: 'pending' },
        { id: 3, description: 'Draft outreach strategy', agent: 'engagement_agent', status: 'pending' },
        { id: 4, description: 'Execute engagement plan', agent: 'engagement_agent', status: 'pending' },
        { id: 5, description: 'Track relationship health', agent: 'partner_agent', status: 'pending' }
      ],
      assignedAgents: ['quin', 'partner_agent', 'engagement_agent']
    },
    custom: {
      steps: [
        { id: 1, description: 'Analyze goal requirements', agent: 'quin', status: 'pending' },
        { id: 2, description: 'Create action plan', agent: 'quin', status: 'pending' },
        { id: 3, description: 'Execute and monitor', agent: 'quin', status: 'pending' }
      ],
      assignedAgents: ['quin']
    }
  };

  return planTemplates[goalType] || planTemplates.custom;
}

// Update goal status and progress
async function updateGoal(supabase: any, userId: string, data: any) {
  const { goalId, status, currentProgress, nextActionAt, nextActionDescription } = data;

  const updateData: any = { updated_at: new Date().toISOString() };
  if (status) updateData.status = status;
  if (currentProgress !== undefined) updateData.current_progress = currentProgress;
  if (nextActionAt) updateData.next_action_at = nextActionAt;
  if (nextActionDescription) updateData.next_action_description = nextActionDescription;

  const { data: goal, error } = await supabase
    .from('agent_goals')
    .update(updateData)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return { success: true, goal };
}

// Delegate a task to a specialized agent
async function delegateTask(supabase: any, userId: string, data: any) {
  const { parentAgent, childAgent, taskDescription, taskData } = data;

  // Verify the child agent exists and is active
  const { data: agent } = await supabase
    .from('agent_registry')
    .select('*')
    .eq('agent_name', childAgent)
    .eq('is_active', true)
    .single();

  if (!agent) {
    throw new Error(`Agent ${childAgent} not found or inactive`);
  }

  // Check if the agent has the required capability
  const hasCapability = taskData.requiredCapability
    ? agent.capabilities.includes(taskData.requiredCapability)
    : true;

  if (!hasCapability) {
    throw new Error(`Agent ${childAgent} lacks required capability: ${taskData.requiredCapability}`);
  }

  // Create delegation
  const { data: delegation, error } = await supabase
    .from('agent_delegations')
    .insert({
      parent_agent: parentAgent,
      child_agent: childAgent,
      user_id: userId,
      task_description: taskDescription,
      task_data: taskData,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;

  // Log the decision
  await supabase.from('agent_decision_log').insert({
    agent_name: parentAgent,
    user_id: userId,
    decision_type: 'delegate_task',
    decision_made: `Delegated task to ${childAgent}`,
    reasoning: { taskDescription, childAgentCapabilities: agent.capabilities },
    confidence_score: 0.85,
    affected_entities: { delegation_id: delegation.id }
  });

  return { success: true, delegation, agent };
}

// Get status of all agents and their delegations
async function getAgentStatus(supabase: any, userId: string) {
  const [agentsResult, delegationsResult, goalsResult] = await Promise.all([
    supabase.from('agent_registry').select('*').eq('is_active', true),
    supabase
      .from('agent_delegations')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress'])
      .order('delegated_at', { ascending: false }),
    supabase
      .from('agent_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
  ]);

  // Calculate workload per agent
  const agentWorkload = (agentsResult.data || []).map((agent: any) => {
    const activeDelegations = (delegationsResult.data || []).filter(
      (d: any) => d.child_agent === agent.agent_name
    );
    const activeGoals = (goalsResult.data || []).filter(
      (g: any) => g.assigned_agents?.includes(agent.agent_name)
    );

    return {
      ...agent,
      activeDelegations: activeDelegations.length,
      activeGoals: activeGoals.length,
      workloadLevel: activeDelegations.length > 5 ? 'high' : activeDelegations.length > 2 ? 'medium' : 'low'
    };
  });

  return { success: true, agents: agentWorkload };
}

// Execute the next step in a goal's plan
async function executePlan(supabase: any, userId: string, data: any) {
  const { goalId } = data;

  // Get the goal
  const { data: goal, error: goalError } = await supabase
    .from('agent_goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (goalError || !goal) throw new Error('Goal not found');

  const plan = goal.execution_plan;
  if (!plan || !plan.steps) throw new Error('No execution plan found');

  // Find the next pending step
  const nextStep = plan.steps.find((s: any) => s.status === 'pending');
  if (!nextStep) {
    // All steps complete - mark goal as completed
    await supabase
      .from('agent_goals')
      .update({ status: 'completed', current_progress: 100 })
      .eq('id', goalId);

    return { success: true, message: 'All steps completed', goalCompleted: true };
  }

  // Delegate to the appropriate agent
  await delegateTask(supabase, userId, {
    parentAgent: 'quin',
    childAgent: nextStep.agent,
    taskDescription: nextStep.description,
    taskData: { goalId, stepId: nextStep.id, goalType: goal.goal_type }
  });

  // Update step status
  nextStep.status = 'in_progress';
  const updatedSteps = plan.steps.map((s: any) => 
    s.id === nextStep.id ? nextStep : s
  );

  // Calculate progress
  const completedSteps = updatedSteps.filter((s: any) => s.status === 'completed').length;
  const progress = (completedSteps / updatedSteps.length) * 100;

  await supabase
    .from('agent_goals')
    .update({
      execution_plan: { ...plan, steps: updatedSteps },
      current_progress: progress,
      next_action_description: nextStep.description
    })
    .eq('id', goalId);

  // Log progress
  await supabase.from('agent_goal_progress').insert({
    goal_id: goalId,
    action_taken: `Started: ${nextStep.description}`,
    agent_name: nextStep.agent,
    outcome: 'in_progress',
    progress_delta: 0
  });

  return { success: true, currentStep: nextStep, progress };
}

// Check progress on all active goals
async function checkGoalProgress(supabase: any, userId: string, data: any) {
  const { goalId } = data || {};

  let query = supabase
    .from('agent_goals')
    .select(`
      *,
      agent_goal_progress(*)
    `)
    .eq('user_id', userId);

  if (goalId) {
    query = query.eq('id', goalId);
  } else {
    query = query.eq('status', 'active');
  }

  const { data: goals, error } = await query.order('priority', { ascending: false });

  if (error) throw error;

  // Analyze each goal
  const goalsWithAnalysis = (goals || []).map((goal: any) => {
    const progress = goal.agent_goal_progress || [];
    const recentProgress = progress.slice(0, 5);
    
    const isStalled = goal.next_action_at && 
      new Date(goal.next_action_at) < new Date(Date.now() - 48 * 60 * 60 * 1000);

    const isAtRisk = goal.deadline && 
      new Date(goal.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
      goal.current_progress < 70;

    return {
      ...goal,
      recentProgress,
      isStalled,
      isAtRisk,
      recommendation: isStalled 
        ? 'Goal is stalled - consider reviewing blockers' 
        : isAtRisk 
          ? 'Goal at risk of missing deadline - consider prioritizing'
          : 'On track'
    };
  });

  return { success: true, goals: goalsWithAnalysis };
}
