import { useParams } from "react-router-dom";
import EnhancedProfile from "./EnhancedProfile";

export default function PublicUserProfile() {
  const { userId } = useParams<{ userId: string }>();

  // Show public view (no edit buttons) even for own profile when accessed via this route
  return <EnhancedProfile viewingUserId={userId} />;
}
