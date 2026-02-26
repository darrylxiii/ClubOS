import React, { useState } from 'react';
import { Mail, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NewsletterCaptureProps { variant?: 'section' | 'inline'; className?: string; }

const NewsletterCapture: React.FC<NewsletterCaptureProps> = ({ variant = 'section', className }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      setSubmitted(true); setEmail('');
      toast.success("Welcome to The Quantum Club Insights.");
    } catch { toast.error("Failed to subscribe."); }
    finally { setIsLoading(false); }
  };

  if (variant === 'inline') {
    return (
      <div className={cn("bg-card border border-border rounded-2xl p-6", className)}>
        <h3 className="font-semibold text-foreground mb-2">Stay Updated</h3>
        <p className="text-sm text-muted-foreground mb-4">Get the latest career insights.</p>
        {submitted ? (
          <div className="flex items-center gap-2 text-accent"><Check className="h-5 w-5" /><span className="text-sm font-medium">Subscribed.</span></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required disabled={isLoading} className="flex-1 h-10 rounded-full text-sm" />
            <Button type="submit" size="icon" disabled={isLoading} className="h-10 w-10 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <section className={cn("py-16 md:py-20 bg-muted/50", className)}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-accent/20 mb-6">
            <Mail className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">Career Intelligence, Delivered</h2>
          <p className="text-muted-foreground mb-8">Join top-tier professionals. Get curated insights on talent strategy, market trends, and career acceleration.</p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-accent"><Check className="h-6 w-6" /><span className="text-lg font-medium">You're on the list.</span></div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required disabled={isLoading} className="flex-1 h-12 rounded-full bg-card border-border" />
              <Button type="submit" disabled={isLoading} className="h-12 px-8 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-medium">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Subscribing...</> : <>Subscribe <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          )}
          <p className="mt-4 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterCapture;
