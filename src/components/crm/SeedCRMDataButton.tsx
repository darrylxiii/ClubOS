import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeedCRMDataButtonProps {
  onSuccess?: () => void;
}

export function SeedCRMDataButton({ onSuccess }: SeedCRMDataButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-crm-data');
      
      if (error) throw error;
      
      toast.success(`Seeded ${data.data.prospects} prospects, ${data.data.campaigns} campaigns, and ${data.data.replies} replies`);
      onSuccess?.();
    } catch (error: any) {
      console.error('Seed error:', error);
      toast.error(error.message || 'Failed to seed CRM data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSeed} 
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Database className="w-4 h-4" />
      )}
      Seed Sample Data
    </Button>
  );
}
