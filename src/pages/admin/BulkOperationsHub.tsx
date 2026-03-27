import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleGate } from "@/components/RoleGate";
import { Mail, ClipboardCheck, Calendar, Download, UserPlus, History } from "lucide-react";
import { BulkEmailTab } from "@/components/admin/bulk-ops/BulkEmailTab";
import { BulkAssessmentTab } from "@/components/admin/bulk-ops/BulkAssessmentTab";
import { BulkSchedulingTab } from "@/components/admin/bulk-ops/BulkSchedulingTab";
import { BulkExportTab } from "@/components/admin/bulk-ops/BulkExportTab";
import { BulkInvitationTab } from "@/components/admin/bulk-ops/BulkInvitationTab";
import { BulkOperationHistory } from "@/components/admin/bulk-ops/BulkOperationHistory";

const BulkOperationsHub = () => {
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState("email");

  return (
    <RoleGate allowedRoles={["admin"]} showLoading>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('bulkOperationsHub.title')}</h1>
            <p className="text-muted-foreground">{t('bulkOperationsHub.desc')}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger value="assessment" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Assessments</span>
              </TabsTrigger>
              <TabsTrigger value="scheduling" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Scheduling</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </TabsTrigger>
              <TabsTrigger value="invitation" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invitations</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Bulk Email
                  </CardTitle>
                  <CardDescription>
                    Send personalized emails to multiple candidates at once
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkEmailTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assessment">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Bulk Assessment Assignment
                  </CardTitle>
                  <CardDescription>
                    Assign assessments to multiple candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkAssessmentTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scheduling">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Bulk Scheduling Links
                  </CardTitle>
                  <CardDescription>
                    Generate and send scheduling links to multiple candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkSchedulingTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Bulk Export
                  </CardTitle>
                  <CardDescription>
                    Export candidate data from pipelines in various formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkExportTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invitation">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Bulk Platform Invitations
                  </CardTitle>
                  <CardDescription>
                    Send platform invitation emails to candidates without accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkInvitationTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Operation History
                  </CardTitle>
                  <CardDescription>
                    View history and status of all bulk operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkOperationHistory />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </RoleGate>
  );
};

export default BulkOperationsHub;
