import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PressureCookerTask, PressureCookerAction, PressureCookerResult } from '@/types/assessment';
import { OPTIMAL_TASK_ORDER } from '@/data/pressureCookerScenarios';
import { useToast } from '@/hooks/use-toast';

export function usePressureCookerSession(scenarioKey: string, tasks: PressureCookerTask[]) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTasks, setCurrentTasks] = useState<PressureCookerTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [actions, setActions] = useState<PressureCookerAction[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pressure_cooker_sessions')
        .insert({
          user_id: user.id,
          scenario_seed: scenarioKey,
          tasks_presented: tasks as any,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        toast({ title: 'Error', description: 'Failed to start assessment', variant: 'destructive' });
      } else {
        setSessionId(data.id);
        setStartTime(Date.now());
      }
    };

    initSession();
  }, [scenarioKey, tasks, toast]);

  const addVisibleTask = useCallback((task: PressureCookerTask) => {
    setCurrentTasks(prev => {
      if (prev.find(t => t.id === task.id)) return prev;
      return [...prev, task];
    });
  }, []);

  const logAction = useCallback(async (action: PressureCookerAction) => {
    if (!sessionId) return;

    setActions(prev => [...prev, action]);

    await supabase.from('pressure_cooker_actions').insert({
      session_id: sessionId,
      task_id: action.taskId,
      action: action.action,
      timestamp_ms: action.timestamp,
      time_spent_ms: action.timeSpent,
      quality_score: action.quality,
      notes: action.notes
    });
  }, [sessionId]);

  const handleTaskAction = useCallback((
    taskId: string,
    actionType: PressureCookerAction['action'],
    quality?: number,
    notes?: string,
    delegationTarget?: string,
    responseTemplate?: string
  ) => {
    const now = Date.now();
    const taskStartTime = startTime;
    
    const action: PressureCookerAction = {
      taskId,
      action: actionType,
      timestamp: now,
      timeSpent: now - taskStartTime,
      quality,
      notes,
      delegationTarget: delegationTarget as any,
      responseTemplate: responseTemplate as any
    };

    logAction(action);

    if (actionType === 'complete') {
      setCompletedTaskIds(prev => new Set([...prev, taskId]));
    }

    // Check for triggered escalations
    const task = tasks.find(t => t.id === taskId);
    if (task?.triggersEscalation) {
      const { taskId: escalationTaskId, delaySeconds, condition } = task.triggersEscalation;
      
      if (
        (condition === 'skip' && actionType === 'skip') ||
        (condition === 'defer' && actionType === 'defer') ||
        (condition === 'low_quality' && quality && quality < 60)
      ) {
        // Schedule the escalation task
        setTimeout(() => {
          const escalationTask = tasks.find(t => t.id === escalationTaskId);
          if (escalationTask) {
            addVisibleTask({ ...escalationTask, arrivalTime: Date.now() / 1000 });
          }
        }, delaySeconds * 1000);
      }
    }

    setStartTime(now);
  }, [startTime, logAction, tasks, addVisibleTask]);

  const calculateResults = useCallback((): PressureCookerResult => {
    const completedTasks = actions.filter(a => a.action === 'complete').length;
    const totalTasks = tasks.length;
    const completionRate = (completedTasks / totalTasks) * 100;

    // Calculate prioritization accuracy
    const optimalOrder = OPTIMAL_TASK_ORDER(tasks);
    const completedTaskIds = actions.filter(a => a.action === 'complete').map(a => a.taskId);
    const optimalTaskIds = optimalOrder.map(t => t.id);
    
    let prioritizationScore = 0;
    completedTaskIds.forEach((taskId, idx) => {
      const optimalIdx = optimalTaskIds.indexOf(taskId);
      if (optimalIdx !== -1) {
        const diff = Math.abs(idx - optimalIdx);
        prioritizationScore += Math.max(0, 10 - diff);
      }
    });
    const prioritizationAccuracy = completedTasks > 0 ? (prioritizationScore / (completedTasks * 10)) * 100 : 0;

    // Calculate stress handling (did they slow down under pressure?)
    const firstHalf = actions.slice(0, Math.floor(actions.length / 2));
    const secondHalf = actions.slice(Math.floor(actions.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.timeSpent, 0) / (firstHalf.length || 1);
    const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.timeSpent, 0) / (secondHalf.length || 1);
    const stressHandling = secondHalfAvg < firstHalfAvg * 1.5 ? 90 : 70;

    // Calculate multitasking ability (variety of actions)
    const actionTypes = new Set(actions.map(a => a.action));
    const multitaskingAbility = (actionTypes.size / 6) * 100; // Now 6 action types

    // Calculate decision quality (average quality scores)
    const qualityScores = actions.filter(a => a.quality).map(a => a.quality!);
    const decisionQuality = qualityScores.length > 0
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
      : 75;

    // Calculate focus management (based on quality maintenance)
    const avgQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length 
      : 75;
    const qualityVariance = qualityScores.length > 1
      ? Math.sqrt(qualityScores.reduce((sum, q) => sum + Math.pow(q - avgQuality, 2), 0) / qualityScores.length)
      : 0;
    const focusManagement = Math.max(0, 100 - qualityVariance);

    // Calculate dependency awareness
    const tasksWithDeps = tasks.filter(t => t.dependencies && t.dependencies.length > 0);
    let depsHandledCorrectly = 0;
    tasksWithDeps.forEach(task => {
      const taskActionIdx = actions.findIndex(a => a.taskId === task.id);
      if (taskActionIdx !== -1) {
        const allDepsHandled = task.dependencies!.every(depId => {
          const depActionIdx = actions.findIndex(a => a.taskId === depId);
          return depActionIdx !== -1 && depActionIdx < taskActionIdx;
        });
        if (allDepsHandled) depsHandledCorrectly++;
      }
    });
    const dependencyAwareness = tasksWithDeps.length > 0 
      ? (depsHandledCorrectly / tasksWithDeps.length) * 100 
      : 100;

    // Calculate stakeholder savvy (did they handle demanding personalities appropriately?)
    const demandingTasks = tasks.filter(t => t.senderPersonality === 'demanding' || t.senderPersonality === 'impatient');
    const demandingActions = actions.filter(a => {
      const task = tasks.find(t => t.id === a.taskId);
      return task && (task.senderPersonality === 'demanding' || task.senderPersonality === 'impatient');
    });
    const demandingHandledWell = demandingActions.filter(a => 
      a.action === 'complete' || a.action === 'escalate'
    ).length;
    const stakeholderSavvy = demandingTasks.length > 0
      ? (demandingHandledWell / demandingTasks.length) * 100
      : 100;

    // Determine quality vs speed preference
    let qualityVsSpeed: 'perfectionist' | 'balanced' | 'speed-focused' = 'balanced';
    if (avgQuality > 85 && completionRate < 60) {
      qualityVsSpeed = 'perfectionist';
    } else if (avgQuality < 70 && completionRate > 75) {
      qualityVsSpeed = 'speed-focused';
    }

    // Determine communication style
    const delegations = actions.filter(a => a.action === 'delegate').length;
    const escalations = actions.filter(a => a.action === 'escalate').length;
    const notesCount = actions.filter(a => a.notes && a.notes.length > 0).length;
    const avgNotesLength = actions
      .filter(a => a.notes)
      .reduce((sum, a) => sum + a.notes!.length, 0) / (notesCount || 1);

    let communicationStyle = 'collaborative';
    if (avgNotesLength < 20) communicationStyle = 'brief';
    else if (avgNotesLength > 100) communicationStyle = 'detailed';
    else if (delegations > totalTasks * 0.3) communicationStyle = 'delegator';

    // Determine archetype
    let archetype = 'Methodical Executor';
    if (completionRate > 80 && stressHandling > 85) {
      archetype = 'Chaos Navigator';
    } else if (delegations > totalTasks * 0.4) {
      archetype = 'Strategic Delegator';
    } else if (avgQuality > 85) {
      archetype = 'Quality Guardian';
    } else if (prioritizationAccuracy > 85) {
      archetype = 'Priority Master';
    }

    // Simulate outcomes
    const criticalTasksCompleted = actions.filter(a => {
      const task = tasks.find(t => t.id === a.taskId);
      return task && task.urgency === 'critical' && a.action === 'complete';
    }).length;
    const criticalTasksTotal = tasks.filter(t => t.urgency === 'critical').length;
    
    const projectDelay = Math.max(0, (criticalTasksTotal - criticalTasksCompleted) * 0.5);
    const teamSatisfaction = Math.min(100, (completionRate + stakeholderSavvy) / 2);
    const costImpact = criticalTasksCompleted * 5000 - (criticalTasksTotal - criticalTasksCompleted) * 8000;

    const avgResponseTime = actions.reduce((sum, a) => sum + a.timeSpent, 0) / (actions.length || 1);

    const recommendations = [];
    if (completionRate < 50) recommendations.push('Focus on completing more tasks');
    if (prioritizationAccuracy < 60) recommendations.push('Work on prioritization skills');
    if (stressHandling < 75) recommendations.push('Practice stress management techniques');
    if (multitaskingAbility < 60) recommendations.push('Try more diverse action types');
    if (dependencyAwareness < 70) recommendations.push('Pay attention to task dependencies');
    if (stakeholderSavvy < 70) recommendations.push('Adapt communication style to stakeholder personalities');

    return {
      completionRate,
      prioritizationAccuracy,
      stressHandling,
      multitaskingAbility,
      decisionQuality,
      communicationStyle,
      tasksCompleted: completedTasks,
      totalTasks,
      avgResponseTime,
      recommendations,
      focusManagement,
      dependencyAwareness,
      stakeholderSavvy,
      qualityVsSpeed,
      archetype,
      outcomeSimulation: {
        projectDelay,
        teamSatisfaction,
        costImpact
      }
    };
  }, [actions, tasks]);

  const submitAssessment = useCallback(async () => {
    if (!sessionId || isSubmitting) return;

    setIsSubmitting(true);
    const results = calculateResults();

    try {
      await supabase
        .from('pressure_cooker_sessions')
        .update({
          completed_at: new Date().toISOString(),
          total_tasks: results.totalTasks,
          completed_tasks: results.tasksCompleted,
          completion_rate: results.completionRate,
          avg_response_time_ms: results.avgResponseTime,
          prioritization_accuracy: results.prioritizationAccuracy,
          stress_handling_score: results.stressHandling,
          multitasking_ability: results.multitaskingAbility,
          decision_quality: results.decisionQuality,
          communication_style: results.communicationStyle
        })
        .eq('id', sessionId);

      // Save to assessment_results
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase.from('assessment_results') as any).insert({
          user_id: user.id,
          assessment_id: 'pressure_cooker',
          assessment_name: 'Pressure Cooker',
          assessment_type: 'skills',
          score: (results.completionRate + results.prioritizationAccuracy) / 2,
          results_data: results
        });
      }

      toast({ title: 'Success', description: 'Assessment completed!' });
      return results;
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      toast({ title: 'Error', description: 'Failed to save results', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, isSubmitting, calculateResults, toast]);

  return {
    sessionId,
    currentTasks,
    completedTaskIds,
    actions,
    addVisibleTask,
    handleTaskAction,
    submitAssessment,
    isSubmitting
  };
}
