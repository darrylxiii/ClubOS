import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Gift,
  Loader2,
  Trash2,
  Euro,
  Calendar,
  Hash,
  Sparkles,
  Trophy,
  Zap,
  Wallet,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  milestoneSchema,
  MilestoneFormData,
  useMilestoneManagement,
} from '@/hooks/useMilestoneManagement';
import { useRevenueLadders, RevenueMilestone } from '@/hooks/useRevenueLadder';
import { cn } from '@/lib/utils';

interface MilestoneManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  milestone?: RevenueMilestone | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  enablement: <Zap className="h-4 w-4" />,
  experience: <Sparkles className="h-4 w-4" />,
  assets: <Package className="h-4 w-4" />,
  cash: <Wallet className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  enablement: 'Enablement',
  experience: 'Experience',
  assets: 'Assets',
  cash: 'Cash',
};

export function MilestoneManagementModal({
  open,
  onOpenChange,
  mode,
  milestone,
}: MilestoneManagementModalProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: ladders } = useRevenueLadders();
  const {
    createMilestone,
    updateMilestone,
    deleteMilestone,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMilestoneManagement();

  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      display_name: '',
      description: '',
      threshold_amount: 0,
      ladder_id: '',
      default_category: null,
      suggested_reward_min: null,
      suggested_reward_max: null,
      display_order: 0,
      fiscal_year: new Date().getFullYear(),
    },
  });

  // Reset form when modal opens or milestone changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && milestone) {
        const rewardRange = milestone.suggested_reward_range as { min?: number; max?: number } | null;
        form.reset({
          display_name: milestone.display_name,
          description: milestone.description || '',
          threshold_amount: milestone.threshold_amount,
          ladder_id: milestone.ladder_id,
          default_category: milestone.default_category as MilestoneFormData['default_category'],
          suggested_reward_min: rewardRange?.min ?? null,
          suggested_reward_max: rewardRange?.max ?? null,
          display_order: milestone.display_order,
          fiscal_year: milestone.fiscal_year,
        });
      } else {
        // For create mode, set default ladder to annual if available
        const annualLadder = ladders?.find(l => l.track_type === 'annual');
        const maxOrder = ladders?.flatMap(l => l.revenue_milestones || [])
          .reduce((max, m) => Math.max(max, m.display_order), -1) ?? -1;
        
        form.reset({
          display_name: '',
          description: '',
          threshold_amount: 0,
          ladder_id: annualLadder?.id || '',
          default_category: null,
          suggested_reward_min: null,
          suggested_reward_max: null,
          display_order: maxOrder + 1,
          fiscal_year: new Date().getFullYear(),
        });
      }
    }
  }, [open, mode, milestone, ladders, form]);

  const watchedValues = form.watch();
  const selectedLadder = ladders?.find(l => l.id === watchedValues.ladder_id);
  const isAnnualTrack = selectedLadder?.track_type === 'annual';

  const onSubmit = async (data: MilestoneFormData) => {
    const input = {
      display_name: data.display_name,
      description: data.description,
      threshold_amount: data.threshold_amount,
      ladder_id: data.ladder_id,
      default_category: data.default_category,
      suggested_reward_range: data.suggested_reward_min || data.suggested_reward_max
        ? { min: data.suggested_reward_min ?? undefined, max: data.suggested_reward_max ?? undefined }
        : null,
      display_order: data.display_order,
      fiscal_year: isAnnualTrack ? data.fiscal_year : null,
    };

    try {
      if (mode === 'edit' && milestone) {
        await updateMilestone({ id: milestone.id, ...input });
      } else {
        await createMilestone(input as any);
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!milestone) return;
    try {
      await deleteMilestone(milestone.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  const isLoading = isCreating || isUpdating;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden gap-0">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/10 via-transparent to-premium/10 p-6 border-b border-border/30">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {mode === 'create' ? 'Create Milestone' : 'Edit Milestone'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'create'
                  ? 'Add a new revenue target to the ladder'
                  : `Editing ${milestone?.display_name}`}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Form Content */}
          <ScrollArea className="max-h-[60vh]">
            <Form {...form}>
              <form
                id="milestone-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="p-6 space-y-6"
              >
                {/* Basic Information Section */}
                <Card className="p-4 bg-card/50 border-border/30">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., €50K Target"
                              {...field}
                              className="bg-background/50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What does achieving this milestone mean for the team?"
                              className="bg-background/50 resize-none"
                              rows={3}
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                {/* Target Configuration Section */}
                <Card className="p-4 bg-card/50 border-border/30">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Target Configuration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="threshold_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Threshold Amount (€) *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="50000"
                                className="pl-9 bg-background/50"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ladder_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Track *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select track" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ladders?.map((ladder) => (
                                <SelectItem key={ladder.id} value={ladder.id}>
                                  <div className="flex items-center gap-2">
                                    {ladder.track_type === 'annual' ? (
                                      <Calendar className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Trophy className="h-4 w-4 text-premium" />
                                    )}
                                    {ladder.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <AnimatePresence>
                      {isAnnualTrack && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="col-span-1 sm:col-span-2"
                        >
                          <FormField
                            control={form.control}
                            name="fiscal_year"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fiscal Year</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type="number"
                                      placeholder={String(new Date().getFullYear())}
                                      className="pl-9 bg-background/50"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(e.target.value ? Number(e.target.value) : null)
                                      }
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Only applies to annual track milestones
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>

                {/* Reward Settings Section */}
                <Card className="p-4 bg-card/50 border-border/30">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Reward Settings
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="default_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Category</FormLabel>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['enablement', 'experience', 'assets', 'cash'] as const).map(
                              (category) => (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() =>
                                    field.onChange(field.value === category ? null : category)
                                  }
                                  className={cn(
                                    'flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
                                    'hover:bg-accent/10',
                                    field.value === category
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border/50 text-muted-foreground'
                                  )}
                                >
                                  {categoryIcons[category]}
                                  <span className="text-sm">{categoryLabels[category]}</span>
                                </button>
                              )
                            )}
                          </div>
                          <FormDescription>
                            Suggested reward category for this milestone
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="suggested_reward_min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Reward (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="500"
                                className="bg-background/50"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? Number(e.target.value) : null)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="suggested_reward_max"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Reward (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2000"
                                className="bg-background/50"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? Number(e.target.value) : null)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </Card>

                {/* Display Settings Section */}
                <Card className="p-4 bg-card/50 border-border/30">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Display Settings
                  </h3>
                  <FormField
                    control={form.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            className="bg-background/50 max-w-[120px]"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower numbers appear first in the ladder
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Card>

                {/* Live Preview */}
                <Card className="p-4 bg-muted/30 border-dashed">
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Preview
                  </p>
                  <div className="p-4 rounded-xl border border-border/30 bg-card/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className="text-xs bg-muted/50"
                          >
                            {selectedLadder?.track_type === 'annual' ? 'Annual' : 'Lifetime'}
                          </Badge>
                          {watchedValues.default_category && (
                            <Badge variant="secondary" className="text-xs">
                              {categoryIcons[watchedValues.default_category]}
                              <span className="ml-1">
                                {categoryLabels[watchedValues.default_category]}
                              </span>
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-lg truncate">
                          {watchedValues.display_name || 'Untitled Milestone'}
                        </h4>
                        {watchedValues.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {watchedValues.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(watchedValues.threshold_amount || 0)}
                        </p>
                        {(watchedValues.suggested_reward_min || watchedValues.suggested_reward_max) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reward: {formatCurrency(watchedValues.suggested_reward_min || 0)} - {formatCurrency(watchedValues.suggested_reward_max || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </form>
            </Form>
          </ScrollArea>

          {/* Footer with actions */}
          <div className="border-t border-border/30 p-4 flex items-center justify-between bg-muted/20">
            {mode === 'edit' ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="milestone-form"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {mode === 'create' ? 'Create Milestone' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{milestone?.display_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
