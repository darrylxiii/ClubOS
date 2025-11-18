import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Database, Shield, Lock, Eye, AlertTriangle } from "lucide-react";

export default function DataClassificationPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, categoriesRes] = await Promise.all([
        supabase.from("data_classification_rules").select("*").order("table_name"),
        supabase.from("data_classification_categories").select("*").order("severity_level", { ascending: false }),
      ]);

      if (rulesRes.error) throw rulesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setRules(rulesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data classification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSensitivityBadge = (level: number) => {
    const styles = {
      1: { class: "bg-green-500/10 text-green-500 border-green-500/20", icon: Eye, label: "Public" },
      2: { class: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Shield, label: "Internal" },
      3: { class: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Lock, label: "Confidential" },
      4: { class: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertTriangle, label: "Restricted" },
    };

    const style = styles[level as keyof typeof styles] || styles[1];
    const Icon = style.icon;

    return (
      <Badge className={style.class}>
        <Icon className="h-3 w-3 mr-1" />
        {style.label}
      </Badge>
    );
  };

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.table_name]) {
      acc[rule.table_name] = [];
    }
    acc[rule.table_name].push(rule);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Classification</h1>
          <p className="text-muted-foreground mt-1">
            Field-level sensitivity tagging and data governance rules
          </p>
        </div>
        <Button>
          <Database className="h-4 w-4 mr-2" />
          Add Classification Rule
        </Button>
      </div>

      {/* Classification Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categories.map((category) => {
          const Icon = [Eye, Shield, Lock, AlertTriangle][category.severity_level - 1];
          return (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">{category.category_name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{category.description}</p>
                {category.requires_encryption && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Encryption Required
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Data Classification Rules by Table */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading classification rules...
            </CardContent>
          </Card>
        ) : Object.keys(groupedRules).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No classification rules defined. Start by adding rules for sensitive data fields.
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedRules).map(([tableName, tableRules]) => {
            const rules = tableRules as any[];
            return (
            <Card key={tableName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {tableName}
                    </CardTitle>
                    <CardDescription>
                      {rules.length} field{rules.length !== 1 ? "s" : ""} classified
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-foreground">{rule.column_name}</span>
                        {getSensitivityBadge(rule.sensitivity_level)}
                      </div>
                      {rule.retention_days && (
                        <Badge variant="outline" className="text-xs">
                          Retain {rule.retention_days} days
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>
    </div>
  );
}
