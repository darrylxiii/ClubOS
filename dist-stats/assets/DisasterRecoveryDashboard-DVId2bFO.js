import{u,j as e}from"./vendor-query-BZyYGKCt.js";import{s as l}from"./index-T2VZWyPA.js";import{C as i,a as n,b as c,d as o}from"./card-DX1jaBX_.js";import{T as W,a as $,b as h,c as f}from"./tabs-B2naBo5f.js";import{B as N,w,q as m,a as p}from"./App-DsBphtVX.js";import{L as G}from"./LazyMarkdown-DYPqepf7.js";import{u as z}from"./vendor-i18n-2KcO6nFR.js";import{T}from"./test-tube-DhLqUhgR.js";import{D as I}from"./database-E4e_OEXX.js";import{C as Q}from"./clock-CW-VEe4n.js";import{C as _}from"./circle-check-DlOLc_aF.js";import{S}from"./shield-DvklM_b5.js";import{T as X}from"./trending-up-YFPJodPB.js";import{F as P}from"./file-text-DSN8E9Ri.js";import{T as R}from"./triangle-alert-B-QOL6xD.js";import{A as Y}from"./activity-CCJTDU__.js";import{N as J}from"./network-BUR0YcXV.js";import{U as Z}from"./users-DO12o825.js";import{D as ee}from"./download-iLsGZEKU.js";const F=`# 🚨 Disaster Recovery Runbooks

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
`,ge=()=>{const{t:a}=z("admin"),{data:d,isLoading:L}=u({queryKey:["latest-backup-verification"],queryFn:async()=>{const{data:s,error:t}=await l.from("backup_verification_logs").select("*").order("timestamp",{ascending:!1}).limit(1).single();if(t)throw t;return s},refetchInterval:6e4}),{data:A}=u({queryKey:["recent-backup-verifications"],queryFn:async()=>{const{data:s,error:t}=await l.from("backup_verification_logs").select("*").order("timestamp",{ascending:!1}).limit(10);if(t)throw t;return s},refetchInterval:6e4}),{data:j,refetch:q}=u({queryKey:["platform-alerts"],queryFn:async()=>{const{data:s,error:t}=await l.from("platform_alerts").select("*").eq("acknowledged",!1).order("created_at",{ascending:!1}).limit(10);if(t)throw t;return s},refetchInterval:12e4,refetchIntervalInBackground:!1,staleTime:6e4}),{data:y}=u({queryKey:["pitr-tests"],queryFn:async()=>{const{data:s,error:t}=await l.from("pitr_test_logs").select("*").order("timestamp",{ascending:!1}).limit(10);if(t)throw t;return s},refetchInterval:6e4}),{data:k}=u({queryKey:["dr-drills"],queryFn:async()=>{const{data:s,error:t}=await l.from("dr_drill_schedule").select("*").order("scheduled_for",{ascending:!0}).limit(5);if(t)throw t;return s}}),{data:D}=u({queryKey:["recent-incidents"],queryFn:async()=>{const{data:s,error:t}=await l.from("incident_logs").select("*").order("created_at",{ascending:!1}).limit(10);if(t)throw t;return s}}),{data:x}=u({queryKey:["recovery-metrics"],queryFn:async()=>{const{data:s,error:t}=await l.from("recovery_metrics").select("*").order("metric_date",{ascending:!1}).limit(10);if(t)throw t;return s}}),{data:C}=u({queryKey:["recovery-playbooks"],queryFn:async()=>{const{data:s,error:t}=await l.from("recovery_playbooks").select("*").eq("is_active",!0).order("scenario_type");if(t)throw t;return s}}),{data:M}=u({queryKey:["service-dependencies"],queryFn:async()=>{const{data:s,error:t}=await l.from("service_dependencies").select("*").eq("is_active",!0);if(t)throw t;return s}}),{data:O}=u({queryKey:["dr-contacts"],queryFn:async()=>{const{data:s,error:t}=await l.from("dr_contacts").select("*").eq("is_active",!0).order("escalation_level");if(t)throw t;return s}}),g=y?.[0],b=d?Math.floor((Date.now()-new Date(d.timestamp).getTime())/6e4):null;x?.length&&Math.round(x.reduce((s,t)=>s+(t.actual_rto_minutes||0),0)/x.length),x?.length&&Math.round(x.reduce((s,t)=>s+(t.actual_rpo_minutes||0),0)/x.length);const V=x?.length?Math.round(x.filter(s=>s.recovery_success).length/x.length*100):0,B=async()=>{try{p.info(a("disasterRecoveryDashboard.runningManualBackupVerification"));const{data:s,error:t}=await l.functions.invoke("verify-database-backups");if(t)throw t;p.success(a("disasterRecoveryDashboard.backupVerificationCompletedSuccessfully")),setTimeout(()=>window.location.reload(),2e3)}catch(s){console.error("Manual verification failed:",s),p.error(a("disasterRecoveryDashboard.failedToRunBackupVerification"))}},E=async()=>{try{p.info(a("disasterRecoveryDashboard.runningManualPitrTest"));const{data:s,error:t}=await l.functions.invoke("test-pitr-recovery");if(t)throw t;p.success(a("disasterRecoveryDashboard.pitrTestCompletedSuccessfully")),setTimeout(()=>window.location.reload(),2e3)}catch(s){console.error("Manual PITR test failed:",s),p.error(a("disasterRecoveryDashboard.failedToRunPitrTest"))}},U=async s=>{try{const{error:t}=await l.from("platform_alerts").update({acknowledged:!0,acknowledged_at:new Date().toISOString(),acknowledged_by:(await l.auth.getUser()).data.user?.id}).eq("id",s);if(t)throw t;p.success(a("disasterRecoveryDashboard.alertAcknowledged")),q()}catch(t){console.error("Failed to acknowledge alert:",t),p.error(a("disasterRecoveryDashboard.failedToAcknowledgeAlert"))}},K=()=>{const s=new Blob([F],{type:"text/markdown"}),t=URL.createObjectURL(s),r=document.createElement("a");r.href=t,r.download="DR_RUNBOOKS.md",document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(t)},H=s=>{switch(s){case"critical":return"destructive";case"error":return"destructive";case"warning":return"secondary";default:return"default"}},v=s=>{switch(s){case"success":return e.jsx(_,{className:"h-5 w-5 text-green-500"});case"failed":return e.jsx(w,{className:"h-5 w-5 text-red-500"});case"partial":return e.jsx(R,{className:"h-5 w-5 text-amber-500"});default:return null}};return L?e.jsx("div",{className:"p-4",children:"Loading disaster recovery status..."}):e.jsxs("div",{className:"space-y-6 p-6",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-3xl font-bold",children:a("disasterRecoveryDashboard.disasterRecoveryCommandCenter")}),e.jsx("p",{className:"text-muted-foreground mt-1",children:"Comprehensive backup verification, PITR testing, and incident management"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(N,{variant:"outline",onClick:E,children:[e.jsx(T,{className:"h-4 w-4 mr-2"}),"Test PITR"]}),e.jsxs(N,{onClick:B,children:[e.jsx(I,{className:"h-4 w-4 mr-2"}),"Verify Backups"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-6 gap-4",children:[e.jsxs(i,{children:[e.jsxs(n,{className:"flex flex-row items-center justify-between space-y-0 pb-2",children:[e.jsx(c,{className:"text-sm font-medium",children:a("disasterRecoveryDashboard.rtoTarget")}),e.jsx(Q,{className:"h-4 w-4 text-muted-foreground"})]}),e.jsxs(o,{children:[e.jsx("div",{className:"text-2xl font-bold",children:"4 hours"}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"Max downtime"})]})]}),e.jsxs(i,{children:[e.jsxs(n,{className:"flex flex-row items-center justify-between space-y-0 pb-2",children:[e.jsx(c,{className:"text-sm font-medium",children:a("disasterRecoveryDashboard.currentRpo")}),e.jsx(I,{className:"h-4 w-4 text-muted-foreground"})]}),e.jsxs(o,{children:[e.jsxs("div",{className:"text-2xl font-bold flex items-center gap-2",children:[b!==null?`${b} min`:"Unknown",b!==null&&b<=360?e.jsx(_,{className:"h-5 w-5 text-green-500"}):e.jsx(w,{className:"h-5 w-5 text-amber-500"})]}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"Target: ≤6 hours"})]})]}),e.jsxs(i,{children:[e.jsxs(n,{className:"flex flex-row items-center justify-between space-y-0 pb-2",children:[e.jsx(c,{className:"text-sm font-medium",children:a("disasterRecoveryDashboard.backupHealth")}),e.jsx(S,{className:"h-4 w-4 text-muted-foreground"})]}),e.jsxs(o,{children:[e.jsx("div",{className:"text-2xl font-bold flex items-center gap-2",children:d?.verification_status==="success"?e.jsxs(e.Fragment,{children:["Healthy ",v("success")]}):d?.verification_status==="partial"?e.jsxs(e.Fragment,{children:["Partial ",v("partial")]}):e.jsxs(e.Fragment,{children:["Failed ",v("failed")]})}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:[d?.tables_verified,"/",d?.total_tables," tables"]})]})]}),e.jsxs(i,{children:[e.jsxs(n,{className:"flex flex-row items-center justify-between space-y-0 pb-2",children:[e.jsx(c,{className:"text-sm font-medium",children:a("disasterRecoveryDashboard.pitrStatus")}),e.jsx(T,{className:"h-4 w-4 text-muted-foreground"})]}),e.jsxs(o,{children:[e.jsx("div",{className:"text-2xl font-bold flex items-center gap-2",children:g?.test_status==="success"?e.jsxs(e.Fragment,{children:["Passing ",v("success")]}):g?.test_status==="failed"?e.jsxs(e.Fragment,{children:["Failed ",v("failed")]}):e.jsx(e.Fragment,{children:"No Data"})}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:g?`Last: ${new Date(g.timestamp).toLocaleDateString()}`:"No tests"})]})]}),e.jsxs(i,{children:[e.jsxs(n,{className:"flex flex-row items-center justify-between space-y-0 pb-2",children:[e.jsx(c,{className:"text-sm font-medium",children:a("disasterRecoveryDashboard.successRate")}),e.jsx(X,{className:"h-4 w-4 text-muted-foreground"})]}),e.jsxs(o,{children:[e.jsxs("div",{className:"text-2xl font-bold",children:[V,"%"]}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"Last 10 recoveries"})]})]}),e.jsxs(i,{children:[e.jsxs(n,{className:"flex flex-row items-center justify-between space-y-0 pb-2",children:[e.jsx(c,{className:"text-sm font-medium",children:a("disasterRecoveryDashboard.playbooks")}),e.jsx(P,{className:"h-4 w-4 text-muted-foreground"})]}),e.jsxs(o,{children:[e.jsx("div",{className:"text-2xl font-bold",children:C?.length||0}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"Ready to execute"})]})]})]}),j&&j.length>0&&e.jsxs(i,{children:[e.jsx(n,{children:e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(w,{className:"h-5 w-5"}),"Active Alerts (",j.length,")"]})}),e.jsx(o,{children:e.jsx("div",{className:"space-y-3",children:j.map(s=>e.jsxs("div",{className:"flex items-start justify-between p-3 border rounded-lg",children:[e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(m,{variant:H(s.severity),children:s.severity.toUpperCase()}),e.jsx("span",{className:"text-xs text-muted-foreground",children:new Date(s.created_at).toLocaleString()})]}),e.jsx("p",{className:"font-medium",children:s.message}),s.metadata?.issues&&s.metadata.issues.length>0&&e.jsx("ul",{className:"text-sm text-muted-foreground mt-2 space-y-1",children:s.metadata.issues.slice(0,3).map((t,r)=>e.jsxs("li",{children:["• ",t]},r))})]}),e.jsx(N,{variant:"outline",size:"sm",onClick:()=>U(s.id),children:"Acknowledge"})]},s.id))})})]}),e.jsxs(W,{defaultValue:"overview",className:"space-y-4",children:[e.jsxs($,{children:[e.jsx(h,{value:"overview",children:a("disasterRecoveryDashboard.overview")}),e.jsx(h,{value:"backups",children:a("disasterRecoveryDashboard.backupHistory")}),e.jsx(h,{value:"incidents",children:a("disasterRecoveryDashboard.incidents")}),e.jsx(h,{value:"drills",children:a("disasterRecoveryDashboard.drDrills")}),e.jsx(h,{value:"playbooks",children:a("disasterRecoveryDashboard.playbooks")}),e.jsx(h,{value:"dependencies",children:a("disasterRecoveryDashboard.dependencies")}),e.jsx(h,{value:"contacts",children:a("disasterRecoveryDashboard.contacts")}),e.jsx(h,{value:"runbooks",children:a("disasterRecoveryDashboard.runbooks")})]}),e.jsx(f,{value:"overview",className:"space-y-4",children:d?.tier_results&&e.jsxs(i,{children:[e.jsxs(n,{children:[e.jsx(c,{children:a("disasterRecoveryDashboard.backupVerificationByTier")}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Latest verification: ",new Date(d.timestamp).toLocaleString()]})]}),e.jsxs(o,{children:[e.jsx("div",{className:"space-y-4",children:Object.entries(d.tier_results).map(([s,t])=>{const r=t.verified/t.total*100;return e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[r===100?e.jsx(_,{className:"h-4 w-4 text-green-500"}):r>=90?e.jsx(R,{className:"h-4 w-4 text-amber-500"}):e.jsx(w,{className:"h-4 w-4 text-red-500"}),e.jsx("span",{className:"font-medium",children:s})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("span",{className:"text-sm text-muted-foreground",children:[t.verified,"/",t.total," tables"]}),e.jsxs(m,{variant:r===100?"default":r>=90?"secondary":"destructive",children:[r.toFixed(0),"%"]}),e.jsxs("span",{className:"text-xs text-muted-foreground",children:[t.duration_ms,"ms"]})]})]}),e.jsx("div",{className:"w-full bg-muted rounded-full h-2",children:e.jsx("div",{className:`h-2 rounded-full transition-all ${r===100?"bg-green-500":r>=90?"bg-amber-500":"bg-red-500"}`,style:{width:`${r}%`}})})]},s)})}),e.jsx("div",{className:"mt-4 pt-4 border-t",children:e.jsxs("div",{className:"flex items-center justify-between text-sm",children:[e.jsx("span",{className:"text-muted-foreground",children:a("disasterRecoveryDashboard.totalCoverage")}),e.jsxs("span",{className:"font-medium",children:[d.tables_verified,"/",d.total_tables," tables (",(d.tables_verified/d.total_tables*100).toFixed(1),"%)"]})]})})]})]})}),e.jsx(f,{value:"backups",className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[e.jsxs(i,{children:[e.jsx(n,{children:e.jsx(c,{children:a("disasterRecoveryDashboard.recentBackupVerifications")})}),e.jsx(o,{children:e.jsx("div",{className:"space-y-2",children:A?.slice(0,5).map(s=>e.jsxs("div",{className:"flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[v(s.verification_status),e.jsxs("div",{children:[e.jsx("p",{className:"font-medium",children:new Date(s.timestamp).toLocaleString()}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:[s.tables_verified,"/",s.total_tables," tables • ",s.verification_duration_ms,"ms"]})]})]}),e.jsx(m,{variant:s.verification_status==="success"?"default":"secondary",children:s.verification_status})]},s.id))})})]}),e.jsxs(i,{children:[e.jsx(n,{children:e.jsx(c,{children:a("disasterRecoveryDashboard.recentPitrTests")})}),e.jsx(o,{children:e.jsxs("div",{className:"space-y-2",children:[y?.slice(0,5).map(s=>e.jsxs("div",{className:"flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[v(s.test_status==="success"?"success":"failed"),e.jsxs("div",{children:[e.jsx("p",{className:"font-medium",children:new Date(s.timestamp).toLocaleString()}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Accuracy: ",s.recovery_accuracy,"% • ",s.duration_seconds,"s"]})]})]}),e.jsx(m,{variant:s.test_status==="success"?"default":"destructive",children:s.test_status})]},s.id)),(!y||y.length===0)&&e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(T,{className:"h-12 w-12 mx-auto mb-2 opacity-50"}),e.jsx("p",{children:a("disasterRecoveryDashboard.noPitrTestsRunYet")}),e.jsx("p",{className:"text-sm",children:a("disasterRecoveryDashboard.clickTestPitrToRunYour")})]})]})})]})]})}),e.jsx(f,{value:"incidents",className:"space-y-4",children:e.jsxs(i,{children:[e.jsx(n,{children:e.jsx(c,{children:a("disasterRecoveryDashboard.recentIncidents")})}),e.jsx(o,{children:e.jsxs("div",{className:"space-y-2",children:[D?.map(s=>e.jsxs("div",{className:"flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[s.severity==="critical"?e.jsx(R,{className:"h-4 w-4 text-red-500"}):s.severity==="error"?e.jsx(R,{className:"h-4 w-4 text-orange-500"}):e.jsx(Y,{className:"h-4 w-4 text-amber-500"}),e.jsxs("div",{children:[e.jsx("p",{className:"font-medium",children:s.title}),e.jsx("p",{className:"text-sm text-muted-foreground",children:new Date(s.created_at).toLocaleString()})]})]}),e.jsx(m,{variant:s.status==="resolved"?"default":"destructive",children:s.status})]},s.id)),!D||D.length===0&&e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(S,{className:"h-12 w-12 mx-auto mb-2 opacity-50"}),e.jsx("p",{children:a("disasterRecoveryDashboard.noRecentIncidents")})]})]})})]})}),e.jsx(f,{value:"drills",className:"space-y-4",children:e.jsxs(i,{children:[e.jsx(n,{children:e.jsx(c,{children:a("disasterRecoveryDashboard.scheduledDrDrills")})}),e.jsx(o,{children:e.jsxs("div",{className:"space-y-2",children:[k?.map(s=>e.jsxs("div",{className:"flex items-center justify-between p-3 border rounded-lg",children:[e.jsxs("div",{children:[e.jsx("p",{className:"font-medium",children:s.drill_name}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:[new Date(s.scheduled_for).toLocaleString()," • ",s.duration_hours,"h"]})]}),e.jsx(m,{children:s.drill_type})]},s.id)),!k||k.length===0&&e.jsx("div",{className:"text-center py-8 text-muted-foreground",children:e.jsx("p",{children:a("disasterRecoveryDashboard.noScheduledDrills")})})]})})]})}),e.jsx(f,{value:"playbooks",className:"space-y-4",children:e.jsxs(i,{children:[e.jsx(n,{children:e.jsx(c,{children:a("disasterRecoveryDashboard.recoveryPlaybooks")})}),e.jsx(o,{children:e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:C?.map(s=>e.jsxs("div",{className:"p-4 border rounded-lg hover:bg-muted/50 cursor-pointer",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("h3",{className:"font-medium",children:s.playbook_name}),e.jsx(m,{variant:s.severity_level==="critical"?"destructive":"secondary",children:s.severity_level})]}),e.jsx("p",{className:"text-sm text-muted-foreground mb-2",children:s.scenario_type.replace(/_/g," ")}),e.jsxs("div",{className:"flex gap-4 text-xs text-muted-foreground",children:[e.jsxs("span",{children:["RTO: ",s.estimated_rto_minutes,"m"]}),e.jsxs("span",{children:["RPO: ",s.estimated_rpo_minutes,"m"]}),e.jsxs("span",{children:["v",s.version]})]})]},s.id))})})]})}),e.jsx(f,{value:"dependencies",className:"space-y-4",children:e.jsxs(i,{children:[e.jsx(n,{children:e.jsx(c,{children:a("disasterRecoveryDashboard.serviceDependencies")})}),e.jsx(o,{children:e.jsx("div",{className:"space-y-2",children:M?.map(s=>e.jsxs("div",{className:"flex items-center justify-between p-3 border rounded-lg",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(J,{className:"h-4 w-4"}),e.jsxs("div",{children:[e.jsx("p",{className:"font-medium",children:s.service_name}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:[s.service_type," • MTTR: ",s.mttr_minutes,"m"]})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(m,{variant:s.criticality==="critical"?"destructive":"secondary",children:s.criticality}),e.jsx(m,{variant:"outline",children:s.dependency_type})]})]},s.id))})})]})}),e.jsx(f,{value:"contacts",className:"space-y-4",children:e.jsxs(i,{children:[e.jsx(n,{children:e.jsx(c,{children:a("disasterRecoveryDashboard.drContactList")})}),e.jsx(o,{children:e.jsx("div",{className:"space-y-2",children:O?.map(s=>e.jsxs("div",{className:"flex items-center justify-between p-3 border rounded-lg",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(Z,{className:"h-4 w-4"}),e.jsxs("div",{children:[e.jsx("p",{className:"font-medium",children:s.contact_name}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:[s.email," ",s.phone&&`• ${s.phone}`]})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(m,{children:["L",s.escalation_level]}),e.jsx(m,{variant:"outline",children:s.role})]})]},s.id))})})]})}),e.jsx(f,{value:"runbooks",className:"space-y-4",children:e.jsxs(i,{children:[e.jsxs(n,{className:"flex flex-row items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(P,{className:"h-6 w-6 text-primary"}),e.jsx(c,{children:a("disasterRecoveryDashboard.disasterRecoveryRunbooks")})]}),e.jsxs(N,{variant:"outline",onClick:K,children:[e.jsx(ee,{className:"h-4 w-4 mr-2"}),"Download Runbooks"]})]}),e.jsx(o,{children:e.jsx("div",{className:"prose prose-slate dark:prose-invert max-w-none",children:e.jsx(G,{children:F})})})]})})]})]})};export{ge as D};
