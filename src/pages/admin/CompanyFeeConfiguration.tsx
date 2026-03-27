import { useTranslation } from 'react-i18next';
import { CompanyFeeManagement } from "@/components/financial/CompanyFeeManagement";

export default function CompanyFeeConfiguration() {
  const { t } = useTranslation('admin');
  return <CompanyFeeManagement />;
}
