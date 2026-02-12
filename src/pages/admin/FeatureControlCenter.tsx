import { useState, useMemo } from 'react';
import { useModuleFlags } from '@/hooks/useModuleFlags';
import { ModuleSummaryCards } from '@/components/admin/feature-control/ModuleSummaryCards';
import { CategoryFilter } from '@/components/admin/feature-control/CategoryFilter';
import { ModuleCard } from '@/components/admin/feature-control/ModuleCard';
import { Button } from '@/components/ui/button';
import { Loader2, Power, ShieldOff } from 'lucide-react';

// Core modules that "Disable all non-essential" will NOT touch
const CORE_FLAG_KEYS = new Set<string>([]);

export default function FeatureControlCenter() {
  const {
    modules,
    isLoading,
    categories,
    activeCount,
    disabledCount,
    pollingSavings,
    toggleModule,
    bulkToggle,
  } = useModuleFlags();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDisabledOnly, setShowDisabledOnly] = useState(false);

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (selectedCategory && m.metadata?.category !== selectedCategory) return false;
      if (showDisabledOnly && m.enabled) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.flag_key.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [modules, selectedCategory, searchQuery, showDisabledOnly]);

  const handleDisableCategory = (category: string) => {
    const ids = modules
      .filter((m) => m.metadata?.category === category && m.enabled)
      .map((m) => m.id);
    if (ids.length > 0) bulkToggle(ids, false);
  };

  const handleDisableNonEssential = () => {
    const ids = modules
      .filter((m) => m.enabled && !CORE_FLAG_KEYS.has(m.flag_key))
      .map((m) => m.id);
    if (ids.length > 0) bulkToggle(ids, false);
  };

  const handleEnableAll = () => {
    const ids = modules.filter((m) => !m.enabled).map((m) => m.id);
    if (ids.length > 0) bulkToggle(ids, true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Control Center</h1>
        <p className="text-muted-foreground mt-1">
          Toggle platform modules on and off. Disabled modules hide from navigation and stop background queries.
        </p>
      </div>

      <ModuleSummaryCards
        activeCount={activeCount}
        disabledCount={disabledCount}
        pollingSavings={pollingSavings}
      />

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showDisabledOnly={showDisabledOnly}
        onShowDisabledOnlyChange={setShowDisabledOnly}
      />

      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2">
        {selectedCategory && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDisableCategory(selectedCategory)}
            className="gap-1.5"
          >
            <ShieldOff className="h-3.5 w-3.5" />
            Disable all {selectedCategory}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisableNonEssential}
          className="gap-1.5"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          Disable all non-essential
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEnableAll}
          className="gap-1.5"
        >
          <Power className="h-3.5 w-3.5" />
          Enable all
        </Button>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredModules.map((mod) => (
          <ModuleCard key={mod.id} module={mod} onToggle={toggleModule} />
        ))}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No modules match your filters.
        </div>
      )}
    </div>
  );
}
