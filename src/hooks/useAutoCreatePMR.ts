/**
 * Auto-create Personal Meeting Room for users who don't have one
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAutoCreatePMR() {
  const { user } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || hasCheckedRef.current) return;
    
    hasCheckedRef.current = true;
    
    const ensurePMRExists = async () => {
      try {
        // Check if user already has a PMR
        const { data: existingPMR } = await supabase
          .from('personal_meeting_rooms')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingPMR) {
          console.log('[PMR] User already has a personal meeting room');
          return;
        }

        // Get user's profile name for generating room code
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        // Generate room code from name or fallback
        const baseName = profile?.full_name || user.email?.split('@')[0] || 'user';
        const sanitizedName = baseName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 15);
        
        let roomCode = `${sanitizedName}-room`;
        
        // Check uniqueness and append suffix if needed
        let attempts = 0;
        while (attempts < 10) {
          const { data: existing } = await supabase
            .from('personal_meeting_rooms')
            .select('id')
            .eq('room_code', roomCode)
            .maybeSingle();
          
          if (!existing) break;
          
          attempts++;
          roomCode = `${sanitizedName}-${Math.random().toString(36).substring(2, 6)}`;
        }

        // Create the PMR
        const { error } = await supabase
          .from('personal_meeting_rooms')
          .insert({
            user_id: user.id,
            room_code: roomCode,
            display_name: `${profile?.full_name || 'My'}'s Meeting Room`,
            is_active: true,
            allow_guests: true,
            require_approval: true
          });

        if (error) {
          // Ignore duplicate errors
          if (error.code === '23505') {
            console.log('[PMR] Room already exists (race condition)');
            return;
          }
          throw error;
        }

        console.log('[PMR] ✅ Auto-created personal meeting room:', roomCode);
      } catch (error) {
        console.error('[PMR] Error auto-creating PMR (non-critical):', error);
      }
    };

    // Run in background after a small delay to not block initial render
    setTimeout(ensurePMRExists, 2000);
  }, [user?.id, user?.email]);
}
