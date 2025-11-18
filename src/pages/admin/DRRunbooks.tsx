import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AppLayout } from '@/components/AppLayout';

const runbooksMarkdown = `# 🚨 Disaster Recovery Runbooks

## **Incident Classification**

| **Severity** | **Description** | **RTO** | **Response Team** |
|--------------|----------------|---------|-------------------|
| **P1 - Critical** | Complete platform outage | 4 hours | CTO + DevOps + Lead Strategist |
| **P2 - High** | Partial service degradation | 8 hours | DevOps + On-call Engineer |
| **P3 - Medium** | Non-critical service down | 24 hours | On-call Engineer |
| **P4 - Low** | Minor issues, no user impact | 72 hours | Engineering Team |

---

## **Runbook 1: Complete Database Failure**

### **Symptoms:**
- All database queries failing
- Lovable Cloud dashboard unreachable
- Health checks returning 500 errors
- Users unable to login or access any data

### **Immediate Actions (0-15 minutes):**

1. **Verify Outage Scope** - Test database connectivity
2. **Check Platform Status** - Review backup logs at /admin/disaster-recovery
3. **Activate Incident Response** - Post to #incidents channel
4. **Enable Maintenance Mode** - Update status page

### **Recovery Actions (15-60 minutes):**

5. **Check Last Known Good State** - Review backup verification logs
6. **Contact Lovable Support** - Open critical support ticket
7. **Verify Critical Tables Post-Recovery** - Check row counts
8. **Test Core Flows** - Login, profiles, applications, meetings, bookings

### **Post-Recovery (60-120 minutes):**

9. **Data Integrity Check** - Run manual backup verification
10. **Notify Stakeholders** - Email incident report
11. **Document Incident** - Create post-mortem

---

## **Runbook 2: Data Corruption Detected**

### **Symptoms:**
- Incorrect data returned
- Foreign key violations
- Backup verification failures
- PITR tests failing

### **Recovery:**

1. **Isolate Affected Tables** - Check verification logs
2. **Enable Read-Only Mode** - Prevent further corruption
3. **Identify Last Known Good State** - Find last successful backup
4. **Contact Lovable Support for PITR** - Request Point-in-Time Recovery
5. **Validate Restored Data** - Verify row counts and integrity
6. **Reconcile Recent Transactions** - Review audit logs

---

## **Runbook 3: Edge Function Failure**

### **Symptoms:**
- AI features not responding
- Webhooks timing out
- API calls returning 500 errors

### **Recovery:**

1. **Identify Failed Function** - Check edge function logs
2. **Check Recent Deployments** - Review git history
3. **Rollback to Previous Version** - Use git checkout
4. **Redeploy Function** - Auto-deploy on push
5. **Verify Function Health** - Test endpoint

---

## **Runbook 4: Backup Verification Failure**

### **Symptoms:**
- Backup verification showing failed status
- Platform alerts for backup failures

### **Recovery:**

1. **Check Alert Details** - View platform_alerts table
2. **Run Manual Verification** - Via /admin/disaster-recovery
3. **Identify Failed Tables** - Review error messages
4. **Contact Lovable Support** - If infrastructure issue

---

## **Runbook 5: PITR Test Failure**

### **Symptoms:**
- PITR test logs showing failed status
- Critical alerts
- Recovery accuracy below 100%

### **Recovery:**

1. **Review Test Results** - Check pitr_test_logs
2. **Run Manual PITR Test** - Via dashboard
3. **Contact Lovable Support** - Report failures
4. **Increase Test Frequency** - Monitor for patterns

---

## **Recovery Time Tracking**

| **Phase** | **Target Time** | **Responsible** |
|-----------|----------------|-----------------|
| Detection | 0-5 min | Automated monitoring |
| Assessment | 5-15 min | On-call engineer |
| Stakeholder notification | 15-20 min | CTO |
| Recovery initiation | 20-60 min | DevOps + Lovable Support |
| Verification | 60-90 min | QA + DevOps |
| Postmortem | 90-240 min | Full team |

---

## **Communication Templates**

### **Initial Incident Notification**
\`\`\`
Subject: [P1 INCIDENT] Platform Database Outage

Team,

We are experiencing a critical platform outage affecting all users.

Status: INVESTIGATING
Impact: All database operations failing
ETA: Investigating, updates every 15 minutes
Action: Recovery in progress

Next update: [TIME + 15 min]
\`\`\`

### **Resolution Notification**
\`\`\`
Subject: [RESOLVED] Platform Database Outage

Team,

The platform has been restored and all services are operational.

Duration: [X minutes]
Root Cause: [Brief description]
Data Loss: [None / X minutes]
Action Taken: [Brief description]

Full post-mortem: [Link]
\`\`\`

---

## **Post-Incident Requirements**

### **Within 24 Hours:**
- [ ] Incident timeline documented
- [ ] Root cause identified
- [ ] Customer communication sent
- [ ] Team debrief scheduled

### **Within 72 Hours:**
- [ ] Post-mortem document published
- [ ] Action items assigned
- [ ] Prevention measures identified
- [ ] Monitoring improvements implemented

### **Within 1 Week:**
- [ ] Runbook updates completed
- [ ] Team training conducted
- [ ] Similar risks assessed
- [ ] Customer follow-up calls completed
`;

export default function DRRunbooks() {
  const navigate = useNavigate();

  const downloadRunbooks = () => {
    const blob = new Blob([runbooksMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DR_RUNBOOKS.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/disaster-recovery')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to DR Dashboard
          </Button>
          <Button variant="outline" onClick={downloadRunbooks}>
            <Download className="h-4 w-4 mr-2" />
            Download Runbooks
          </Button>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Disaster Recovery Runbooks</h1>
            </div>
            
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full border-collapse border border-border">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-4 py-2">{children}</td>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">
                      {children}
                    </pre>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 my-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-2 my-4">{children}</ol>
                  ),
                  hr: () => <hr className="my-8 border-border" />,
                }}
              >
                {runbooksMarkdown}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
