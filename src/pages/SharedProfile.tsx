import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";
import EnhancedProfile from "./EnhancedProfile";
import { toast } from "sonner";

export default function SharedProfile() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    try {
      // Track view and get user ID
      const { data, error: rpcError } = await supabase.rpc("track_share_link_view", {
        _token: token,
      });

      if (rpcError) throw rpcError;

      if (!data) {
        setError("This share link has expired or is invalid");
        setLoading(false);
        return;
      }

      setUserId(data);
    } catch (error: any) {
      console.error("Error validating token:", error);
      setError("Failed to load shared profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading shared profile...</p>
        </div>
      </div>
    );
  }

  if (error || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-6">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Link Expired</h2>
              <p className="text-muted-foreground mb-6">
                {error || "This share link is no longer valid."}
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Sign In to The Quantum Club
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header Banner for Shared View */}
      <div className="bg-primary/10 border-b border-primary/20 py-3 px-4 text-center">
        <p className="text-sm font-medium">
          You're viewing a shared profile •{" "}
          <Button
            variant="link"
            className="p-0 h-auto text-sm"
            onClick={() => navigate("/auth")}
          >
            Join The Quantum Club
          </Button>
        </p>
      </div>
      
      <EnhancedProfile viewingUserId={userId} isSharedView={true} />
    </div>
  );
}
