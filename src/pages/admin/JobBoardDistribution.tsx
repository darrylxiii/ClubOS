import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Plus, Globe, BarChart3, Settings, TrendingUp, DollarSign, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface BoardConnection {
  id: string;
  board_name: string;
  board_type: string;
  is_active: boolean;
}

interface BoardPosting {
  id: string;
  job_id: string;
  board_connection_id: string;
  status: string;
  applications_count: number;
  clicks_count: number;
  total_spend: number;
  posted_at: string;
}

const BOARD_LOGOS: Record<string, string> = {
  indeed: "Indeed",
  linkedin: "LinkedIn Jobs",
  glassdoor: "Glassdoor",
  ziprecruiter: "ZipRecruiter",
  monster: "Monster",
  careerbuilder: "CareerBuilder",
};

export default function JobBoardDistribution() {
  const { t } = useTranslation('admin');
  const [connections, setConnections] = useState<BoardConnection[]>([]);
  const [postings, setPostings] = useState<BoardPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [connRes, postRes] = await Promise.all([
      supabase.from("job_board_connections").select("*").order("board_name"),
      supabase.from("job_board_postings").select("*").order("posted_at", { ascending: false }).limit(100),
    ]);
    if (connRes.data) setConnections(connRes.data);
    if (postRes.data) setPostings(postRes.data);
    setLoading(false);
  };

  const totalApplications = postings.reduce((a, b) => a + (b.applications_count || 0), 0);
  const totalClicks = postings.reduce((a, b) => a + (b.clicks_count || 0), 0);
  const totalSpend = postings.reduce((a, b) => a + (b.total_spend || 0), 0);
  const activePostings = postings.filter(p => p.status === "active").length;

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Share2 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">{'JOB BOARD DISTRIBUTION'}</h1>
            </div>
            <p className="text-muted-foreground">{'Multi-post jobs to major job boards and track performance'}</p>
          </div>
          <Button><Plus className="h-4 w-4 mr-2" />{'Distribute Job'}</Button>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{"Overview"}</TabsTrigger>
            <TabsTrigger value="postings">{'Active Postings'}</TabsTrigger>
            <TabsTrigger value="analytics">{"Analytics"}</TabsTrigger>
            <TabsTrigger value="boards">{'Board Connections'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>{'Active Postings'}</CardDescription><CardTitle className="text-2xl text-green-600">{activePostings}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{'Total Applications'}</CardDescription><CardTitle className="text-2xl">{totalApplications}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{'Total Clicks'}</CardDescription><CardTitle className="text-2xl">{totalClicks}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>{'Total Spend'}</CardDescription><CardTitle className="text-2xl">${totalSpend.toFixed(2)}</CardTitle></CardHeader></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{'Cost Per Application by Board'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">{'Connect job boards and distribute postings to see cost-per-application analytics here'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="postings" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"Job"}</TableHead>
                      <TableHead>{"Board"}</TableHead>
                      <TableHead>{"Status"}</TableHead>
                      <TableHead>{"Applications"}</TableHead>
                      <TableHead>{"Clicks"}</TableHead>
                      <TableHead>{"Spend"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postings.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{'No postings yet. Distribute a job to get started.'}</TableCell></TableRow>
                    ) : postings.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.job_id.slice(0, 8)}...</TableCell>
                        <TableCell>{connections.find(c => c.id === p.board_connection_id)?.board_name || "Unknown"}</TableCell>
                        <TableCell><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                        <TableCell>{p.applications_count}</TableCell>
                        <TableCell>{p.clicks_count}</TableCell>
                        <TableCell>${(p.total_spend || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />{'Application Volume'}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{'Chart renders with posting data'}</p></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />{'Cost per Application'}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{'CPA comparison across boards'}</p></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="boards" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(BOARD_LOGOS).map(([type, name]) => {
                const connected = connections.find(c => c.board_type === type);
                return (
                  <Card key={type} className={connected?.is_active ? "border-green-500/50" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{name}</CardTitle>
                        <Badge variant={connected?.is_active ? "default" : "secondary"}>
                          {connected?.is_active ? "Connected" : "Available"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {connected?.is_active ? (
                        <Button variant="outline" size="sm" className="w-full"><Settings className="h-3 w-3 mr-2" />{"Configure"}</Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full"><Plus className="h-3 w-3 mr-2" />{"Connect"}</Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
