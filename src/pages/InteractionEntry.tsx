import { useTranslation } from 'react-i18next';
import { InteractionEntryForm } from '@/components/interactions/InteractionEntryForm';
import { useNavigate } from 'react-router-dom';

export default function InteractionEntry() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('interactions.newInteraction')}</h1>
        <p className="text-muted-foreground">{t('interactions.recordManual')}</p>
      </div>

      <InteractionEntryForm onSuccess={() => navigate('/interactions')} />
    </div>
  );
}
