import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  Save,
  Sparkles,
  Building2,
  Users,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { usePipelineManagement } from '@/hooks/usePipelineManagement';
import { cn } from '@/lib/utils';
import { AddStageDialog } from './AddStageDialog';
import { useTranslation } from 'react-i18next';

interface Stage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid';
  resources?: string[];
  description?: string;
}

interface ReviewerOption {
  id: string;
  fullName: string;
  email: string;
}

interface ReviewerAssignment {
  id: string;
  reviewerId: string;
  isPrimary: boolean;
  assignedAt: string;
}

type ReviewLayerTab = 'internal' | 'partner';

interface PipelineCustomizerProps {
  jobId: string;
  companyId: string;
  currentStages: Stage[];
  onUpdate: () => void;
}

export const PipelineCustomizer = ({ jobId, companyId, currentStages, onUpdate }: PipelineCustomizerProps) => {
  const { t } = useTranslation('partner');
  const [stages, setStages] = useState<Stage[]>(currentStages);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [reviewerOptions, setReviewerOptions] = useState<ReviewerOption[]>([]);
  const [internalReviewerOptions, setInternalReviewerOptions] = useState<ReviewerOption[]>([]);
  const [reviewerAssignments, setReviewerAssignments] = useState<ReviewerAssignment[]>([]);
  const [internalReviewerAssignments, setInternalReviewerAssignments] = useState<ReviewerAssignment[]>([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [selectedIsPrimary, setSelectedIsPrimary] = useState(false);
  const [savingReviewer, setSavingReviewer] = useState(false);
  const [reviewLayerTab, setReviewLayerTab] = useState<ReviewLayerTab>('partner');

  const { currentRole: role } = useRole();
  const { saving, savePipeline, addStage, removeStage } = usePipelineManagement(jobId);

  const canManageReviewers = role === 'admin' || role === 'strategist';

  useEffect(() => {
    setStages(currentStages);
  }, [currentStages]);

  useEffect(() => {
    const loadReviewers = async () => {
      // Load partner reviewers
      const { data: members } = await supabase
        .from('company_members')
        .select('user_id, role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('role', 'partner');

      const partnerUserIds = [...new Set((members || []).map((m) => m.user_id).filter(Boolean))] as string[];
      const { data: partnerProfiles } = partnerUserIds.length
        ? await supabase.from('profiles').select('id, full_name, email').in('id', partnerUserIds)
        : { data: [] };

      setReviewerOptions(
        (partnerProfiles || []).map((p) => ({ id: p.id, fullName: p.full_name || 'Partner', email: p.email || '' })),
      );

      // Load internal reviewers (admins, strategists, recruiters)
      const { data: internalMembers } = await supabase
        .from('company_members')
        .select('user_id, role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('role', ['admin', 'strategist', 'recruiter']);

      const internalUserIds = [...new Set((internalMembers || []).map((m) => m.user_id).filter(Boolean))] as string[];
      const { data: internalProfiles } = internalUserIds.length
        ? await supabase.from('profiles').select('id, full_name, email').in('id', internalUserIds)
        : { data: [] };

      setInternalReviewerOptions(
        (internalProfiles || []).map((p) => ({ id: p.id, fullName: p.full_name || 'Reviewer', email: p.email || '' })),
      );

      // Load partner assignments
      const { data: partnerAssignments } = await supabase
        .from('pipeline_reviewers')
        .select('id, reviewer_id, is_primary, assigned_at')
        .eq('job_id', jobId)
        .eq('review_type', 'partner')
        .order('assigned_at', { ascending: true });

      setReviewerAssignments(
        (partnerAssignments || []).map((a) => ({
          id: a.id, reviewerId: a.reviewer_id, isPrimary: a.is_primary || false, assignedAt: a.assigned_at || new Date().toISOString(),
        })),
      );

      // Load internal assignments
      const { data: internalAssignments } = await supabase
        .from('pipeline_reviewers')
        .select('id, reviewer_id, is_primary, assigned_at')
        .eq('job_id', jobId)
        .eq('review_type', 'internal')
        .order('assigned_at', { ascending: true });

      setInternalReviewerAssignments(
        (internalAssignments || []).map((a) => ({
          id: a.id, reviewerId: a.reviewer_id, isPrimary: a.is_primary || false, assignedAt: a.assigned_at || new Date().toISOString(),
        })),
      );
    };

    void loadReviewers();
  }, [companyId, jobId]);

  const handleAddStage = async (newStage: Stage) => {
    const result = await addStage(stages, newStage);
    if (result.success) {
      setStages([...stages, newStage]);
      onUpdate();
    }
    return result;
  };

  const handleRemoveStage = async (index: number) => {
    const result = await removeStage(stages, index);
    if (result.success) {
      const updated = stages.filter((_, i) => i !== index).map((stage, i) => ({
        ...stage,
        order: i,
      }));
      setStages(updated);
      toast.success(t('pipelineCustomizer.toast.stageRemoved'));
      onUpdate();
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];

    const reordered = newStages.map((stage, i) => ({ ...stage, order: i }));
    setStages(reordered);
  };

  const handleUpdateStage = (index: number, field: keyof Stage, value: unknown) => {
    const updated = stages.map((stage, i) =>
      i === index ? { ...stage, [field]: value } : stage,
    );
    setStages(updated);
  };

  const handleSave = async () => {
    const result = await savePipeline(stages);
    if (result.success) {
      toast.success(t('pipelineCustomizer.toast.pipelineSaved'), {
        description: t('pipelineCustomizer.toast.signatureSecure'),
        duration: 3000,
      });
      onUpdate();
    }
  };

  const handleAssignReviewer = async () => {
    if (!selectedReviewerId) {
      toast.error(t('pipelineCustomizer.toast.selectAReviewerFirst'));
      return;
    }

    setSavingReviewer(true);
    const currentReviewType = reviewLayerTab;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (selectedIsPrimary) {
        await supabase
          .from('pipeline_reviewers')
          .update({ is_primary: false })
          .eq('job_id', jobId)
          .eq('review_type', currentReviewType);
      }

      const { error } = await supabase.from('pipeline_reviewers').upsert(
        {
          job_id: jobId,
          reviewer_id: selectedReviewerId,
          review_type: currentReviewType,
          is_primary: selectedIsPrimary,
          assigned_by: user?.id || null,
        },
        { onConflict: 'job_id,reviewer_id,review_type' },
      );

      if (error) throw error;

      // Refresh the correct assignment list
      const { data: assignments } = await supabase
        .from('pipeline_reviewers')
        .select('id, reviewer_id, is_primary, assigned_at')
        .eq('job_id', jobId)
        .eq('review_type', currentReviewType)
        .order('assigned_at', { ascending: true });

      const mapped = (assignments || []).map((a) => ({
        id: a.id, reviewerId: a.reviewer_id, isPrimary: a.is_primary || false, assignedAt: a.assigned_at || new Date().toISOString(),
      }));

      if (currentReviewType === 'partner') {
        setReviewerAssignments(mapped);
      } else {
        setInternalReviewerAssignments(mapped);
      }

      setSelectedReviewerId('');
      setSelectedIsPrimary(false);
      toast.success(t('pipelineCustomizer.toast.reviewerAssigned'));
    } catch (error) {
      console.error(error);
      toast.error(t('pipelineCustomizer.toast.failedToAssignReviewer'));
    } finally {
      setSavingReviewer(false);
    }
  };

  const handleRemoveReviewer = async (assignmentId: string, layer: ReviewLayerTab) => {
    const { error } = await supabase.from('pipeline_reviewers').delete().eq('id', assignmentId);

    if (error) {
      toast.error(t('pipelineCustomizer.toast.failedToRemoveReviewer'));
      return;
    }

    if (layer === 'partner') {
      setReviewerAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } else {
      setInternalReviewerAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    }
    toast.success(t('pipelineCustomizer.toast.reviewerRemoved'));
  };

  const getOwnerIcon = (owner?: string) => {
    return owner === 'quantum_club' ? Users : Building2;
  };

  const getFormatBadge = (format?: string) => {
    const colors = {
      online: 'bg-accent/20 text-accent border-accent/30',
      in_person: 'bg-primary/20 text-primary border-primary/30',
      hybrid: 'bg-secondary/20 text-secondary border-secondary/30',
    };
    return colors[format as keyof typeof colors] || colors.online;
  };

  const getReviewerName = (reviewerId: string) => {
    const reviewer = reviewerOptions.find((option) => option.id === reviewerId);
    return reviewer?.fullName || 'Reviewer';
  };

  return (
    <Card className="border-2 backdrop-blur-xl bg-background/80">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          <CardTitle className="text-lg font-black uppercase bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">{t('pipelineCustomizer.title')}</CardTitle>
        </div>
        <CardDescription>{t('pipelineCustomizer.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const OwnerIcon = getOwnerIcon(stage.owner);
            const isExpanded = expandedIndex === index;

            return (
              <div
                key={index}
                className={cn(
                  'group relative overflow-hidden rounded-xl border-2 transition-all duration-300',
                  'bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm',
                  isExpanded
                    ? 'border-accent shadow-lg shadow-accent/20'
                    : 'border-border/50 hover:border-accent/50',
                  'hover:shadow-md',
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-accent transition-colors" />

                    {editingIndex === index ? (
                      <Input
                        value={stage.name}
                        onChange={(e) => handleUpdateStage(index, 'name', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        autoFocus
                        className="flex-1 border-accent"
                      />
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-bold text-lg">{stage.name}</span>
                        <OwnerIcon className="w-4 h-4 text-muted-foreground" />
                        {stage.format && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-semibold border',
                              getFormatBadge(stage.format),
                            )}
                          >
                            {stage.format}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveStage(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 p-0 hover:bg-accent/20"
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveStage(index, 'down')}
                        disabled={index === stages.length - 1}
                        className="h-8 w-8 p-0 hover:bg-accent/20"
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        className="h-8 w-8 p-0 hover:bg-primary/20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveStage(index)}
                        className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 pt-4 border-t border-border/50 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">{t('pipelineCustomizer.label.stageOwner')}</Label>
                          <Select
                            value={stage.owner || 'company'}
                            onValueChange={(value) => handleUpdateStage(index, 'owner', value)}
                          >
                            <SelectTrigger className="border-accent/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  Our Team
                                </div>
                              </SelectItem>
                              <SelectItem value="quantum_club">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Quantum Club Elite
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">{t('pipelineCustomizer.label.format')}</Label>
                          <Select
                            value={stage.format || 'online'}
                            onValueChange={(value) => handleUpdateStage(index, 'format', value)}
                          >
                            <SelectTrigger className="border-primary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="online">{t('pipelineCustomizer.option.online')}</SelectItem>
                              <SelectItem value="in_person">{t('pipelineCustomizer.option.inperson')}</SelectItem>
                              <SelectItem value="hybrid">{t('pipelineCustomizer.option.hybrid')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">{t('pipelineCustomizer.label.description')}</Label>
                        <Textarea
                          value={stage.description || ''}
                          onChange={(e) => handleUpdateStage(index, 'description', e.target.value)}
                          placeholder={t('pipelineCustomizer.placeholder.describeWhatHappensInThisStage')}
                          className="border-accent/50 min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Button
            onClick={() => setAddStageOpen(true)}
            className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Premium Stage
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">{t('pipelineCustomizer.reviewGateAssignments')}</p>
            </div>
          </div>

          {/* Layer tabs */}
          {canManageReviewers && (
            <div className="flex gap-1 p-1 rounded-lg bg-muted/30">
              <button
                onClick={() => { setReviewLayerTab('internal'); setSelectedReviewerId(''); }}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                  reviewLayerTab === 'internal'
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t('partner.pipelinecustomizer.internalReviewers', 'Internal Reviewers')}
              </button>
              <button
                onClick={() => { setReviewLayerTab('partner'); setSelectedReviewerId(''); }}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                  reviewLayerTab === 'partner'
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t('partner.pipelinecustomizer.partnerReviewers', 'Partner Reviewers')}
              </button>
            </div>
          )}

          {!canManageReviewers ? (
            <p className="text-sm text-muted-foreground">{t('pipelineCustomizer.onlyAdminAndStrategistRolesCanChangeRevi')}</p>
          ) : (
            <>
              <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                <Select value={selectedReviewerId} onValueChange={setSelectedReviewerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={reviewLayerTab === 'partner' ? t('partner.pipelinecustomizer.selectPartnerReviewer', 'Select partner reviewer') : t('partner.pipelinecustomizer.selectInternalReviewer', 'Select internal reviewer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(reviewLayerTab === 'partner' ? reviewerOptions : internalReviewerOptions).length === 0 ? (
                      <SelectItem value="__empty" disabled>{t('pipelineCustomizer.option.noReviewersAvailable')}</SelectItem>
                    ) : (
                      (reviewLayerTab === 'partner' ? reviewerOptions : internalReviewerOptions).map((reviewer) => (
                        <SelectItem key={reviewer.id} value={reviewer.id}>
                          {reviewer.fullName}
                          {reviewer.email ? ` (${reviewer.email})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 px-2">
                  <Checkbox
                    id="primary-reviewer"
                    checked={selectedIsPrimary}
                    onCheckedChange={(checked) => setSelectedIsPrimary(Boolean(checked))}
                  />
                  <Label htmlFor="primary-reviewer" className="text-xs whitespace-nowrap">{t('pipelineCustomizer.label.primary')}</Label>
                </div>

                <Button onClick={handleAssignReviewer} disabled={savingReviewer}>{t('partner.pipelinecustomizer.assign', 'Assign')}</Button>
              </div>

              {/* Current assignments for selected layer */}
              {(() => {
                const assignments = reviewLayerTab === 'partner' ? reviewerAssignments : internalReviewerAssignments;
                const options = reviewLayerTab === 'partner' ? reviewerOptions : internalReviewerOptions;
                const getName = (id: string) => options.find((o) => o.id === id)?.fullName || 'Reviewer';

                return assignments.length > 0 ? (
                  <div className="space-y-2">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <div className="text-sm">
                          <span className="font-medium">{getName(assignment.reviewerId)}</span>
                          {assignment.isPrimary && (
                            <span className="ml-2 text-xs text-primary">{t('pipelineCustomizer.primary')}</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveReviewer(assignment.id, reviewLayerTab)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No {reviewLayerTab === 'partner' ? 'partner' : 'internal'} reviewers assigned yet.
                  </p>
                );
              })()}
            </>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-gradient-to-r from-primary to-accent font-black uppercase tracking-wide hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Securing...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Signature Secure Save
            </>
          )}
        </Button>
      </CardContent>

      <AddStageDialog
        open={addStageOpen}
        onOpenChange={setAddStageOpen}
        onSave={handleAddStage}
        currentStagesCount={stages.length}
        jobId={jobId}
        companyId={companyId}
      />
    </Card>
  );
};
