import { AppLayout } from "@/components/AppLayout";
import { ProposalInbox } from "@/components/projects/proposals/ProposalInbox";
import { useParams } from "react-router-dom";

export default function ProjectProposalsPage() {
  const { projectId } = useParams();

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <ProposalInbox projectId={projectId} />
      </div>
    </AppLayout>
  );
}