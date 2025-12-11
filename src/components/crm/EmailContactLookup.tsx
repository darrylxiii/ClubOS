import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Search, Link2, User, Building2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MatchedProspect {
  id: string;
  company_name: string | null;
  first_name: string | null;
  email: string | null;
  stage: string;
}

export function EmailContactLookup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchedProspect[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    setSearched(true);

    const domain = email.split("@")[1];

    const { data, error } = await supabase
      .from("crm_prospects")
      .select("id, company_name, first_name, email, stage")
      .or(`email.ilike.%${email}%,email.ilike.%@${domain}`)
      .limit(10);

    if (error) {
      toast.error("Failed to search prospects");
      setLoading(false);
      return;
    }

    setMatches(data || []);
    setLoading(false);

    if (data?.length === 0) {
      toast.info("No matching prospects found");
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-500",
      contacted: "bg-purple-500/10 text-purple-500",
      qualified: "bg-green-500/10 text-green-500",
      proposal: "bg-amber-500/10 text-amber-500",
      negotiation: "bg-orange-500/10 text-orange-500",
      won: "bg-emerald-500/10 text-emerald-500",
      lost: "bg-red-500/10 text-red-500",
    };
    return colors[stage] || "bg-muted text-muted-foreground";
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Email Contact Lookup
        </CardTitle>
        <CardDescription>Link emails from your inbox to CRM prospects</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter email address to search"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            type="email"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {searched && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {matches.length > 0 ? (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {matches.map((prospect) => (
                      <motion.div
                        key={prospect.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{prospect.company_name || "Unknown"}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {prospect.first_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {prospect.first_name}
                                </span>
                              )}
                              <span>{prospect.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStageColor(prospect.stage)}>{prospect.stage}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => toast.success("Email linked")}>
                            <Link2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No matching prospects found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
