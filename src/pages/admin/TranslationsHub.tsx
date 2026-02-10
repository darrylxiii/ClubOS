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


            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="manager">Manager</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="coverage">Coverage</TabsTrigger>
              <TabsTrigger value="brand-terms">Brand Terms</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
              <TabsTrigger value="languages">Languages</TabsTrigger>
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
