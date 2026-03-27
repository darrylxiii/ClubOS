
import { useTranslation } from 'react-i18next';
import { ProposalInbox } from "@/components/projects/proposals/ProposalInbox";
import { useParams } from "react-router-dom";

export default function ProjectProposalsPage() {
  const { t } = useTranslation('common');
  const { projectId } = useParams();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <ProposalInbox projectId={projectId} />
    </div>
  );
}