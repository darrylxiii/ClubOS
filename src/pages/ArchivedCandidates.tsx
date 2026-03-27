import { useTranslation } from 'react-i18next';
import { ArchivedCandidatesView } from "@/components/admin/ArchivedCandidatesView";

export default function ArchivedCandidates() {
  const { t } = useTranslation('admin');
  return <ArchivedCandidatesView />;
}
