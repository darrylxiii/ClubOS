import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, UserCheck, Building2, Clock, Scan, Loader2 } from "lucide-react";
import { usePartnerOrgIntelligence } from "@/hooks/usePartnerOrgIntelligence";
import { OrgPeopleTable } from "./OrgPeopleTable";
import { OrgChangesFeed } from "./OrgChangesFeed";
import { OrgInsightsCard } from "./OrgInsightsCard";
import { ScanProgressDialog } from "./ScanProgressDialog";
import { SectionLoader } from "@/components/ui/unified-loader";

interface Props {
  companyId: string;
  companyName?: string;
}

export function PartnerOrgIntelligence({ companyId, companyName }: Props) {
  const {
    people,
    changes,
    activeScanJob,
    loading,
    scanning,
    stats,
    getEstimate,
    startScan,
    pauseScan,
    resumeScan,
    refresh,
  } = usePartnerOrgIntelligence(companyId);

  const [scanDialogOpen, setScanDialogOpen] = useState(false);

  if (loading) return <SectionLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organization Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            {stats.totalPeople > 0
              ? `${stats.activePeople} active employees mapped across ${stats.departments} departments`
              : "Scan this company's LinkedIn to map their organization"}
          </p>
        </div>
        <Button
          onClick={() => setScanDialogOpen(true)}
          disabled={scanning}
          className="gap-2"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Scan className="w-4 h-4" />
              {stats.totalPeople > 0 ? 'Rescan Organization' : 'Scan Organization'}
            </>
          )}
        </Button>
      </div>

      {/* Stats Bar */}
      {stats.totalPeople > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.activePeople}</p>
              <p className="text-xs text-muted-foreground">Active People</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.departments}</p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.avgTenure}y</p>
              <p className="text-xs text-muted-foreground">Avg Tenure</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.decisionMakers}</p>
              <p className="text-xs text-muted-foreground">Decision Makers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
              <p className="text-2xl font-bold">{stats.recentHires}</p>
              <p className="text-xs text-muted-foreground">New Hires (30d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{stats.recentDepartures}</p>
              <p className="text-xs text-muted-foreground">Departures (30d)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {stats.matchedCandidates > 0 && (
        <Badge variant="secondary" className="gap-1">
          <UserCheck className="w-3 h-3" />
          {stats.matchedCandidates} matched with your talent pool
        </Badge>
      )}

      {/* Content Tabs */}
      {stats.totalPeople > 0 ? (
        <Tabs defaultValue="directory" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="changes">
              Changes {changes.length > 0 && `(${changes.length})`}
            </TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="mt-6">
            <OrgPeopleTable people={people} />
          </TabsContent>

          <TabsContent value="changes" className="mt-6">
            <OrgChangesFeed changes={changes} />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <OrgInsightsCard companyId={companyId} people={people} changes={changes} />
          </TabsContent>
        </Tabs>
      ) : !scanning ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No organization data yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Scan this company's LinkedIn page to map their full organization — employees, departments, seniority levels, and more.
            </p>
            <Button onClick={() => setScanDialogOpen(true)} className="gap-2">
              <Scan className="w-4 h-4" />
              Start Organization Scan
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Scan Progress / Confirmation Dialog */}
      <ScanProgressDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        companyId={companyId}
        companyName={companyName}
        activeScanJob={activeScanJob}
        scanning={scanning}
        getEstimate={getEstimate}
        onStartScan={startScan}
        onPause={pauseScan}
        onResume={resumeScan}
      />
    </div>
  );
}
