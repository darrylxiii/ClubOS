import { FreelancerProfileBuilder } from "@/components/projects/freelancer/FreelancerProfileBuilder";
import { GigMarketplace } from "@/components/projects/freelancer/GigMarketplace";
import { ProposalInbox } from "@/components/projects/proposals/ProposalInbox";
import { TimeTrackingDashboard } from "@/components/time-tracking/TimeTrackingDashboard";

export function FreelancerSetupContent() {
  return (
    <div className="max-w-4xl">
      <FreelancerProfileBuilder />
    </div>
  );
}

export function GigMarketplaceContent() {
  return <GigMarketplace />;
}

export function MyProposalsContent() {
  return <ProposalInbox />;
}

export function TimeTrackingContent() {
  return <TimeTrackingDashboard />;
}
