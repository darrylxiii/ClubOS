import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CompanyPerson {
  id: string;
  company_id: string;
  linkedin_url: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  current_title: string | null;
  department_inferred: string | null;
  seniority_level: string | null;
  location: string | null;
  headline: string | null;
  skills: string[];
  years_at_company: number | null;
  total_experience_years: number | null;
  is_decision_maker: boolean;
  is_still_active: boolean;
  employment_status: string;
  matched_candidate_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  departed_at: string | null;
  departed_to_company: string | null;
  departed_to_title: string | null;
  title_classification_method: string | null;
  created_at: string;
}

export interface CompanyPersonChange {
  id: string;
  company_id: string;
  person_id: string | null;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  detected_at: string;
  is_reviewed: boolean;
  notes: string | null;
  is_opportunity: boolean;
  person?: CompanyPerson;
}

export interface ScanJob {
  id: string;
  company_id: string;
  status: string;
  total_employees_found: number;
  profiles_enriched: number;
  profiles_failed: number;
  changes_detected: number;
  credits_estimated: number;
  credits_used: number;
  started_at: string | null;
  completed_at: string | null;
  scan_type: string;
  error_message: string | null;
}

export interface ScanEstimate {
  headcount: number;
  listingCredits: number;
  enrichmentCredits: number;
  totalEstimate: number;
  monthlySpendSoFar: number;
  warning: string | null;
}

export function usePartnerOrgIntelligence(companyId: string) {
  const { user } = useAuth();
  const [people, setPeople] = useState<CompanyPerson[]>([]);
  const [changes, setChanges] = useState<CompanyPersonChange[]>([]);
  const [activeScanJob, setActiveScanJob] = useState<ScanJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPeople = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('company_people')
      .select('*')
      .eq('company_id', companyId)
      .order('department_inferred', { ascending: true })
      .order('seniority_level', { ascending: true });

    if (!error && data) setPeople(data);
    return data || [];
  }, [companyId]);

  const fetchChanges = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('company_people_changes')
      .select('*')
      .eq('company_id', companyId)
      .order('detected_at', { ascending: false })
      .limit(100);

    if (!error && data) setChanges(data);
  }, [companyId]);

  const fetchActiveScan = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('company_scan_jobs')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['pending', 'discovering', 'listing', 'enriching', 'analyzing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      setActiveScanJob(data);
      setScanning(!!data);
    }
  }, [companyId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPeople(), fetchChanges(), fetchActiveScan()]);
    setLoading(false);
  }, [fetchPeople, fetchChanges, fetchActiveScan]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Poll during active scan
  useEffect(() => {
    if (scanning && activeScanJob) {
      pollingRef.current = setInterval(async () => {
        await fetchActiveScan();
        await fetchPeople();

        // If scan completed, stop polling
        const { data } = await (supabase as any)
          .from('company_scan_jobs')
          .select('status')
          .eq('id', activeScanJob.id)
          .single();

        if (data && ['completed', 'failed'].includes(data.status)) {
          setScanning(false);
          setActiveScanJob(null);
          await loadAll();
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }, 5000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [scanning, activeScanJob, fetchActiveScan, fetchPeople, loadAll]);

  const getEstimate = useCallback(async (): Promise<ScanEstimate | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('scan-partner-organization', {
        body: { companyId, action: 'estimate' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.estimate;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get estimate');
      return null;
    }
  }, [companyId]);

  const startScan = useCallback(async () => {
    try {
      setScanning(true);
      const { data, error } = await supabase.functions.invoke('scan-partner-organization', {
        body: { companyId, action: 'start' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Scan started. Found ${data.employeesFound} employees.`);

      // Start processing batches
      if (data.scanJobId && data.employeesFound > 0) {
        processBatches(data.scanJobId);
      }

      await fetchActiveScan();
    } catch (err) {
      setScanning(false);
      toast.error(err instanceof Error ? err.message : 'Failed to start scan');
    }
  }, [companyId, fetchActiveScan]);

  const processBatches = useCallback(async (scanJobId: string) => {
    let hasMore = true;
    let totalEnriched = 0;

    while (hasMore) {
      try {
        const { data, error } = await supabase.functions.invoke('process-scan-batch', {
          body: { scanJobId },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        hasMore = data.hasMore;
        totalEnriched += data.enriched || 0;

        // Refresh data periodically
        if (totalEnriched % 20 === 0) {
          await fetchPeople();
          await fetchActiveScan();
        }

        // Small delay between batches
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error('Batch processing error:', err);
        hasMore = false;
      }
    }

    // Run title classification
    try {
      await supabase.functions.invoke('classify-org-titles', {
        body: { companyId, scanJobId },
      });
    } catch (err) {
      console.error('Classification error:', err);
    }

    // Final refresh
    await loadAll();
    toast.success(`Scan complete. ${totalEnriched} profiles enriched.`);
  }, [companyId, fetchPeople, fetchActiveScan, loadAll]);

  const pauseScan = useCallback(async () => {
    if (!activeScanJob) return;
    await supabase.functions.invoke('scan-partner-organization', {
      body: { companyId, action: 'pause', scanJobId: activeScanJob.id },
    });
    await fetchActiveScan();
  }, [companyId, activeScanJob, fetchActiveScan]);

  const resumeScan = useCallback(async () => {
    if (!activeScanJob) return;
    await supabase.functions.invoke('scan-partner-organization', {
      body: { companyId, action: 'resume', scanJobId: activeScanJob.id },
    });
    processBatches(activeScanJob.id);
    await fetchActiveScan();
  }, [companyId, activeScanJob, fetchActiveScan, processBatches]);

  // Stats
  const stats = {
    totalPeople: people.length,
    activePeople: people.filter(p => p.is_still_active).length,
    departments: [...new Set(people.map(p => p.department_inferred).filter(Boolean))].length,
    decisionMakers: people.filter(p => p.is_decision_maker).length,
    matchedCandidates: people.filter(p => p.matched_candidate_id).length,
    avgTenure: people.length > 0
      ? Math.round(people.reduce((sum, p) => sum + (p.years_at_company || 0), 0) / people.length * 10) / 10
      : 0,
    recentHires: changes.filter(c => c.change_type === 'new_hire' && new Date(c.detected_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
    recentDepartures: changes.filter(c => c.change_type === 'departure' && new Date(c.detected_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
  };

  return {
    people,
    changes,
    activeScanJob,
    loading,
    scanning,
    stats,
    getEstimate,
    startScan,
    pauseScan,
    resumeScan,
    refresh: loadAll,
  };
}
