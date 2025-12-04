import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type JobStatus = "draft" | "published" | "closed" | "archived";

interface StatusChangeParams {
  jobId: string;
  jobTitle?: string;
}

// Generic status update function
const updateJobStatus = async (jobId: string, newStatus: JobStatus) => {
  const { error } = await supabase
    .from("jobs")
    .update({ status: newStatus })
    .eq("id", jobId);

  if (error) throw error;
  return { jobId, newStatus };
};

// Hook for publishing a job (draft → published)
export const usePublishJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: StatusChangeParams) => {
      return updateJobStatus(jobId, "published");
    },
    onSuccess: (_, { jobTitle }) => {
      toast.success(`"${jobTitle || 'Job'}" is now live and accepting applications`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["partner-jobs"] });
    },
    onError: (error) => {
      console.error("Error publishing job:", error);
      toast.error("Failed to publish job");
    },
  });
};

// Hook for unpublishing a job (published → draft)
export const useUnpublishJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: StatusChangeParams) => {
      return updateJobStatus(jobId, "draft");
    },
    onSuccess: (_, { jobTitle }) => {
      toast.success(`"${jobTitle || 'Job'}" moved to draft`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["partner-jobs"] });
    },
    onError: (error) => {
      console.error("Error unpublishing job:", error);
      toast.error("Failed to unpublish job");
    },
  });
};

// Hook for closing a job (any → closed)
export const useCloseJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: StatusChangeParams) => {
      return updateJobStatus(jobId, "closed");
    },
    onSuccess: (_, { jobTitle }) => {
      toast.success(`"${jobTitle || 'Job'}" has been closed`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["partner-jobs"] });
    },
    onError: (error) => {
      console.error("Error closing job:", error);
      toast.error("Failed to close job");
    },
  });
};

// Hook for reopening a job (closed → published)
export const useReopenJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: StatusChangeParams) => {
      return updateJobStatus(jobId, "published");
    },
    onSuccess: (_, { jobTitle }) => {
      toast.success(`"${jobTitle || 'Job'}" has been reopened and is now active`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["partner-jobs"] });
    },
    onError: (error) => {
      console.error("Error reopening job:", error);
      toast.error("Failed to reopen job");
    },
  });
};

// Hook for archiving a job (any → archived)
export const useArchiveJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: StatusChangeParams) => {
      return updateJobStatus(jobId, "archived");
    },
    onSuccess: (_, { jobTitle }) => {
      toast.success(`"${jobTitle || 'Job'}" has been archived`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["partner-jobs"] });
    },
    onError: (error) => {
      console.error("Error archiving job:", error);
      toast.error("Failed to archive job");
    },
  });
};

// Hook for restoring an archived job (archived → closed)
export const useRestoreJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: StatusChangeParams) => {
      return updateJobStatus(jobId, "closed");
    },
    onSuccess: (_, { jobTitle }) => {
      toast.success(`"${jobTitle || 'Job'}" has been restored from archive`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["partner-jobs"] });
    },
    onError: (error) => {
      console.error("Error restoring job:", error);
      toast.error("Failed to restore job");
    },
  });
};

// Combined hook that returns all status mutation hooks
export const useJobStatusActions = () => {
  const publishJob = usePublishJob();
  const unpublishJob = useUnpublishJob();
  const closeJob = useCloseJob();
  const reopenJob = useReopenJob();
  const archiveJob = useArchiveJob();
  const restoreJob = useRestoreJob();

  return {
    publishJob,
    unpublishJob,
    closeJob,
    reopenJob,
    archiveJob,
    restoreJob,
    isLoading: 
      publishJob.isPending || 
      unpublishJob.isPending || 
      closeJob.isPending || 
      reopenJob.isPending || 
      archiveJob.isPending || 
      restoreJob.isPending,
  };
};
