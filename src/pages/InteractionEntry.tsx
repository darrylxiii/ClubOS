import { InteractionEntryForm } from '@/components/interactions/InteractionEntryForm';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';

export default function InteractionEntry() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Interaction</h1>
        <p className="text-muted-foreground">Record a manual interaction with a company</p>
      </div>

      <InteractionEntryForm onSuccess={() => navigate('/interactions')} />
      </div>
    </AppLayout>
  );
}
