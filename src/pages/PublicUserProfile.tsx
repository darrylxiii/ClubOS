import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EnhancedProfile from "./EnhancedProfile";
import { MinimalHeader } from "@/components/MinimalHeader";
import { Loader2 } from "lucide-react";

export default function PublicUserProfile() {
  const { userIdOrSlug } = useParams<{ userIdOrSlug: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveUserId = async () => {
      if (!userIdOrSlug) {
        setLoading(false);
        return;
      }

      // Check if it's a UUID (user ID) or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrSlug);

      if (isUUID) {
        setUserId(userIdOrSlug);
      } else {
        // Look up user by slug
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('profile_slug', userIdOrSlug)
          .single();

        if (data && !error) {
          setUserId(data.id);
        }
      }

      setLoading(false);
    };

    resolveUserId();
  }, [userIdOrSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <MinimalHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col">
        <MinimalHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  // Show public view (no edit buttons) even for own profile when accessed via this route
  return (
    <div className="min-h-screen flex flex-col">
      <MinimalHeader />
      <div className="flex-1">
        <EnhancedProfile viewingUserId={userId} />
      </div>
    </div>
  );
}
