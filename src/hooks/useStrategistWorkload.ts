import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, subDays, format } from "date-fns";

export type Period = 'weekly' | 'monthly' | 'quarterly' | 'annual';

function getPeriodStart(period: Period): string {
  const now = new Date();
  switch (period) {
    case 'weekly':
      return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'monthly':
      return format(startOfMonth(now), 'yyyy-MM-dd');
    case 'quarterly':
      return format(startOfQuarter(now), 'yyyy-MM-dd');
    case 'annual':
      return format(startOfYear(now), 'yyyy-MM-dd');
  }
}

export interface StrategistTarget {
  revenueTarget: number | null;
  revenueAchieved: number;
  placementsTarget: number | null;
  placementsAchieved: number;
  candidatesSourcedTarget: number | null;
  candidatesSourcedAchieved: number;
}

export interface StrategistRecentActivity {
  totalOutreach: number;
  totalCalls: number;
  totalEmails: number;
  totalMeetings: number;
}

export interface StrategistWorkload {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  title: string | null;
  companyCount: number;
  candidateCount: number;
  activeApplications: number;
  capacityPercent: number;
  maxCapacity: number;
  employeeId: string | null;
  activePipelines: number;
  candidatesSourced: number;
  placements: number;
  revenue: number;
  pipelineActions: number;
  lastActiveAt: string | null;
  performanceScore: number;
  rank: number;
  target: StrategistTarget | null;
  recentActivity: StrategistRecentActivity;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  current_title: string | null;
}

const MAX_COMPANY_CAPACITY = 25;
const MAX_CANDIDATE_CAPACITY = 50;

export function useStrategistWorkload(period: Period = 'monthly') {
  const periodStart = getPeriodStart(period);
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['strategist-workload', period],
    queryFn: async (): Promise<StrategistWorkload[]> => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'strategist']);

      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      const teamUserIds = [...new Set(roles.map(r => r.user_id))];

      const [
        profilesResult, employeeProfilesResult, companyAssignmentsResult,
        candidatesResult, applicationsResult, auditLogsResult,
        commissionsResult, targetsResult, activityResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url, current_title').in('id', teamUserIds).order('full_name'),
        supabase.from('employee_profiles').select('id, user_id').in('user_id', teamUserIds),
        supabase.from('company_strategist_assignments').select('strategist_id, company_id').eq('is_active', true),
        supabase.from('candidate_profiles').select('id, assigned_strategist_id').not('assigned_strategist_id', 'is', null),
        supabase.from('applications').select('id, sourced_by, status, candidate_id, created_at').not('sourced_by', 'is', null),
        supabase.from('pipeline_audit_logs').select('user_id, created_at').in('user_id', teamUserIds).gte('created_at', sevenDaysAgo),
        supabase.from('employee_commissions').select('employee_id, gross_amount').gte('created_at', periodStart),
        supabase.from('employee_targets').select('employee_id, candidates_sourced_target, candidates_sourced_achieved, placements_target, placements_achieved, revenue_target, revenue_achieved').lte('period_start', new Date().toISOString()).gte('period_end', new Date().toISOString()),
        supabase.from('recruiter_activity_metrics').select('user_id, outreach_count, calls_made, emails_sent, meetings_held').in('user_id', teamUserIds).gte('date', sevenDaysAgo),
      ]);

      const teamMembers = profilesResult.data || [];
      if (!teamMembers.length) return [];

      const employeeMap = new Map<string, string>();
      (employeeProfilesResult.data || []).forEach(ep => { employeeMap.set(ep.user_id, ep.id); });

      const candidatesByStrategist = new Map<string, string[]>();
      (candidatesResult.data || []).forEach(c => {
        if (!c.assigned_strategist_id) return;
        const list = candidatesByStrategist.get(c.assigned_strategist_id) || [];
        list.push(c.id);
        candidatesByStrategist.set(c.assigned_strategist_id, list);
      });

      const applications = applicationsResult.data || [];
      const appsBySourcer = new Map<string, typeof applications>();
      applications.forEach(a => {
        if (!a.sourced_by) return;
        const list = appsBySourcer.get(a.sourced_by) || [];
        list.push(a);
        appsBySourcer.set(a.sourced_by, list);
      });

      const auditLogs = auditLogsResult.data || [];
      const auditByUser = new Map<string, typeof auditLogs>();
      auditLogs.forEach(log => {
        const list = auditByUser.get(log.user_id) || [];
        list.push(log);
        auditByUser.set(log.user_id, list);
      });

      const commissionsByEmployee = new Map<string, number>();
      (commissionsResult.data || []).forEach(c => {
        const current = commissionsByEmployee.get(c.employee_id) || 0;
        commissionsByEmployee.set(c.employee_id, current + (c.gross_amount || 0));
      });

      const targetsByEmployee = new Map<string, (typeof targetsResult.data extends (infer T)[] | null ? T : never)>();
      (targetsResult.data || []).forEach(t => { targetsByEmployee.set(t.employee_id, t); });

      const activityByUser = new Map<string, StrategistRecentActivity>();
      (activityResult.data || []).forEach(a => {
        const current = activityByUser.get(a.user_id) || { totalOutreach: 0, totalCalls: 0, totalEmails: 0, totalMeetings: 0 };
        current.totalOutreach += a.outreach_count || 0;
        current.totalCalls += a.calls_made || 0;
        current.totalEmails += a.emails_sent || 0;
        current.totalMeetings += a.meetings_held || 0;
        activityByUser.set(a.user_id, current);
      });

      const activeStatuses = ['new', 'reviewing', 'shortlisted', 'interviewing'];

      const workloads: StrategistWorkload[] = teamMembers.map(member => {
        const employeeId = employeeMap.get(member.id) || null;
        const companyCount = (companyAssignmentsResult.data || []).filter(a => a.strategist_id === member.id).length;
        const assignedCandidateIds = candidatesByStrategist.get(member.id) || [];
        const candidateCount = assignedCandidateIds.length;
        const activeApplications = applications.filter(a => assignedCandidateIds.includes(a.candidate_id) && activeStatuses.includes(a.status)).length;

        const userApps = appsBySourcer.get(member.id) || [];
        const periodApps = userApps.filter(a => a.created_at >= periodStart);
        const candidatesSourced = periodApps.length;
        const placements = periodApps.filter(a => a.status === 'hired').length;
        const activePipelines = new Set(userApps.filter(a => !['hired', 'rejected', 'withdrawn'].includes(a.status)).map(a => a.id)).size;

        const userAuditLogs = auditByUser.get(member.id) || [];
        const pipelineActions = userAuditLogs.length;
        const lastActiveAt = userAuditLogs.length > 0
          ? userAuditLogs.reduce((latest, log) => log.created_at > latest ? log.created_at : latest, userAuditLogs[0].created_at)
          : null;

        const revenue = employeeId ? (commissionsByEmployee.get(employeeId) || 0) : 0;

        const empTarget = employeeId ? targetsByEmployee.get(employeeId) : null;
        const target: StrategistTarget | null = empTarget ? {
          revenueTarget: empTarget.revenue_target, revenueAchieved: empTarget.revenue_achieved || 0,
          placementsTarget: empTarget.placements_target, placementsAchieved: empTarget.placements_achieved || 0,
          candidatesSourcedTarget: empTarget.candidates_sourced_target, candidatesSourcedAchieved: empTarget.candidates_sourced_achieved || 0,
        } : null;

        const recentActivity = activityByUser.get(member.id) || { totalOutreach: 0, totalCalls: 0, totalEmails: 0, totalMeetings: 0 };

        const companyCapacity = (companyCount / MAX_COMPANY_CAPACITY) * 100;
        const candidateCapacity = (candidateCount / MAX_CANDIDATE_CAPACITY) * 100;
        const capacityPercent = Math.min(100, Math.round(companyCapacity * 0.4 + candidateCapacity * 0.6));

        return {
          id: member.id, full_name: member.full_name || 'Unknown', avatar_url: member.avatar_url,
          email: member.email, title: member.current_title, companyCount, candidateCount,
          activeApplications, capacityPercent, maxCapacity: MAX_CANDIDATE_CAPACITY, employeeId,
          activePipelines, candidatesSourced, placements, revenue, pipelineActions, lastActiveAt,
          performanceScore: 0, rank: 0, target, recentActivity,
        };
      });

      const maxPlacements = Math.max(1, ...workloads.map(w => w.placements));
      const maxRevenue = Math.max(1, ...workloads.map(w => w.revenue));
      const maxActions = Math.max(1, ...workloads.map(w => w.pipelineActions));
      const maxSourced = Math.max(1, ...workloads.map(w => w.candidatesSourced));

      workloads.forEach(w => {
        w.performanceScore = Math.round(
          Math.min(1, w.companyCount / MAX_COMPANY_CAPACITY) * 15 +
          Math.min(1, w.candidateCount / MAX_CANDIDATE_CAPACITY) * 15 +
          (w.placements / maxPlacements) * 25 +
          (w.revenue / maxRevenue) * 20 +
          (w.pipelineActions / maxActions) * 15 +
          (w.candidatesSourced / maxSourced) * 10
        );
      });

      workloads.sort((a, b) => b.performanceScore - a.performanceScore);
      workloads.forEach((w, idx) => { w.rank = idx + 1; });

      return workloads;
    },
    staleTime: 30000,
  });
}

export function useStrategistList() {
  return useQuery({
    queryKey: ['strategist-list'],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'strategist']);
      if (rolesError) throw rolesError;
      if (!roles?.length) return [];
      const teamUserIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, current_title')
        .in('id', teamUserIds)
        .order('full_name');
      if (profilesError) throw profilesError;
      return profiles || [];
    },
    staleTime: 60000,
  });
}
