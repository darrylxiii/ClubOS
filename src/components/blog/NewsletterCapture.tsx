import React, { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
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
      <div className={cn("bg-card rounded-xl p-6 shadow-glass-sm", className)}>
        <h3 className="font-semibold text-foreground mb-2">Stay Updated</h3>
        <p className="text-sm text-muted-foreground mb-4">Get the latest career insights.</p>
        {submitted ? (
          <div className="flex items-center gap-2 text-foreground"><Check className="h-4 w-4" /><span className="text-sm font-medium">Subscribed.</span></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required disabled={isLoading}
              className="flex-1 h-10 px-3 bg-transparent border-b border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors" />
            <Button type="submit" size="icon" disabled={isLoading} className="h-10 w-10 rounded-lg bg-foreground text-background hover:bg-foreground/90">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <section className={cn("py-16 md:py-24 border-t border-border", className)}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-xl font-semibold text-foreground mb-3">Career Intelligence, Delivered</h2>
          <p className="text-muted-foreground text-body-sm mb-2">Join 2,400+ professionals receiving curated insights.</p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-foreground mt-6"><Check className="h-5 w-5" /><span className="text-base font-medium">You're on the list.</span></div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mt-8">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required disabled={isLoading}
                className="flex-1 h-12 px-4 bg-transparent border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors" />
              <Button type="submit" disabled={isLoading} className="h-12 px-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-medium">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Subscribing...</> : <>Subscribe <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsletterCapture;
