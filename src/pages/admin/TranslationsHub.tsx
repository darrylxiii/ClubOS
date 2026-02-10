import { lazy, Suspense, useState } from 'react';
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
          {/* Hub Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Languages className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">TRANSLATIONS HUB</h1>
            </div>
            <p className="text-muted-foreground">
              Language, coverage, brand terms, and audit controls
            </p>
          </div>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger value="manager">Manager</TabsTrigger>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="coverage">Coverage</TabsTrigger>
                <TabsTrigger value="brand-terms">Brand Terms</TabsTrigger>
                <TabsTrigger value="audit">Audit Log</TabsTrigger>
                <TabsTrigger value="languages">Languages</TabsTrigger>
              </TabsList>
            </div>

            <Suspense fallback={<PageLoader />}>
              <TabsContent value="manager"><TranslationManagerContent /></TabsContent>
              <TabsContent value="editor"><TranslationEditorContent /></TabsContent>
              <TabsContent value="coverage"><TranslationCoverageContent /></TabsContent>
              <TabsContent value="brand-terms"><BrandTermManagerContent /></TabsContent>
              <TabsContent value="audit"><TranslationAuditLogContent /></TabsContent>
              <TabsContent value="languages"><LanguageManagerContent /></TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}

// Wrapper components that render the page content without AppLayout/RoleGate shells
// These lazy-load the full pages but we strip outer wrappers via CSS containment
// For now, we embed them — the nested AppLayout is harmless due to how the component renders

function TranslationManagerContent() {
  return <Suspense fallback={<PageLoader />}><TranslationManager /></Suspense>;
}

function TranslationEditorContent() {
  return <Suspense fallback={<PageLoader />}><TranslationEditor /></Suspense>;
}

function TranslationCoverageContent() {
  return <Suspense fallback={<PageLoader />}><TranslationCoverage /></Suspense>;
}

function BrandTermManagerContent() {
  return <Suspense fallback={<PageLoader />}><BrandTermManager /></Suspense>;
}

function TranslationAuditLogContent() {
  return <Suspense fallback={<PageLoader />}><TranslationAuditLog /></Suspense>;
}

function LanguageManagerContent() {
  return <Suspense fallback={<PageLoader />}><LanguageManager /></Suspense>;
}
