import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TrendingUp, Target, Brain, DollarSign, Compass } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load tab content to improve initial load
const CareerPathContent = lazy(() => import("@/components/career/CareerPathContent"));
const CareerInsightsContent = lazy(() => import("@/components/career/CareerInsightsContent"));
const SalaryInsightsContent = lazy(() => import("@/components/career/SalaryInsightsContent"));

function TabSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export default function CareerHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "path";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Career Hub</h1>
              <p className="text-muted-foreground">
                Your complete career intelligence center
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max h-auto p-1">
              <TabsTrigger value="path" className="gap-2 min-h-[44px] px-4">
                <Target className="h-4 w-4" />
                <span>Career Path</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2 min-h-[44px] px-4">
                <Brain className="h-4 w-4" />
                <span>AI Insights</span>
              </TabsTrigger>
              <TabsTrigger value="salary" className="gap-2 min-h-[44px] px-4">
                <DollarSign className="h-4 w-4" />
                <span>Salary Data</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="path" className="mt-6">
            <Suspense fallback={<TabSkeleton />}>
              <CareerPathContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <Suspense fallback={<TabSkeleton />}>
              <CareerInsightsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="salary" className="mt-6">
            <Suspense fallback={<TabSkeleton />}>
              <SalaryInsightsContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
