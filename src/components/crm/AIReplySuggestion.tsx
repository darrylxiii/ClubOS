import { useState } from 'react';
import { aiService } from '@/services/aiService';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Send, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIReplySuggestionProps {
  prospectName: string;
  prospectCompany: string;
  originalEmail: string;
  classification: string;
  onSend?: (reply: string) => void;
}

export function AIReplySuggestion({
  prospectName,
  prospectCompany,
  originalEmail,
  classification,
  onSend
}: AIReplySuggestionProps) {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tone, setTone] = useState('professional');

  const generateSuggestion = async () => {
    setLoading(true);
    try {
      // Using the provided instruction's structure for aiService.generateCrmReply
      // If `lastEmail` is not provided, `originalEmail` prop will be used as a fallback for content,
      // and `classification` prop for classification.
      const emailContent = originalEmail;
      const emailClassification = classification || 'neutral';

      const data = await aiService.generateCrmReply({
        prospect_id: '', // Context provided via 'context' param when ID missing
        context: emailContent,
        goal: emailClassification,
        tone: tone as 'casual' | 'friendly' | 'professional' | undefined
      });
      // The new service returns { reply, classification } directly
      // Corrected syntax for `data.reply || ''`
      setSuggestion(data.reply || '');
    } catch (error) {
      console.error('Error generating reply:', error);
      toast.error('Failed to generate reply suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestion);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (onSend) {
      onSend(suggestion);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-xl rounded-xl border border-primary/20 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Reply Suggestion</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateSuggestion}
          disabled={loading}
          className="h-7 text-xs"
        >
          <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />
          {suggestion ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {suggestion ? (
        <div className="space-y-3">
          {isEditing ? (
            <Textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              className="min-h-[120px] text-sm bg-background/50"
              onBlur={() => setIsEditing(false)}
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="p-3 bg-background/50 rounded-lg text-sm text-foreground cursor-text hover:bg-background/70 transition-colors min-h-[80px]"
            >
              {suggestion}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 mr-1 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-1" />
              Send Reply
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Click "Generate" to get an AI-powered reply suggestion based on the email context.
        </div>
      )}
    </motion.div>
  );
}
