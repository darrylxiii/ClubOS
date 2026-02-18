import { AppLayout } from "@/components/AppLayout";
import { FreelancerProfileBuilder } from "@/components/projects/freelancer/FreelancerProfileBuilder";

export default function FreelancerSetupPage() {
  return (
    <AppLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <FreelancerProfileBuilder />
      </div>
    </AppLayout>
  );
}