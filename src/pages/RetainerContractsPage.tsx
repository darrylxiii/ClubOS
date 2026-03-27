import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, DollarSign, Plus, Play, Pause, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function RetainerContractsPage() {
  const { t } = useTranslation('contracts');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [logHoursDialogOpen, setLogHoursDialogOpen] = useState(false);
  const [selectedRetainer, setSelectedRetainer] = useState<string | null>(null);

  const { data: retainers, isLoading } = useQuery({
    queryKey: ["retainer-contracts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("retainer_contracts")
        .select(`
          *,
          client:profiles!retainer_contracts_client_id_fkey(full_name, avatar_url),
          freelancer:profiles!retainer_contracts_freelancer_id_fkey(full_name, avatar_url)
        `)
        .or(`client_id.eq.${user.id},freelancer_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: hoursLog } = useQuery({
    queryKey: ["retainer-hours", selectedRetainer],
    queryFn: async () => {
      if (!selectedRetainer) return [];
      const { data, error } = await supabase
        .from("retainer_hours_log")
        .select("*")
        .eq("retainer_id", selectedRetainer)
        .order("logged_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRetainer,
  });

  const logHoursMutation = useMutation({
    mutationFn: async ({ retainerId, hours, description }: { retainerId: string; hours: number; description: string }) => {
      const { error } = await supabase
        .from("retainer_hours_log")
        .insert({
          retainer_id: retainerId,
          hours,
          description,
          logged_date: new Date().toISOString().split("T")[0],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retainer-hours"] });
      toast.success("Hours logged successfully");
      setLogHoursDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to log hours", { description: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500",
      active: "bg-green-500/10 text-green-500",
      paused: "bg-orange-500/10 text-orange-500",
      completed: "bg-blue-500/10 text-blue-500",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const totalHoursThisMonth = (retainerId: string) => {
    if (!hoursLog) return 0;
    const now = new Date();
    return hoursLog
      .filter((log) => {
        const logDate = new Date(log.logged_date);
        return log.retainer_id === retainerId && 
               logDate.getMonth() === now.getMonth() && 
               logDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, log) => sum + Number(log.hours), 0);
  };

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('retainerContractsPage.text2')}</h1>
          <p className="text-muted-foreground">{t('retainerContractsPage.text3')}</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Retainer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('retainerContractsPage.text4')}</DialogTitle>
              <DialogDescription>{t('retainerContractsPage.text5')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('retainerContractsPage.text6')}</Label>
                <Input type="number" placeholder="20" />
              </div>
              <div className="space-y-2">
                <Label>{"Monthly Rate (€)"}</Label>
                <Input type="number" placeholder="2000" />
              </div>
              <div className="space-y-2">
                <Label>{t('retainerContractsPage.text7')}</Label>
                <Textarea placeholder={t('retainerContractsPage.text8')} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('retainerContractsPage.text9')}</Button>
              <Button>{t('retainerContractsPage.text10')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">{t('retainerContractsPage.text11')}</TabsTrigger>
          <TabsTrigger value="pending">{t('retainerContractsPage.text12')}</TabsTrigger>
          <TabsTrigger value="completed">{t('retainerContractsPage.text13')}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {retainers?.filter((r) => r.status === "active").map((retainer) => (
              <Card key={retainer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {retainer.client?.full_name || "Client"} ↔ {retainer.freelancer?.full_name || "Freelancer"}
                    </CardTitle>
                    {getStatusBadge(retainer.status)}
                  </div>
                  <CardDescription>
                    Started {format(new Date(retainer.start_date), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted">
                      <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-semibold">{retainer.monthly_hours}h</p>
                      <p className="text-xs text-muted-foreground">{t('retainerContractsPage.text14')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-semibold">€{retainer.monthly_rate}</p>
                      <p className="text-xs text-muted-foreground">{t('retainerContractsPage.text15')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-semibold">{totalHoursThisMonth(retainer.id)}h</p>
                      <p className="text-xs text-muted-foreground">{t('retainerContractsPage.text16')}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedRetainer(retainer.id);
                        setLogHoursDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Log Hours
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">{t('retainerContractsPage.btn')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!retainers?.filter((r) => r.status === "active").length && (
              <Card className="col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">{t('retainerContractsPage.text17')}</p>
                  <p className="text-muted-foreground">{t('retainerContractsPage.text18')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {retainers?.filter((r) => r.status === "pending").map((retainer) => (
              <Card key={retainer.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t('retainerContractsPage.text19')}</CardTitle>
                    {getStatusBadge(retainer.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">€{retainer.monthly_rate}/mo • {retainer.monthly_hours}h</p>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm">{t('retainerContractsPage.text20')}</Button>
                    <Button size="sm" variant="outline">{t('retainerContractsPage.text21')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <p className="text-muted-foreground text-center py-12">{t('retainerContractsPage.text22')}</p>
        </TabsContent>
      </Tabs>

      {/* Log Hours Dialog */}
      <Dialog open={logHoursDialogOpen} onOpenChange={setLogHoursDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('retainerContractsPage.text23')}</DialogTitle>
            <DialogDescription>{t('retainerContractsPage.text24')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              logHoursMutation.mutate({
                retainerId: selectedRetainer!,
                hours: Number(formData.get("hours")),
                description: formData.get("description") as string,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('retainerContractsPage.text25')}</Label>
                <Input name="hours" type="number" step="0.5" min="0.5" placeholder="2.5 required" />
              </div>
              <div className="space-y-2">
                <Label>{t('retainerContractsPage.text26')}</Label>
                <Textarea name="description" placeholder={t('retainerContractsPage.text27')} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLogHoursDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={logHoursMutation.isPending}>
                {logHoursMutation.isPending ? "Logging..." : "Log Hours"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
