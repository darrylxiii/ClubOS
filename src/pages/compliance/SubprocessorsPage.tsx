import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Search, Plus, MapPin, CheckCircle2 } from "lucide-react";

export default function SubprocessorsPage() {
  const [subprocessors, setSubprocessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSubprocessors();
  }, []);

  const loadSubprocessors = async () => {
    try {
      const { data, error } = await supabase
        .from("subprocessors")
        .select("*")
        .order("name");

      if (error) throw error;
      setSubprocessors(data || []);
    } catch (error) {
      console.error("Error loading subprocessors:", error);
      toast({
        title: "Error",
        description: "Failed to load subprocessors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    const styles = {
      low: "bg-green-500/10 text-green-500 border-green-500/20",
      medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      high: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return <Badge className={styles[risk as keyof typeof styles]}>{risk} risk</Badge>;
  };

  const filteredSubprocessors = subprocessors.filter((sp) =>
    sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.services_provided.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subprocessors</h1>
          <p className="text-muted-foreground mt-1">
            Public vendor registry with certifications and data location transparency
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Subprocessor
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subprocessors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subprocessors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading subprocessors...
            </CardContent>
          </Card>
        ) : filteredSubprocessors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No subprocessors found
            </CardContent>
          </Card>
        ) : (
          filteredSubprocessors.map((sp) => (
            <Card key={sp.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{sp.name}</CardTitle>
                    </div>
                    <CardDescription>{sp.services_provided}</CardDescription>
                    <div className="flex items-center gap-2">
                      {getRiskBadge(sp.risk_level)}
                      {sp.is_active && (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Data Location</p>
                      <p className="font-medium text-foreground">{sp.data_location}</p>
                    </div>
                  </div>
                  {sp.certifications && sp.certifications.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-2">Certifications</p>
                      <div className="flex flex-wrap gap-2">
                        {sp.certifications.map((cert: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(sp.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
