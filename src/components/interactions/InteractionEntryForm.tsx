import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import type { InteractionFormData } from '@/types/interaction';

const interactionSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  job_id: z.string().optional(),
  interaction_type: z.enum(['whatsapp', 'email', 'phone_call', 'zoom_meeting', 'linkedin_message', 'in_person', 'other']),
  interaction_subtype: z.string().optional(),
  interaction_date: z.date(),
  duration_minutes: z.number().optional().nullable(),
  direction: z.enum(['inbound', 'outbound', 'mutual']),
  subject: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  urgency_score: z.number().min(0).max(10).optional().nullable(),
  next_action: z.string().optional().nullable(),
});

interface InteractionEntryFormProps {
  onSuccess?: () => void;
  defaultCompanyId?: string;
}

export function InteractionEntryForm({ onSuccess, defaultCompanyId }: InteractionEntryFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingStakeholders, setLoadingStakeholders] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      company_id: defaultCompanyId || '',
      interaction_type: 'phone_call' as const,
      direction: 'outbound' as const,
      interaction_date: new Date(),
    },
  });

  const selectedCompanyId = watch('company_id');

  // Load companies
  const loadCompanies = async (search: string) => {
    setLoadingCompanies(true);
    try {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${search}%`)
        .limit(20);
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load stakeholders when company is selected
  const loadStakeholders = async (companyId: string) => {
    setLoadingStakeholders(true);
    try {
      const { data } = await (supabase as any)
        .from('company_stakeholders')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name');
      setStakeholders(data || []);
    } catch (error) {
      console.error('Error loading stakeholders:', error);
    } finally {
      setLoadingStakeholders(false);
    }
  };

  // When company changes, load its stakeholders
  const handleCompanyChange = (companyId: string) => {
    setValue('company_id', companyId);
    setSelectedStakeholders([]);
    if (companyId) {
      loadStakeholders(companyId);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Create interaction
      const { data: interaction, error: interactionError } = await (supabase as any)
        .from('company_interactions')
        .insert({
          company_id: data.company_id,
          job_id: data.job_id || null,
          interaction_type: data.interaction_type,
          interaction_subtype: data.interaction_subtype || null,
          interaction_date: data.interaction_date.toISOString(),
          duration_minutes: data.duration_minutes || null,
          direction: data.direction,
          our_participant_id: user?.id,
          subject: data.subject || null,
          summary: data.summary || null,
          raw_content: data.notes || null,
          urgency_score: data.urgency_score || null,
          next_action: data.next_action || null,
          is_manually_entered: true,
          status: 'active',
        })
        .select()
        .single();

      if (interactionError) throw interactionError;

      // Add participants
      if (selectedStakeholders.length > 0 && interaction) {
        const participants = selectedStakeholders.map(stakeholderId => ({
          interaction_id: interaction.id,
          stakeholder_id: stakeholderId,
          participation_type: data.direction === 'inbound' ? 'sender' : 'recipient',
        }));

        const { error: participantsError } = await (supabase as any)
          .from('interaction_participants')
          .insert(participants);

        if (participantsError) throw participantsError;

        // Update stakeholder interaction counts
        for (const stakeholderId of selectedStakeholders) {
          const { data: stakeholder } = await (supabase as any)
            .from('company_stakeholders')
            .select('total_interactions')
            .eq('id', stakeholderId)
            .single();

          if (stakeholder) {
            await (supabase as any)
              .from('company_stakeholders')
              .update({ 
                total_interactions: (stakeholder.total_interactions || 0) + 1,
                last_contacted_at: data.interaction_date.toISOString()
              })
              .eq('id', stakeholderId);
          }
        }
      }

      toast.success('Interaction logged successfully');
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Error creating interaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to log interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Interaction</CardTitle>
        <CardDescription>Record a manual interaction with a company</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Selection */}
          <div className="space-y-2">
            <Label htmlFor="company_id">Company *</Label>
            <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.company_id && (
              <p className="text-sm text-destructive">{errors.company_id.message}</p>
            )}
            <Input
              placeholder="Search companies..."
              onChange={(e) => loadCompanies(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Interaction Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interaction_type">Type *</Label>
              <Select {...register('interaction_type')} onValueChange={(value) => setValue('interaction_type', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="zoom_meeting">Zoom Meeting</SelectItem>
                  <SelectItem value="linkedin_message">LinkedIn</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Direction *</Label>
              <Select {...register('direction')} onValueChange={(value) => setValue('direction', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="mutual">Mutual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interaction_date">Date *</Label>
              <Input
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setValue('interaction_date', new Date(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                type="number"
                placeholder="30"
                onChange={(e) => (setValue as any)('duration_minutes', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label>Participants</Label>
            {loadingStakeholders ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading stakeholders...
              </div>
            ) : (
              <div className="space-y-2">
                {stakeholders.map(stakeholder => (
                  <div key={stakeholder.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedStakeholders.includes(stakeholder.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStakeholders([...selectedStakeholders, stakeholder.id]);
                        } else {
                          setSelectedStakeholders(selectedStakeholders.filter(id => id !== stakeholder.id));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">
                      {stakeholder.full_name} {stakeholder.job_title && `(${stakeholder.job_title})`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input placeholder="Discussion topic" onChange={(e) => (setValue as any)('subject', e.target.value)} />
          </div>

          {/* Summary & Notes */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea placeholder="Brief summary of the interaction" rows={2} onChange={(e) => (setValue as any)('summary', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea placeholder="Detailed notes" rows={4} onChange={(e) => (setValue as any)('notes', e.target.value)} />
          </div>

          {/* Urgency & Next Action */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency_score">Urgency (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                placeholder="5"
                onChange={(e) => (setValue as any)('urgency_score', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_action">Next Action</Label>
              <Input placeholder="Follow up next week" onChange={(e) => (setValue as any)('next_action', e.target.value)} />
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging...
              </>
            ) : (
              'Log Interaction'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
