import { motion, AnimatePresence } from "framer-motion";
import { 
  Archive, Clock, CheckCircle, X, Download 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkReplyActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
}

export function BulkReplyActions({ selectedIds, onClearSelection }: BulkReplyActionsProps) {
  const queryClient = useQueryClient();
  const selectedCount = selectedIds.size;

  const bulkArchiveMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('crm_email_replies')
        .update({ is_archived: true })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] });
      toast.success(`${selectedCount} replies archived`);
      onClearSelection();
    },
    onError: (error: Error) => {
      toast.error(`Archive failed: ${error.message}`);
    },
  });

  const bulkMarkActionedMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('crm_email_replies')
        .update({ 
          is_actioned: true, 
          actioned_at: new Date().toISOString(),
          action_taken: 'bulk_marked'
        })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] });
      toast.success(`${selectedCount} replies marked as actioned`);
      onClearSelection();
    },
    onError: (error: Error) => {
      toast.error(`Mark actioned failed: ${error.message}`);
    },
  });

  const bulkSnoozeMutation = useMutation({
    mutationFn: async (days: number) => {
      const ids = Array.from(selectedIds);
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + days);
      
      // Store snooze in metadata since we don't have a dedicated column
      const { error } = await supabase
        .from('crm_email_replies')
        .update({ 
          metadata: { snoozed_until: snoozeUntil.toISOString() }
        })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, days) => {
      queryClient.invalidateQueries({ queryKey: ['smart-reply-inbox'] });
      toast.success(`${selectedCount} replies snoozed for ${days} day(s)`);
      onClearSelection();
    },
    onError: (error: Error) => {
      toast.error(`Snooze failed: ${error.message}`);
    },
  });

  const handleExport = async () => {
    try {
      const ids = Array.from(selectedIds);
      const { data, error } = await supabase
        .from('crm_email_replies')
        .select('from_name, from_email, subject, body_preview, classification, received_at, prospect_id')
        .in('id', ids);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Generate CSV
      const headers = ['From Name', 'From Email', 'Subject', 'Preview', 'Classification', 'Received At'];
      const rows = data.map(r => [
        r.from_name || '',
        r.from_email || '',
        r.subject || '',
        (r.body_preview || '').replace(/"/g, '""'),
        r.classification || '',
        r.received_at || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `email-replies-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success(`Exported ${data.length} replies to CSV`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border/50 rounded-full shadow-lg backdrop-blur-xl">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => bulkArchiveMutation.mutate()}
            disabled={bulkArchiveMutation.isPending}
          >
            <Archive className="w-4 h-4 mr-1" />
            Archive
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => bulkMarkActionedMutation.mutate()}
            disabled={bulkMarkActionedMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Mark Done
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Clock className="w-4 h-4 mr-1" />
                Snooze
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => bulkSnoozeMutation.mutate(1)}>
                Tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkSnoozeMutation.mutate(3)}>
                In 3 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkSnoozeMutation.mutate(7)}>
                In 1 week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClearSelection}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
