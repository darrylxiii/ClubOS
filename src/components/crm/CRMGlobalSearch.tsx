import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Building2, User, FileText, Mail, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "prospect" | "campaign" | "activity";
  title: string;
  subtitle: string;
  stage?: string;
}

interface CRMGlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CRMGlobalSearch({ open, onOpenChange }: CRMGlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    const searchResults: SearchResult[] = [];

    // Search prospects
    const { data: prospects } = await supabase
      .from("crm_prospects")
      .select("id, company_name, first_name, last_name, stage")
      .or(`company_name.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(5);

    if (prospects) {
      prospects.forEach((p) => {
        searchResults.push({
          id: p.id,
          type: "prospect",
          title: p.company_name || "Unknown Company",
          subtitle: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : "No contact",
          stage: p.stage,
        });
      });
    }

    // Search campaigns
    const { data: campaigns } = await supabase
      .from("crm_campaigns")
      .select("id, name, status")
      .ilike("name", `%${searchQuery}%`)
      .limit(3);

    if (campaigns) {
      campaigns.forEach((c) => {
        searchResults.push({
          id: c.id,
          type: "campaign",
          title: c.name,
          subtitle: c.status || "Active",
        });
      });
    }

    setResults(searchResults);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, search]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === "prospect") {
      navigate(`/crm/prospects/${result.id}`);
    } else if (result.type === "campaign") {
      navigate(`/crm/campaigns/${result.id}`);
    }
    onOpenChange(false);
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "prospect":
        return Building2;
      case "campaign":
        return Mail;
      case "activity":
        return FileText;
      default:
        return User;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            placeholder="Search prospects, campaigns..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 h-12"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <ScrollArea className="max-h-[300px]">
          <AnimatePresence>
            {results.length > 0 ? (
              <div className="p-2">
                {results.map((result, index) => {
                  const Icon = getIcon(result.type);
                  return (
                    <motion.div
                      key={`${result.type}-${result.id}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        index === selectedIndex ? "bg-accent" : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelect(result)}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.stage && (
                          <Badge variant="outline" className="capitalize">
                            {result.stage}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="capitalize">
                          {result.type}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : query.length >= 2 && !loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found</p>
              </div>
            ) : query.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Start typing to search...</p>
              </div>
            ) : null}
          </AnimatePresence>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
