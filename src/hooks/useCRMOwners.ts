import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Owner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useCRMOwners() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOwners() {
      try {
        // Fetch users who are admins or strategists (potential CRM owners)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .not('full_name', 'is', null)
          .order('full_name');

        if (error) throw error;
        setOwners(data || []);
      } catch (err) {
        console.error('Error fetching CRM owners:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOwners();
  }, []);

  return { owners, loading };
}
