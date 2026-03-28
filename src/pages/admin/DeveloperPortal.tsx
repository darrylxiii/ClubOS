import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Code, Book, Webhook, Key, ExternalLink, Copy, Terminal, FileJson } from "lucide-react";
import { toast } from "sonner";

const API_ENDPOINTS = [
  { method: "GET", path: "/rest/v1/candidates", description: "List all candidates", auth: "Bearer Token" },
  { method: "GET", path: "/rest/v1/jobs", description: "List all jobs", auth: "Bearer Token" },
  { method: "POST", path: "/rest/v1/applications", description: "Create an application", auth: "Bearer Token" },
  { method: "GET", path: "/rest/v1/companies", description: "List all companies", auth: "Bearer Token" },
  { method: "POST", path: "/functions/v1/generate-embeddings", description: "Generate AI embeddings", auth: "Service Key" },
  { method: "POST", path: "/functions/v1/calculate-match-score", description: "AI match scoring", auth: "Service Key" },
  { method: "POST", path: "/functions/v1/parse-resume", description: "Parse resume document", auth: "Service Key" },
  { method: "POST", path: "/functions/v1/enrich-candidate-profile", description: "Enrich candidate data", auth: "Service Key" },
  { method: "GET", path: "/rest/v1/applications?status=eq.active", description: "Active applications", auth: "Bearer Token" },
  { method: "PATCH", path: "/rest/v1/candidates?id=eq.{id}", description: "Update candidate", auth: "Bearer Token" },
];

const WEBHOOK_EVENTS = [
  { event: "candidate.created", description: "Fired when a new candidate is added", category: "Candidates" },
  { event: "candidate.updated", description: "Fired when candidate data changes", category: "Candidates" },
  { event: "application.created", description: "New application submitted", category: "Applications" },
  { event: "application.stage_changed", description: "Application moves stages", category: "Applications" },
  { event: "application.hired", description: "Candidate marked as hired", category: "Applications" },
  { event: "job.created", description: "New job posted", category: "Jobs" },
  { event: "job.closed", description: "Job closed", category: "Jobs" },
  { event: "interview.scheduled", description: "Interview scheduled", category: "Interviews" },
  { event: "offer.created", description: "Offer generated", category: "Offers" },
  { event: "offer.accepted", description: "Candidate accepted offer", category: "Offers" },
];

const SUPABASE_BASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

const CODE_EXAMPLE = `// Install: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  '${SUPABASE_BASE_URL}',
  'your-api-key'
);

// List candidates
const { data: candidates } = await supabase
  .from('candidate_profiles')
  .select('id, full_name, email, skills')
  .limit(10);

// Create application
const { data: application } = await supabase
  .from('applications')
  .insert({
    candidate_id: 'uuid',
    job_id: 'uuid',
    status: 'applied',
  })
  .select()
  .single();

// AI Match Score
const response = await fetch(
  '${SUPABASE_BASE_URL}/functions/v1/calculate-match-score',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-service-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidateId: 'uuid',
      jobId: 'uuid',
    }),
  }
);`;

export default function DeveloperPortal() {
  const [copiedKey, setCopiedKey] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Code className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{"DEVELOPER PORTAL"}</h1>
          </div>
          <p className="text-muted-foreground">{"API documentation, webhook events, and integration guides"}</p>
        </div>

        <Tabs defaultValue="api">
          <TabsList>
            <TabsTrigger value="api">{"API Reference"}</TabsTrigger>
            <TabsTrigger value="webhooks">{"Webhook Events"}</TabsTrigger>
            <TabsTrigger value="examples">{"Code Examples"}</TabsTrigger>
            <TabsTrigger value="keys">{"API Keys"}</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />{"REST API Endpoints"}</CardTitle>
                <CardDescription>{`Base URL: ${SUPABASE_BASE_URL}`}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"Method"}</TableHead>
                      <TableHead>{"Endpoint"}</TableHead>
                      <TableHead>{"Description"}</TableHead>
                      <TableHead>{"Auth"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {API_ENDPOINTS.map((ep, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant={ep.method === "GET" ? "secondary" : ep.method === "POST" ? "default" : "outline"} className="font-mono">
                            {ep.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{ep.path}</TableCell>
                        <TableCell className="text-sm">{ep.description}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{ep.auth}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{"Authentication"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium mb-2">{"Bearer Token (for user-context requests)"}</p>
                  <code className="text-xs bg-background p-2 rounded block">Authorization: Bearer {'<'}access_token{'>'}</code>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium mb-2">{"API Key (for service-level requests)"}</p>
                  <code className="text-xs bg-background p-2 rounded block">apikey: {'<'}your_api_key{'>'}</code>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium mb-2">{"Rate Limits"}</p>
                  <p className="text-sm text-muted-foreground">1000 requests/minute per API key. Edge functions: 100 requests/minute. Contact support for higher limits.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />{"Webhook Event Catalog"}</CardTitle>
                <CardDescription>{"Subscribe to platform events for real-time integrations"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"Event Type"}</TableHead>
                      <TableHead>{"Description"}</TableHead>
                      <TableHead>{"Category"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {WEBHOOK_EVENTS.map((ev, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{ev.event}</TableCell>
                        <TableCell className="text-sm">{ev.description}</TableCell>
                        <TableCell><Badge variant="outline">{ev.category}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{"Webhook Payload Example"}</CardTitle></CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">{`{
  "event": "application.stage_changed",
  "timestamp": "2026-03-27T14:30:00Z",
  "data": {
    "application_id": "uuid",
    "candidate_id": "uuid",
    "job_id": "uuid",
    "previous_stage": "screening",
    "new_stage": "interview",
    "changed_by": "uuid"
  }
}`}</pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><FileJson className="h-5 w-5" />{"JavaScript / TypeScript"}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(CODE_EXAMPLE)}><Copy className="h-3 w-3 mr-2" />{"Copy"}</Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">{CODE_EXAMPLE}</pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />{"API Keys"}</CardTitle>
                <CardDescription>{"Manage API keys for external integrations"}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  API keys can be managed in Settings {'>'} API Settings. Each key has configurable rate limits and scope restrictions.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
