import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Search, Loader2, BellOff } from "lucide-react";

interface SavedSearch {
  id: string;
  name: string;
  filters: {
    category?: string;
    budget_min?: number;
    budget_max?: number;
    skills?: string[];
    location?: string;
  };
  notification_frequency: string;
  is_active: boolean;
  match_count: number;
  created_at: string;
}

export function SavedSearchesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSearch, setNewSearch] = useState({
    name: "",
    category: "",
    budget_min: "",
    budget_max: "",
    notification_frequency: "daily",
  });

  const { data: savedSearches, isLoading } = useQuery({
    queryKey: ["saved-searches", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SavedSearch[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (search: typeof newSearch) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await (supabase as any)
        .from("saved_searches")
        .insert({
          user_id: user.id,
          name: search.name,
          filters: {
            category: search.category || undefined,
            budget_min: search.budget_min ? Number(search.budget_min) : undefined,
            budget_max: search.budget_max ? Number(search.budget_max) : undefined,
          },
          notification_frequency: search.notification_frequency,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Search saved! You'll receive alerts for matching projects.");
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      setDialogOpen(false);
      setNewSearch({ name: "", category: "", budget_min: "", budget_max: "", notification_frequency: "daily" });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("saved_searches")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("saved_searches")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Search deleted");
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });

  const categories = [
    "Development", "Design", "Marketing", "Writing", "Video Production",
    "Data Science", "Mobile Development", "DevOps", "UI/UX", "Consulting"
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Job Alerts
            </CardTitle>
            <CardDescription>
              Get notified when projects match your criteria
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Job Alert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Alert Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., React Development Projects"
                    value={newSearch.name}
                    onChange={(e) => setNewSearch(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newSearch.category}
                    onValueChange={(val) => setNewSearch(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Budget (€)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newSearch.budget_min}
                      onChange={(e) => setNewSearch(prev => ({ ...prev, budget_min: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Budget (€)</Label>
                    <Input
                      type="number"
                      placeholder="Any"
                      value={newSearch.budget_max}
                      onChange={(e) => setNewSearch(prev => ({ ...prev, budget_max: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Notification Frequency</Label>
                  <Select
                    value={newSearch.notification_frequency}
                    onValueChange={(val) => setNewSearch(prev => ({ ...prev, notification_frequency: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(newSearch)}
                  disabled={!newSearch.name || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Create Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : savedSearches && savedSearches.length > 0 ? (
          <div className="space-y-3">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{search.name}</p>
                    {!search.is_active && (
                      <Badge variant="secondary" className="text-xs">Paused</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    {search.filters.category && (
                      <Badge variant="outline" className="text-xs">{search.filters.category}</Badge>
                    )}
                    {search.filters.budget_min && (
                      <span>€{search.filters.budget_min}+</span>
                    )}
                    <span>• {search.notification_frequency}</span>
                    {search.match_count > 0 && (
                      <span className="text-primary">• {search.match_count} matches</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Switch
                    checked={search.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: search.id, is_active: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(search.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-1">No job alerts yet</p>
            <p className="text-sm">Create an alert to get notified about matching projects</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
