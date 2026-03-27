import { useTranslation } from 'react-i18next';
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";

interface RescheduleInterviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bookingId: string;
    currentStartTime: string;
    currentEndTime: string;
    candidateName?: string;
    onRescheduled?: () => void;
}

export function RescheduleInterviewDialog({
    open,
    onOpenChange,
    bookingId,
    currentStartTime,
    currentEndTime,
    candidateName,
    onRescheduled,
}: RescheduleInterviewDialogProps) {
  const { t } = useTranslation('common');
    const [date, setDate] = useState<Date | undefined>(new Date(currentStartTime));
    const [time, setTime] = useState(format(new Date(currentStartTime), 'HH:mm'));
    const [duration, setDuration] = useState('60');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) {
            toast.error(t("please_select_a_date", "Please select a date"));
            return;
        }

        setLoading(true);
        try {
            // Combine date and time
            const [hours, minutes] = time.split(':');
            const newStart = new Date(date);
            newStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const newEnd = new Date(newStart);
            newEnd.setMinutes(newEnd.getMinutes() + parseInt(duration));

            // Update booking
            const { error } = await supabase
                .from('bookings')
                .update({
                    scheduled_start: newStart.toISOString(),
                    scheduled_end: newEnd.toISOString(),
                    rescheduled_at: new Date().toISOString(),
                    reschedule_reason: reason || undefined,
                    status: 'rescheduled',
                })
                .eq('id', bookingId);

            if (error) throw error;

            toast.success(t("interview_rescheduled_successfully", "Interview rescheduled successfully"), {
                description: `New time: ${format(newStart, 'MMM d, yyyy')} at ${time}`,
            });

            onRescheduled?.();
            onOpenChange(false);
        } catch (error: unknown) {
            console.error('Error rescheduling interview:', error);
            toast.error(t("failed_to_reschedule_interview", "Failed to reschedule interview"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("reschedule_interview", "Reschedule Interview")}</DialogTitle>
                    <DialogDescription>
                        {candidateName && `Rescheduling interview with ${candidateName}`}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Time Display */}
                    <div className="bg-muted p-4 rounded-lg">
                        <div className="text-sm font-medium mb-2">{t("current_schedule", "Current Schedule:")}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="w-4 h-4" />
                            {format(new Date(currentStartTime), 'MMM d, yyyy')}
                            <Clock className="w-4 h-4 ml-2" />
                            {format(new Date(currentStartTime), 'HH:mm')} - {format(new Date(currentEndTime), 'HH:mm')}
                        </div>
                    </div>

                    {/* New Date Selection */}
                    <div className="space-y-2">
                        <Label>{t("new_date", "New Date *")}</Label>
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            disabled={(date) => date < new Date()}
                            className="rounded-md border"
                        />
                    </div>

                    {/* Time Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="time">{t("start_time", "Start Time *")}</Label>
                            <input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="duration">{t("duration_minutes", "Duration (minutes) *")}</Label>
                            <select
                                id="duration"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="30">{t("30_minutes", "30 minutes")}</option>
                                <option value="45">{t("45_minutes", "45 minutes")}</option>
                                <option value="60">{t("1_hour", "1 hour")}</option>
                                <option value="90">{t("15_hours", "1.5 hours")}</option>
                                <option value="120">{t("2_hours", "2 hours")}</option>
                            </select>
                        </div>
                    </div>

                    {/* Reason (Optional) */}
                    <div className="space-y-2">
                        <Label htmlFor="reason">{t("reason_for_rescheduling_optional", "Reason for Rescheduling (Optional)")}</Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t("eg_candidate_requested_different", "E.g., Candidate requested different time, scheduling conflict...")}
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            {t('common:cancel')}
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
