import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobLocation {
  id: string;
  title: string;
  companyName: string;
  location: string;
  latitude: number;
  longitude: number;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
}

interface JobLocationFilters {
  employmentType?: string;
  companyId?: string;
  isActive?: boolean;
}

interface ClusteredLocation {
  latitude: number;
  longitude: number;
  count: number;
  jobs: JobLocation[];
}

// Simple clustering algorithm for nearby jobs
function clusterLocations(
  jobs: JobLocation[],
  clusterRadius: number = 0.5 // degrees, roughly 50km
): ClusteredLocation[] {
  const clusters: ClusteredLocation[] = [];
  const assigned = new Set<string>();

  for (const job of jobs) {
    if (assigned.has(job.id)) continue;

    const cluster: ClusteredLocation = {
      latitude: job.latitude,
      longitude: job.longitude,
      count: 1,
      jobs: [job],
    };

    // Find nearby jobs
    for (const other of jobs) {
      if (assigned.has(other.id) || other.id === job.id) continue;

      const latDiff = Math.abs(other.latitude - job.latitude);
      const lonDiff = Math.abs(other.longitude - job.longitude);

      if (latDiff < clusterRadius && lonDiff < clusterRadius) {
        cluster.jobs.push(other);
        cluster.count++;
        assigned.add(other.id);

        // Update cluster center to average
        cluster.latitude =
          cluster.jobs.reduce((sum, j) => sum + j.latitude, 0) / cluster.jobs.length;
        cluster.longitude =
          cluster.jobs.reduce((sum, j) => sum + j.longitude, 0) / cluster.jobs.length;
      }
    }

    assigned.add(job.id);
    clusters.push(cluster);
  }

  return clusters;
}

export function useJobLocations(filters: JobLocationFilters = {}) {
  return useQuery({
    queryKey: ["job-locations", filters],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select(`
          id,
          title,
          location,
          latitude,
          longitude,
          employment_type,
          salary_min,
          salary_max,
          currency,
          company_id,
          companies!inner(name)
        `)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (filters.isActive !== false) {
        query = query.in("status", ["open", "published"]);
      }

      if (filters.employmentType) {
        query = query.eq("employment_type", filters.employmentType);
      }

      if (filters.companyId) {
        query = query.eq("company_id", filters.companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const jobs: JobLocation[] = (data || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        companyName: job.companies?.name || "Unknown Company",
        location: job.location,
        latitude: job.latitude,
        longitude: job.longitude,
        employmentType: job.employment_type,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        currency: job.currency,
      }));

      return {
        jobs,
        clusters: clusterLocations(jobs),
        totalCount: jobs.length,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for a single job's location
export function useJobLocation(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-location", jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const { data, error } = await supabase
        .from("jobs")
        .select("latitude, longitude, location, location_city, location_country_code")
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });
}
