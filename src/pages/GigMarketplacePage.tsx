import { AppLayout } from "@/components/AppLayout";
import { GigMarketplace } from "@/components/projects/freelancer/GigMarketplace";

export default function GigMarketplacePage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <GigMarketplace />
      </div>
    </AppLayout>
  );
}