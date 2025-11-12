import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, UserCheck, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MergePreviewDialog } from "./MergePreviewDialog";

interface CandidateProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  profile_completeness?: number;
  invitation_status?: string;
  user_id?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export function ManualMergeSearch() {
  const [candidateSearch, setCandidateSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [candidateResults, setCandidateResults] = useState<CandidateProfile[]>([]);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const searchCandidates = async () => {
    if (!candidateSearch.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setLoadingCandidates(true);
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, phone, profile_completeness, invitation_status, user_id')
        .or(`full_name.ilike.%${candidateSearch}%,email.ilike.%${candidateSearch}%`)
        .limit(10);

      if (error) throw error;
      setCandidateResults(data || []);
      
      if (!data || data.length === 0) {
        toast.info("No candidates found");
      }
    } catch (error) {
      console.error('Error searching candidates:', error);
      toast.error('Failed to search candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const searchUsers = async () => {
    if (!userSearch.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setLoadingUsers(true);
    try {
      // Search for users that don't have a linked candidate profile
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(10);

      if (profileError) throw profileError;

      // Filter out users who already have a candidate profile linked
      const { data: linkedCandidates, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('user_id')
        .not('user_id', 'is', null);

      if (candidateError) throw candidateError;

      const linkedUserIds = new Set(linkedCandidates?.map(c => c.user_id) || []);
      const unlinkedUsers = profiles?.filter(p => !linkedUserIds.has(p.id)) || [];

      setUserResults(unlinkedUsers);
      
      if (unlinkedUsers.length === 0) {
        toast.info("No unlinked users found");
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCandidateSelect = (candidate: CandidateProfile) => {
    if (candidate.user_id) {
      toast.error("This candidate is already linked to a user");
      return;
    }
    
    // Warn about null email
    if (!candidate.email) {
      toast.error("This candidate has no email address. Please update the candidate profile before merging.");
      return;
    }
    
    setSelectedCandidate(candidate);
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
  };

  const handlePreviewMerge = () => {
    if (!selectedCandidate || !selectedUser) {
      toast.error("Please select both a candidate and a user");
      return;
    }
    setShowPreview(true);
  };

  const handleMergeSuccess = () => {
    setShowPreview(false);
    setSelectedCandidate(null);
    setSelectedUser(null);
    setCandidateResults([]);
    setUserResults([]);
    setCandidateSearch("");
    setUserSearch("");
    toast.success("Profiles merged successfully!");
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Select Candidate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Step 1: Select Candidate Profile
            </CardTitle>
            <CardDescription>
              Search for an unlinked candidate profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCandidates()}
              />
              <Button onClick={searchCandidates} disabled={loadingCandidates}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {selectedCandidate && (
              <Card className="bg-primary/10 border-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedCandidate.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCandidate.email}</p>
                    </div>
                    <Badge variant="default">Selected</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {candidateResults.map((candidate) => (
                <Card 
                  key={candidate.id} 
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedCandidate?.id === candidate.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleCandidateSelect(candidate)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{candidate.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.email || <span className="text-destructive">No email</span>}
                        </p>
                        {candidate.phone && (
                          <p className="text-xs text-muted-foreground">{candidate.phone}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!candidate.email && (
                          <Badge variant="destructive">Missing Email</Badge>
                        )}
                        <Badge variant={candidate.user_id ? "destructive" : "secondary"}>
                          {candidate.user_id ? "Linked" : "Unlinked"}
                        </Badge>
                        {candidate.profile_completeness !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {candidate.profile_completeness}% complete
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Step 2: Select User Account
            </CardTitle>
            <CardDescription>
              Search for a registered user without a candidate profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={loadingUsers}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {selectedUser && (
              <Card className="bg-primary/10 border-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedUser.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <Badge variant="default">Selected</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {userResults.map((user) => (
                <Card 
                  key={user.id} 
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedUser?.id === user.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3: Preview & Execute */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Ready to merge?</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCandidate && selectedUser
                  ? `Link ${selectedCandidate.full_name} to ${selectedUser.full_name}`
                  : 'Select both a candidate and a user to continue'}
              </p>
            </div>
            <Button 
              onClick={handlePreviewMerge}
              disabled={!selectedCandidate || !selectedUser}
              size="lg"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Preview Merge
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && selectedCandidate && selectedUser && (
        <MergePreviewDialog
          candidateId={selectedCandidate.id}
          userId={selectedUser.id}
          open={showPreview}
          onClose={() => setShowPreview(false)}
          onSuccess={handleMergeSuccess}
        />
      )}
    </>
  );
}
