import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEdgeFunctionRegistry, useEdgeFunctionCategories, useToggleEdgeFunction, useBulkToggleFunctions, type EdgeFunctionEntry } from '@/hooks/useEdgeFunctionRegistry';
import { Search, Power, PowerOff, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export function EdgeFunctionRegistryTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
    return matchesSearch && matchesCategory;
  });

  const activeCount = filtered.filter(f => f.is_active !== false).length;
  const disabledCount = filtered.length - activeCount;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search functions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => bulkToggle.mutate({ category: categoryFilter, isActive: true })}
          disabled={bulkToggle.isPending}
        >
          <Power className="h-4 w-4 mr-1" />
          Enable All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => bulkToggle.mutate({ category: categoryFilter, isActive: false })}
          disabled={bulkToggle.isPending}
        >
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
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="p-3 font-medium">Function</th>
                  <th className="p-3 font-medium hidden md:table-cell">Category</th>
                  <th className="p-3 font-medium text-center">Status</th>
                  <th className="p-3 font-medium text-right hidden lg:table-cell">Invocations</th>
                  <th className="p-3 font-medium text-right hidden lg:table-cell">Avg Time</th>
                  <th className="p-3 font-medium text-right hidden xl:table-cell">Error Rate</th>
                  <th className="p-3 font-medium text-right hidden xl:table-cell">Last Invoked</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No functions found</td></tr>
                ) : (
                  filtered.map(fn => (
                    <FunctionRow key={fn.id} fn={fn} onToggle={(id, active) => toggleFn.mutate({ id, isActive: active })} />
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function FunctionRow({ fn, onToggle }: { fn: EdgeFunctionEntry; onToggle: (id: string, active: boolean) => void }) {
  const isActive = fn.is_active !== false;
  const errorRate = Number(fn.error_rate) || 0;

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div>
          <p className="font-medium">{fn.display_name || fn.function_name}</p>
          <p className="text-xs text-muted-foreground font-mono">{fn.function_name}</p>
        </div>
      </td>
      <td className="p-3 hidden md:table-cell">
        <Badge variant="outline" className="text-xs">{fn.category || 'Uncategorized'}</Badge>
      </td>
      <td className="p-3 text-center">
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => onToggle(fn.id, checked)}
          aria-label={`Toggle ${fn.function_name}`}
        />
      </td>
      <td className="p-3 text-right hidden lg:table-cell font-mono text-xs">
        {(fn.invocation_count || 0).toLocaleString()}
      </td>
      <td className="p-3 text-right hidden lg:table-cell font-mono text-xs">
        {fn.avg_execution_time_ms ? `${Number(fn.avg_execution_time_ms).toFixed(0)}ms` : '—'}
      </td>
      <td className="p-3 text-right hidden xl:table-cell">
        <span className={`text-xs font-mono ${errorRate > 10 ? 'text-red-500' : errorRate > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
          {errorRate.toFixed(1)}%
        </span>
      </td>
      <td className="p-3 text-right hidden xl:table-cell text-xs text-muted-foreground">
        {fn.last_invoked_at ? format(new Date(fn.last_invoked_at), 'MMM d, HH:mm') : '—'}
      </td>
    </tr>
  );
}
