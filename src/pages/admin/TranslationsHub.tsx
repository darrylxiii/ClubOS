import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Languages } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

const TranslationManager = lazy(() => import('@/pages/admin/TranslationManager'));
const TranslationEditor = lazy(() => import('@/pages/admin/TranslationEditor'));
const TranslationCoverage = lazy(() => import('@/pages/admin/TranslationCoverage'));
const BrandTermManager = lazy(() => import('@/pages/admin/BrandTermManager'));
const TranslationAuditLog = lazy(() => import('@/pages/admin/TranslationAuditLog'));
const LanguageManager = lazy(() => import('@/pages/admin/LanguageManager'));

const TAB_MAP: Record<string, string> = {
  manager: 'manager',
  editor: 'editor',
  coverage: 'coverage',
  'brand-terms': 'brand-terms',
  audit: 'audit',
  languages: 'languages',
};

const triggerClass = "text-foreground/70 data-[state=active]:text-foreground";

export default function TranslationsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'manager';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'manager' ? {} : { tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Languages className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">TRANSLATIONS HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Language, coverage, brand terms, and audit controls
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-muted/50 p-1 rounded-lg h-auto gap-1">
              <TabsTrigger value="manager" className={triggerClass}>Manager</TabsTrigger>
              <TabsTrigger value="editor" className={triggerClass}>Editor</TabsTrigger>
              <TabsTrigger value="coverage" className={triggerClass}>Coverage</TabsTrigger>
              <TabsTrigger value="brand-terms" className={triggerClass}>Brand Terms</TabsTrigger>
              <TabsTrigger value="audit" className={triggerClass}>Audit Log</TabsTrigger>
              <TabsTrigger value="languages" className={triggerClass}>Languages</TabsTrigger>
            </TabsList>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="manager"><TranslationManager /></TabsContent>
              <TabsContent value="editor"><TranslationEditor /></TabsContent>
              <TabsContent value="coverage"><TranslationCoverage /></TabsContent>
              <TabsContent value="brand-terms"><BrandTermManager /></TabsContent>
              <TabsContent value="audit"><TranslationAuditLog /></TabsContent>
              <TabsContent value="languages"><LanguageManager /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
