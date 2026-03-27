import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Activity, AlertTriangle, CheckCircle, Clock, Plus, XCircle, Wrench, Globe } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StatusComponent {
  id: string;
  name: string;
  description: string;
  status: string;
  display_order: number;
}

interface Incident {
  id: string;
  title: string;
  impact: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
}

interface ScheduledMaintenance {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  operational: "bg-green-500",
  degraded: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-blue-500",
};

const STATUS_LABELS: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded Performance",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
  maintenance: "Under Maintenance",
};

const IMPACT_COLORS: Record<string, string> = {
  none: "secondary",
  minor: "outline",
  major: "default",
  critical: "destructive",
};

export default function StatusPage() {
  const [components, setComponents] = useState<StatusComponent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenances, setMaintenances] = useState<ScheduledMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);
  const [newIncident, setNewIncident] = useState({ title: "", impact: "minor", body: "" });
  const [newMaintenance, setNewMaintenance] = useState({ title: "", description: "", scheduled_start: "", scheduled_end: "" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [compRes, incRes, maintRes] = await Promise.all([
      supabase.from("status_page_components").select("*").order("display_order"),
      supabase.from("status_page_incidents").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("scheduled_maintenances").select("*").order("scheduled_start").limit(10),
    ]);
    if (compRes.data) setComponents(compRes.data);
    if (incRes.data) setIncidents(incRes.data);
    if (maintRes.data) setMaintenances(maintRes.data);
    setLoading(false);
  };

  const updateComponentStatus = async (id: string, status: string) => {
    await supabase.from("status_page_components").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Component status updated");
    fetchAll();
  };

  const createIncident = async () => {
    const { error } = await supabase.from("status_page_incidents").insert({
      title: newIncident.title,
      impact: newIncident.impact,
      status: "investigating",
    });
    if (!error) {
      toast.success("Incident created");
      setIncidentDialog(false);
      setNewIncident({ title: "", impact: "minor", body: "" });
      fetchAll();
    }
  };

  const resolveIncident = async (id: string) => {
    await supabase.from("status_page_incidents").update({
      status: "resolved",
      resolved_at: new Date().toISOString()
    }).eq("id", id);
    toast.success("Incident resolved");
    fetchAll();
  };

  const createMaintenance = async () => {
    const { error } = await supabase.from("scheduled_maintenances").insert({
      title: newMaintenance.title,
      description: newMaintenance.description,
      scheduled_start: newMaintenance.scheduled_start,
      scheduled_end: newMaintenance.scheduled_end,
    });
    if (!error) {
      toast.success("Maintenance scheduled");
      setMaintenanceDialog(false);
      setNewMaintenance({ title: "", description: "", scheduled_start: "", scheduled_end: "" });
      fetchAll();
    }
  };

  const allOperational = components.every(c => c.status === "operational");

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{"STATUS PAGE"}</h1>
            </div>
            <p className="text-muted-foreground">
              {"Manage public system status, incidents, and maintenance windows"}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={maintenanceDialog} onOpenChange={setMaintenanceDialog}>
              <DialogTrigger asChild>
                <Button variant="outline"><Clock className="h-4 w-4 mr-2" />{"Schedule Maintenance"}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{"Schedule Maintenance"}</DialogTitle>
                  <DialogDescription>{"Create a scheduled maintenance window"}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>{"Title"}</Label><Input value={newMaintenance.title} onChange={e => setNewMaintenance(p => ({...p, title: e.target.value}))} /></div>
                  <div><Label>{"Description"}</Label><Textarea value={newMaintenance.description} onChange={e => setNewMaintenance(p => ({...p, description: e.target.value}))} /></div>
                  <div><Label>{"Start"}</Label><Input type="datetime-local" value={newMaintenance.scheduled_start} onChange={e => setNewMaintenance(p => ({...p, scheduled_start: e.target.value}))} /></div>
                  <div><Label>{"End"}</Label><Input type="datetime-local" value={newMaintenance.scheduled_end} onChange={e => setNewMaintenance(p => ({...p, scheduled_end: e.target.value}))} /></div>
                </div>
                <DialogFooter><Button onClick={createMaintenance}>{"Schedule"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={incidentDialog} onOpenChange={setIncidentDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive"><AlertTriangle className="h-4 w-4 mr-2" />{"Report Incident"}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{"Report New Incident"}</DialogTitle>
                  <DialogDescription>{"Create a new incident report visible on the public status page"}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label>{"Title"}</Label><Input value={newIncident.title} onChange={e => setNewIncident(p => ({...p, title: e.target.value}))} placeholder={"Brief incident description"} /></div>
                  <div>
                    <Label>{"Impact"}</Label>
                    <Select value={newIncident.impact} onValueChange={v => setNewIncident(p => ({...p, impact: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{"None"}</SelectItem>
                        <SelectItem value="minor">{"Minor"}</SelectItem>
                        <SelectItem value="major">{"Major"}</SelectItem>
                        <SelectItem value="critical">{"Critical"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button onClick={createIncident} variant="destructive">{"Create Incident"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Overall Status Banner */}
        <Card className={allOperational ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}>
          <CardContent className="py-4 flex items-center gap-3">
            {allOperational ? (
              <><CheckCircle className="h-6 w-6 text-green-500" /><span className="text-lg font-semibold text-green-600">{"All Systems Operational"}</span></>
            ) : (
              <><XCircle className="h-6 w-6 text-red-500" /><span className="text-lg font-semibold text-red-600">{"Some Systems Experiencing Issues"}</span></>
            )}
          </CardContent>
        </Card>

        {/* Component Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />{"System Components"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {components.map(comp => (
                <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[comp.status]}`} />
                    <div>
                      <div className="font-medium">{comp.name}</div>
                      <div className="text-sm text-muted-foreground">{comp.description}</div>
                    </div>
                  </div>
                  <Select value={comp.status} onValueChange={v => updateComponentStatus(comp.id, v)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{"Incidents"}</CardTitle>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{"No incidents reported"}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"Incident"}</TableHead>
                    <TableHead>{"Impact"}</TableHead>
                    <TableHead>{"Status"}</TableHead>
                    <TableHead>{"Started"}</TableHead>
                    <TableHead>{"Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map(inc => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium">{inc.title}</TableCell>
                      <TableCell><Badge variant={IMPACT_COLORS[inc.impact] as any}>{inc.impact}</Badge></TableCell>
                      <TableCell><Badge variant={inc.status === "resolved" ? "secondary" : "default"}>{inc.status}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(inc.started_at), "MMM d, HH:mm")}</TableCell>
                      <TableCell>
                        {inc.status !== "resolved" && (
                          <Button size="sm" variant="outline" onClick={() => resolveIncident(inc.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" />{"Resolve"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />{"Scheduled Maintenance"}</CardTitle>
          </CardHeader>
          <CardContent>
            {maintenances.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{"No upcoming maintenance scheduled"}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"Title"}</TableHead>
                    <TableHead>{"Start"}</TableHead>
                    <TableHead>{"End"}</TableHead>
                    <TableHead>{"Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell className="text-sm">{format(new Date(m.scheduled_start), "MMM d, HH:mm")}</TableCell>
                      <TableCell className="text-sm">{format(new Date(m.scheduled_end), "MMM d, HH:mm")}</TableCell>
                      <TableCell><Badge variant="secondary">{m.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
