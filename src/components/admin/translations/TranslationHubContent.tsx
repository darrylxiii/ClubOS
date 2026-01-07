import { Skeleton } from "@/components/ui/skeleton";

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export function TranslationManagerContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Overview of all translations and localization status.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Translation Manager overview
      </div>
    </div>
  );
}

export function TranslationEditorContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Edit and manage translation strings across languages.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Translation Editor - integrates with existing editor
      </div>
    </div>
  );
}

export function TranslationCoverageContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Track translation coverage and identify missing translations.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Translation Coverage analytics
      </div>
    </div>
  );
}

export function BrandTermsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Define protected brand terms and translation rules.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Brand Terms manager
      </div>
    </div>
  );
}

export function TranslationAuditContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Audit translation quality and consistency.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Translation Audit tools
      </div>
    </div>
  );
}

export function LanguageManagerContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Manage supported languages and regional settings.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Language Manager - integrates with existing manager
      </div>
    </div>
  );
}
