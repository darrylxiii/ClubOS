import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Video, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

export default function JoinMeeting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);

  const formatCode = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Limit to 10 characters (abc-defg-hij format)
    return cleaned.slice(0, 10);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
  };

  const displayCode = (code: string) => {
    // Format as: ABC-DEFG-HIJ
    if (code.length <= 3) return code;
    if (code.length <= 7) return `${code.slice(0, 3)}-${code.slice(3)}`;
    return `${code.slice(0, 3)}-${code.slice(3, 7)}-${code.slice(7)}`;
  };

  const joinMeeting = async () => {
    if (code.length < 10) {
      toast.error('Please enter a valid meeting code');
      return;
    }

    setLoading(true);
    try {
      // Format the code properly
      const formattedCode = displayCode(code).toLowerCase();
      
      // Check if meeting exists
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('id, meeting_code, title, status, host_id')
        .eq('meeting_code', formattedCode)
        .single();

      if (error || !meeting) {
        toast.error('Meeting not found', {
          description: 'Please check the code and try again',
        });
        return;
      }

      if (meeting.status === 'ended') {
        toast.error('This meeting has ended');
        return;
      }

      // Track join via code
      await supabase
        .from('meeting_join_logs')
        .insert({
          meeting_id: meeting.id,
          join_method: 'code',
          join_source: 'join_page',
        });

      toast.success('Joining meeting...', {
        description: meeting.title,
      });

      // Navigate to meeting room
      navigate(`/meeting/${formattedCode}`);
    } catch (error: unknown) {
      console.error('Error joining meeting:', error);
      toast.error('Failed to join meeting', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 10) {
      joinMeeting();
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="w-full max-w-md glass-subtle border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join a Meeting</CardTitle>
            <CardDescription>
              Enter the meeting code to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Meeting Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="ABC-DEFG-HIJ"
                value={displayCode(code)}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                className="text-center text-lg font-mono tracking-wider uppercase"
                maxLength={12}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 10-character meeting code
              </p>
            </div>

            <Button
              onClick={joinMeeting}
              disabled={loading || code.length < 10}
              className="w-full"
              size="lg"
            >
              {loading ? (
                'Joining...'
              ) : (
                <>
                  Join Meeting
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/meetings?tab=calendar')}
              >
                View My Meetings
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/meetings')}
              >
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Create New Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}