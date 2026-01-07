import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Languages, Edit, BarChart3, Shield, FileCheck, Globe } from "lucide-react";
import {
  TranslationManagerContent,
  TranslationEditorContent,
  TranslationCoverageContent,
  BrandTermsContent,
  TranslationAuditContent,
  LanguageManagerContent,
} from "@/components/admin/translations/TranslationHubContent";

export default function TranslationHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]}>
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Languages className="h-8 w-8" />
              Translation Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Unified localization management and translation tools
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <Languages className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="editor" className="gap-2">
                <Edit className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="coverage" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Coverage
              </TabsTrigger>
              <TabsTrigger value="brand" className="gap-2">
                <Shield className="h-4 w-4" />
                Brand Terms
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Audit
              </TabsTrigger>
              <TabsTrigger value="languages" className="gap-2">
                <Globe className="h-4 w-4" />
                Languages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <TranslationManagerContent />
            </TabsContent>

            <TabsContent value="editor">
              <TranslationEditorContent />
            </TabsContent>

            <TabsContent value="coverage">
              <TranslationCoverageContent />
            </TabsContent>

            <TabsContent value="brand">
              <BrandTermsContent />
            </TabsContent>

            <TabsContent value="audit">
              <TranslationAuditContent />
            </TabsContent>

            <TabsContent value="languages">
              <LanguageManagerContent />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
