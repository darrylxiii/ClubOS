import { GlobalJobsMap } from "@/components/maps/GlobalJobsMap";

/**
 * Map tab content for the Jobs Hub
 * Embeds the GlobalJobsMap directly without page chrome
 */
export function MapTabContent() {
  return (
    <div className="rounded-xl overflow-hidden border border-border/30">
      <GlobalJobsMap className="h-[calc(100vh-20rem)]" />
    </div>
  );
}
