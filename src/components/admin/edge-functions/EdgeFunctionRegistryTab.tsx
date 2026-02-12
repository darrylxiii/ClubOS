import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEdgeFunctionRegistry, useEdgeFunctionCategories, useToggleEdgeFunction, useBulkToggleFunctions, useUpdateSamplingRate, type EdgeFunctionEntry } from '@/hooks/useEdgeFunctionRegistry';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Search, Power, PowerOff, Filter, Info, Ban, DollarSign, Gauge } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';

const CRITICAL_CATEGORIES = ['Infrastructure', 'Security'];

export function EdgeFunctionRegistryTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDisabledOnly, setShowDisabledOnly] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string; name: string; isActive: boolean }>({
    open: false, id: '', name: '', isActive: false,
  });

  const { data: functions = [], isLoading } = useEdgeFunctionRegistry();
  const { data: categories = [] } = useEdgeFunctionCategories();
  const toggleFn = useToggleEdgeFunction();
  const bulkToggle = useBulkToggleFunctions();

  const filtered = functions.filter(fn => {
    const matchesSearch = !search ||
      fn.function_name.toLowerCase().includes(search.toLowerCase()) ||
      fn.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      fn.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || fn.category === categoryFilter;
    const matchesDisabled = !showDisabledOnly || fn.is_active === false;
    return matchesSearch && matchesCategory && matchesDisabled;
  });

  const activeCount = filtered.filter(f => f.is_active !== false).length;
  const disabledCount = filtered.length - activeCount;
  const totalDisabled = functions.filter(f => f.is_active === false).length;

  const handleToggle = (fn: EdgeFunctionEntry, newActive: boolean) => {
    if (!newActive && fn.category && CRITICAL_CATEGORIES.includes(fn.category)) {
      setConfirmDialog({ open: true, id: fn.id, name: fn.display_name || fn.function_name, isActive: newActive });
    } else {
      toggleFn.mutate({ id: fn.id, isActive: newActive });
    }
  };

  const handleConfirmToggle = () => {
    toggleFn.mutate({ id: confirmDialog.id, isActive: confirmDialog.isActive });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search functions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={showDisabledOnly ? 'default' : 'outline'} size="sm" onClick={() => setShowDisabledOnly(!showDisabledOnly)} className="gap-1.5">
          <Ban className="h-4 w-4" />
          Disabled ({totalDisabled})
        </Button>
        <Button variant="outline" size="sm" onClick={() => bulkToggle.mutate({ category: categoryFilter, isActive: true })} disabled={bulkToggle.isPending}>
          <Power className="h-4 w-4 mr-1" />
          Enable All
        </Button>
        <Button variant="outline" size="sm" onClick={() => bulkToggle.mutate({ category: categoryFilter, isActive: false })} disabled={bulkToggle.isPending}>
          <PowerOff className="h-4 w-4 mr-1" />
          Disable All
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-3 text-sm text-muted-foreground">
        <span>Showing {filtered.length} functions</span>
        <span>•</span>
        <span className="text-green-500">{activeCount} active</span>
        <span>•</span>
        <span className="text-red-500">{disabledCount} disabled</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <TooltipProvider delayDuration={300}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b z-10">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Function</th>
                    <th className="p-3 font-medium hidden md:table-cell">Category</th>
                    <th className="p-3 font-medium text-center">Status</th>
                    <th className="p-3 font-medium text-center hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5" /> Sampling
                        </TooltipTrigger>
                        <TooltipContent>Percentage of calls that actually execute (0–100%)</TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="p-3 font-medium text-right hidden lg:table-cell">Invocations</th>
                    <th className="p-3 font-medium text-right hidden xl:table-cell">Error Rate</th>
                    <th className="p-3 font-medium text-right hidden xl:table-cell">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" /> Cost/Call
                        </TooltipTrigger>
                        <TooltipContent>Estimated external API + compute cost per invocation</TooltipContent>
                      </Tooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No functions found</td></tr>
                  ) : (
                    filtered.map(fn => (
                      <FunctionRow key={fn.id} fn={fn} onToggle={handleToggle} />
                    ))
                  )}
                </tbody>
              </table>
            </TooltipProvider>
          </ScrollArea>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title="Disable critical function?"
        description={`"${confirmDialog.name}" belongs to a critical category (Infrastructure/Security). Disabling it may affect platform stability. Are you sure?`}
        confirmText="Disable Function"
        variant="destructive"
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
}

function FunctionRow({ fn, onToggle }: { fn: EdgeFunctionEntry; onToggle: (fn: EdgeFunctionEntry, active: boolean) => void }) {
  const isActive = fn.is_active !== false;
  const errorRate = Number(fn.error_rate) || 0;
  const isCritical = fn.category && CRITICAL_CATEGORIES.includes(fn.category);
  const samplingRate = Number(fn.sampling_rate ?? 1) * 100;
  const updateSampling = useUpdateSamplingRate();
  const costPerCall = (Number(fn.external_api_cost_per_call) || 0) + (Number(fn.compute_cost_estimate_per_call) || 0);

  return (
    <tr className={`border-b hover:bg-muted/30 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
      <td className="p-3">
        <div className="flex items-start gap-1.5">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-medium">{fn.display_name || fn.function_name}</p>
              {fn.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">{fn.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {isCritical && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-destructive/30 text-destructive">Critical</Badge>
              )}
              {fn.tags && fn.tags.length > 0 && fn.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{fn.function_name}</p>
            {!isActive && fn.admin_disabled_at && (
              <p className="text-[10px] text-destructive/70 mt-0.5">
                Disabled {formatDistanceToNow(new Date(fn.admin_disabled_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="p-3 hidden md:table-cell">
        <Badge variant="outline" className="text-xs">{fn.category || 'Uncategorized'}</Badge>
      </td>
      <td className="p-3 text-center">
        <Switch checked={isActive} onCheckedChange={(checked) => onToggle(fn, checked)} aria-label={`Toggle ${fn.function_name}`} />
      </td>
      <td className="p-3 hidden lg:table-cell">
        <div className="flex items-center gap-2 min-w-[120px]">
          <Slider
            value={[samplingRate]}
            min={0}
            max={100}
            step={5}
            className="flex-1"
            onValueCommit={([val]) => updateSampling.mutate({ id: fn.id, rate: val / 100 })}
          />
          <span className="text-xs font-mono w-10 text-right text-muted-foreground">{samplingRate}%</span>
        </div>
      </td>
      <td className="p-3 text-right hidden lg:table-cell font-mono text-xs">
        {(fn.invocation_count || 0).toLocaleString()}
      </td>
      <td className="p-3 text-right hidden xl:table-cell">
        <span className={`text-xs font-mono ${errorRate > 10 ? 'text-red-500' : errorRate > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
          {errorRate.toFixed(1)}%
        </span>
      </td>
      <td className="p-3 text-right hidden xl:table-cell font-mono text-xs text-muted-foreground">
        {costPerCall > 0 ? `$${costPerCall.toFixed(4)}` : '—'}
      </td>
    </tr>
  );
}
