import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Webhook, Plus, Trash2, RotateCcw, CheckCircle, XCircle, Activity } from "lucide-react";
import { toast } from "sonner";

interface WebhookEvent {
  event_type: string;
  display_name: string;
  description: string;
  category: string;
}

interface WebhookSubscription {
  id: string;
  endpoint_url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_delivery_at: string;
  last_error: string;
}

export default function WebhookManagement() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ endpoint_url: "", secret: "", events: [] as string[] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [evRes, subRes] = await Promise.all([
      supabase.from("platform_webhook_events").select("*").order("category, event_type"),
      supabase.from("platform_webhook_subscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    if (evRes.data) setEvents(evRes.data);
    if (subRes.data) setSubscriptions(subRes.data);
    setLoading(false);
  };

  const toggleEvent = (eventType: string) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(eventType) ? p.events.filter(e => e !== eventType) : [...p.events, eventType],
    }));
  };

  const createSubscription = async () => {
    const { error } = await supabase.from("platform_webhook_subscriptions").insert({
      endpoint_url: form.endpoint_url,
      secret: form.secret || crypto.randomUUID(),
      events: form.events,
      is_active: true,
    });
    if (!error) {
      toast.success("Webhook subscription created");
      setDialogOpen(false);
      setForm({ endpoint_url: "", secret: "", events: [] });
      fetchData();
    }
  };

  const deleteSubscription = async (id: string) => {
    await supabase.from("platform_webhook_subscriptions").delete().eq("id", id);
    toast.success("Subscription deleted");
    fetchData();
  };

  const eventsByCategory = events.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {} as Record<string, WebhookEvent[]>);

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Webhook className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{"WEBHOOK MANAGEMENT"}</h1>
            </div>
            <p className="text-muted-foreground">{"Configure platform webhook subscriptions and monitor deliveries"}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{"New Subscription"}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{"Create Webhook Subscription"}</DialogTitle>
                <DialogDescription>{"Subscribe to platform events for real-time notifications"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>{"Endpoint URL"}</Label><Input value={form.endpoint_url} onChange={e => setForm(p => ({...p, endpoint_url: e.target.value}))} placeholder="https://your-app.com/webhooks/clubos" /></div>
                <div><Label>{"Secret (optional, auto-generated if empty)"}</Label><Input value={form.secret} onChange={e => setForm(p => ({...p, secret: e.target.value}))} placeholder={"whsec_..."} /></div>
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">{"Events to subscribe to"}</h3>
                  {Object.entries(eventsByCategory).map(([cat, catEvents]) => (
                    <div key={cat}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{cat}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {catEvents.map(ev => (
                          <label key={ev.event_type} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/30">
                            <Checkbox checked={form.events.includes(ev.event_type)} onCheckedChange={() => toggleEvent(ev.event_type)} />
                            <div>
                              <div className="text-sm font-mono">{ev.event_type}</div>
                              <div className="text-xs text-muted-foreground">{ev.display_name}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter><Button onClick={createSubscription} disabled={!form.endpoint_url || form.events.length === 0}>{"Create Subscription"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="subscriptions">
          <TabsList>
            <TabsTrigger value="subscriptions">{"Subscriptions"}</TabsTrigger>
            <TabsTrigger value="events">{"Event Catalog"}</TabsTrigger>
            <TabsTrigger value="deliveries">{"Recent Deliveries"}</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"Endpoint"}</TableHead>
                      <TableHead>{"Events"}</TableHead>
                      <TableHead>{"Status"}</TableHead>
                      <TableHead>{"Failures"}</TableHead>
                      <TableHead>{"Last Delivery"}</TableHead>
                      <TableHead>{"Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map(sub => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">{sub.endpoint_url}</TableCell>
                        <TableCell><Badge variant="secondary">{sub.events.length} events</Badge></TableCell>
                        <TableCell>
                          {sub.is_active ? (
                            <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />{"Active"}</Badge>
                          ) : (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{"Disabled"}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{sub.failure_count > 0 ? <Badge variant="destructive">{sub.failure_count}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                        <TableCell className="text-sm">{sub.last_delivery_at ? new Date(sub.last_delivery_at).toLocaleString() : "Never"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSubscription(sub.id)}><Trash2 className="h-3 w-3" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {subscriptions.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{"No webhook subscriptions configured"}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            {Object.entries(eventsByCategory).map(([cat, catEvents]) => (
              <Card key={cat}>
                <CardHeader><CardTitle>{cat}</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>{"Event Type"}</TableHead><TableHead>{"Description"}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {catEvents.map(ev => (
                        <TableRow key={ev.event_type}>
                          <TableCell className="font-mono text-sm">{ev.event_type}</TableCell>
                          <TableCell className="text-sm">{ev.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">{"Delivery logs will appear here as webhooks are fired"}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
