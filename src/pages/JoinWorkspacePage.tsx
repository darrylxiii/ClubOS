import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useInvitationByToken, useAcceptInvitation } from '@/hooks/useWorkspaceInvitations';
import { LoadingSpinner, PageLoading } from '@/components/ui/loading-spinner';
import { formatDistanceToNow } from 'date-fns';

export default function JoinWorkspacePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: invitation, isLoading: invLoading } = useInvitationByToken(token);
  const acceptInvitation = useAcceptInvitation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // Store the invite URL to redirect back after login
      sessionStorage.setItem('postLoginRedirect', `/workspace/join/${token}`);
      navigate('/auth');
    }
  }, [user, authLoading, token, navigate]);

  const handleAccept = async () => {
    if (!token) return;
    
    try {
      const result = await acceptInvitation.mutateAsync(token);
      navigate('/pages');
    } catch (error) {
      // Error handled in hook
    }
  };

  if (authLoading || invLoading) {
    return <PageLoading />;
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired. Please ask the workspace owner to send you a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate('/pages')}>
              Go to My Pages
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-3xl mb-4">
            {invitation.workspace?.icon_emoji || '📁'}
          </div>
          <CardTitle className="text-2xl">
            Join {invitation.workspace?.name}
          </CardTitle>
          <CardDescription>
            You've been invited to collaborate
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Inviter Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-10 w-10">
              <AvatarImage src={invitation.inviter_profile?.avatar_url || undefined} />
              <AvatarFallback>
                {invitation.inviter_profile?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {invitation.inviter_profile?.full_name || 'Someone'} invited you
              </p>
              <p className="text-xs text-muted-foreground">
                as {invitation.role}
              </p>
            </div>
          </div>

          {/* Workspace Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {invitation.workspace?.type === 'company' ? 'Company workspace' : 'Team workspace'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Current User */}
          {user && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Joining as <span className="font-medium">{user.email}</span>
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleAccept} 
            className="w-full"
            disabled={acceptInvitation.isPending}
          >
            {acceptInvitation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Joining...
              </>
            ) : (
              <>
                Accept Invitation
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate('/pages')}
          >
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
