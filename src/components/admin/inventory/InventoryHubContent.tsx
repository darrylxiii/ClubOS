import { Skeleton } from "@/components/ui/skeleton";

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

export function InventoryDashboardContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Overview of all assets and inventory status.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Inventory Dashboard overview
      </div>
    </div>
  );
}

export function AssetRegisterContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Complete register of all company assets.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Asset Register - integrates with existing register
      </div>
    </div>
  );
}

export function DepreciationContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Track asset depreciation schedules and values.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Depreciation Schedule
      </div>
    </div>
  );
}

export function IntangibleAssetsContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Manage intangible assets like software licenses and IP.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        Intangible Assets register
      </div>
    </div>
  );
}

export function KIAOptimizationContent() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Optimize KIA (Kleinschaligheidsinvesteringsaftrek) tax benefits.
      </p>
      <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
        KIA Optimization tools
      </div>
    </div>
  );
}
