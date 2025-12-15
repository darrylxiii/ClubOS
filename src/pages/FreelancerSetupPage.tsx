import { AppLayout } from "@/components/AppLayout";
import { FreelancerProfileBuilder } from "@/components/projects/freelancer/FreelancerProfileBuilder";

export default function FreelancerSetupPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <FreelancerProfileBuilder />
      </div>
    </AppLayout>
  );
}