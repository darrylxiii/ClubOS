import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EnhancedProfile from "./EnhancedProfile";
import { useAuth } from "@/contexts/AuthContext";

export default function PublicUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to enhanced profile if viewing own profile
  useEffect(() => {
    if (user?.id && userId && user.id === userId) {
      navigate('/profile', { replace: true });
    }
  }, [userId, user, navigate]);

  // Render the same EnhancedProfile component but for another user
  return <EnhancedProfile viewingUserId={userId} />;
}
