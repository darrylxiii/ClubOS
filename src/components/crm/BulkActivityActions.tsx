import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CheckCircle, 
  X, 
  Trash2, 
  CalendarIcon,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

interface BulkActivityActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function BulkActivityActions({
  selectedIds,
  onClearSelection,
  onSuccess,
}: BulkActivityActionsProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);

  const selectedCount = selectedIds.size;

  const handleBulkComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_activities')
        .update({ 
          is_done: true, 
          done_at: new Date().toISOString() 
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      notify.success(`${selectedCount} activities marked complete`);
      onClearSelection();
      onSuccess();
    } catch (err) {
      console.error('Bulk complete error:', err);
      notify.error('Failed to complete activities');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_activities')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      notify.success(`${selectedCount} activities deleted`);
      onClearSelection();
      onSuccess();
    } catch (err) {
      console.error('Bulk delete error:', err);
      notify.error('Failed to delete activities');
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleBulkReschedule = async () => {
    if (!rescheduleDate) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_activities')
        .update({ 
          due_date: format(rescheduleDate, 'yyyy-MM-dd')
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      notify.success(`${selectedCount} activities rescheduled to ${format(rescheduleDate, 'MMM d')}`);
      onClearSelection();
      onSuccess();
      setShowReschedule(false);
      setRescheduleDate(null);
    } catch (err) {
      console.error('Bulk reschedule error:', err);
      notify.error('Failed to reschedule activities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-2xl flex items-center gap-3"
          >
            <span className="text-sm font-medium px-2">
              {selectedCount} selected
            </span>
            
            <div className="h-4 w-px bg-border" />

            {/* Complete All */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBulkComplete}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Complete
            </Button>

            {/* Reschedule */}
            <Popover open={showReschedule} onOpenChange={setShowReschedule}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Reschedule
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={rescheduleDate || undefined}
                  onSelect={(date) => {
                    setRescheduleDate(date || null);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
                {rescheduleDate && (
                  <div className="p-3 border-t">
                    <Button 
                      onClick={handleBulkReschedule} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Move to {format(rescheduleDate, 'MMM d')}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Delete */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setConfirmDelete(true)}
              disabled={loading}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>

            <div className="h-4 w-px bg-border" />

            {/* Clear Selection */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClearSelection} 
              className="h-8 w-8"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Activities"
        description={`Are you sure you want to delete ${selectedCount} activities? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleBulkDelete}
        variant="destructive"
      />
    </>
  );
}
