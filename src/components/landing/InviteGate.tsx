import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Lock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const InviteGate = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistData, setWaitlistData] = useState({ name: "", email: "", linkedin: "" });
  const navigate = useNavigate();

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate invite code validation
    setTimeout(() => {
      if (code.toLowerCase() === "quantum2025" || code.toLowerCase() === "elite") {
        toast.success("Access granted! Welcome to The Quantum Club.", {
          icon: <Sparkles className="h-4 w-4" />,
        });
        navigate("/auth");
      } else {
        toast.error("Invalid access code. Request an invite to join.");
      }
      setIsLoading(false);
      setCode("");
    }, 1500);
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Store waitlist entry in database
      const { error } = await supabase.from("waitlist").insert([
        {
          name: waitlistData.name,
          email: waitlistData.email,
          linkedin_url: waitlistData.linkedin,
        },
      ]);

      if (error) throw error;

      toast.success("You're on the list! We'll be in touch soon.", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      setShowWaitlist(false);
      setWaitlistData({ name: "", email: "", linkedin: "" });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <form onSubmit={handleCodeSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <div className="relative flex-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ENTER ACCESS CODE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="pl-10 h-12 text-sm font-bold uppercase tracking-wider border-2 border-foreground/20 focus:border-foreground"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !code}
            className="h-12 px-8 text-sm font-black uppercase tracking-wider"
          >
            {isLoading ? "VERIFYING..." : "UNLOCK"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowWaitlist(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
          >
            Don't have an invite? Join the waitlist
          </button>
        </div>
      </div>

      <Dialog open={showWaitlist} onOpenChange={setShowWaitlist}>
        <DialogContent className="sm:max-w-md border-2 border-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Join Waitlist</DialogTitle>
            <DialogDescription>
              Submit your details and we'll reach out if you're a fit for The Quantum Club.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWaitlistSubmit} className="space-y-4 mt-4">
            <div>
              <Input
                placeholder="Full Name"
                value={waitlistData.name}
                onChange={(e) => setWaitlistData({ ...waitlistData, name: e.target.value })}
                required
                className="border-2 border-foreground/20 focus:border-foreground"
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email Address"
                value={waitlistData.email}
                onChange={(e) => setWaitlistData({ ...waitlistData, email: e.target.value })}
                required
                className="border-2 border-foreground/20 focus:border-foreground"
              />
            </div>
            <div>
              <Input
                type="url"
                placeholder="LinkedIn Profile (Optional)"
                value={waitlistData.linkedin}
                onChange={(e) => setWaitlistData({ ...waitlistData, linkedin: e.target.value })}
                className="border-2 border-foreground/20 focus:border-foreground"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-sm font-black uppercase tracking-wider"
              disabled={isLoading}
            >
              {isLoading ? "SUBMITTING..." : "REQUEST ACCESS"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
