# 🚨 Disaster Recovery Runbooks

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

1. **Verify Outage Scope**
   ```bash
   curl https://dpjucecmoyfzrduhlctt.supabase.co/rest/v1/profiles?limit=1
   # Expected: 200 OK or specific error
   ```

2. **Check Platform Status**
   - Visit Lovable Cloud status page
   - Check backup verification logs: `/admin/disaster-recovery`
   - Review recent platform alerts

3. **Activate Incident Response**
   ```bash
   # Post to #incidents channel
   - Severity: P1 - Critical
   - Title: Database Outage
   - Impact: All users affected
   - ETA: Investigating
   ```

4. **Enable Maintenance Mode**
   - Update status page
   - Notify enterprise customers via email
   - Display maintenance banner in app

### **Recovery Actions (15-60 minutes):**

5. **Check Last Known Good State**
   - Review backup verification logs
   - Identify most recent successful backup
   - Note timestamp and verification status

6. **Contact Lovable Support**
   - Open critical support ticket
   - Provide backup verification log ID
   - Request immediate database restoration

7. **Verify Critical Tables Post-Recovery**
   ```sql
   SELECT COUNT(*) FROM profiles; -- Should match pre-incident
   SELECT COUNT(*) FROM applications;
   SELECT COUNT(*) FROM candidate_profiles;
   SELECT COUNT(*) FROM jobs;
   SELECT COUNT(*) FROM companies;
   ```

8. **Test Core Flows**
   - [ ] User login (SSO + Email)
   - [ ] Profile viewing
   - [ ] Application submission
   - [ ] Meeting scheduling
   - [ ] Booking creation
   - [ ] Message sending

### **Post-Recovery (60-120 minutes):**

9. **Data Integrity Check**
   - Run manual backup verification
   - Check PITR test results
   - Verify no data corruption

10. **Notify Stakeholders**
    - Email incident report to enterprise clients
    - Update status page with resolution
    - Post-mortem within 24 hours

11. **Document Incident**
    ```markdown
    ## Incident Report: [DATE]
    - **Root Cause:** [Description]
    - **Impact:** [Users affected, duration]
    - **Resolution:** [Actions taken]
    - **Data Loss:** [None / X minutes RPO]
    - **Prevention:** [Changes to prevent recurrence]
    ```

---

## **Runbook 2: Data Corruption Detected**

### **Symptoms:**
- Incorrect data returned from queries
- Foreign key violations in logs
- Backup verification showing failed status
- PITR tests failing
- Users reporting missing or incorrect data

### **Immediate Actions (0-30 minutes):**

1. **Isolate Affected Tables**
   ```sql
   -- Check backup verification logs
   SELECT * FROM backup_verification_logs 
   WHERE verification_status = 'failed' 
   ORDER BY timestamp DESC LIMIT 1;
   ```

2. **Enable Read-Only Mode (if possible)**
   - Prevent further data corruption
   - Notify users of limited functionality
   - Document current state

3. **Identify Last Known Good State**
   ```sql
   -- Find last successful backup
   SELECT timestamp, backup_id FROM backup_verification_logs
   WHERE verification_status = 'success'
   ORDER BY timestamp DESC LIMIT 1;
   ```

4. **Assess Data Loss Window**
   - Calculate RPO (time since last good backup)
   - Identify affected transactions
   - Estimate business impact

### **Recovery Actions (30-120 minutes):**

5. **Contact Lovable Support for PITR**
   - Provide target recovery timestamp
   - Request Point-in-Time Recovery
   - Specify affected tables if partial recovery possible

6. **Validate Restored Data**
   ```sql
   -- Check row counts match expected values
   SELECT 
     schemaname,
     tablename,
     n_live_tup as row_count
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   ORDER BY n_live_tup DESC;
   ```

7. **Reconcile Recent Transactions**
   ```sql
   -- Review audit logs for lost transactions
   SELECT * FROM audit_events 
   WHERE created_at > '[RECOVERY_TIMESTAMP]'
   ORDER BY created_at;
   ```

8. **Manual Data Recovery (if needed)**
   - Contact affected users
   - Request re-submission of critical data
   - Document manual interventions

---

## **Runbook 3: Edge Function Failure**

### **Symptoms:**
- AI features not responding
- Webhooks timing out
- API calls returning 500 errors
- Specific features non-functional

### **Immediate Actions (0-15 minutes):**

1. **Identify Failed Function**
   - Check edge function logs in Lovable Cloud
   - Review error messages
   - Determine affected features

2. **Check Recent Deployments**
   - Review recent code changes
   - Check deployment timestamps
   - Identify potential breaking changes

### **Recovery Actions (15-60 minutes):**

3. **Rollback to Previous Version**
   ```bash
   # Via git
   git log --oneline supabase/functions/[function-name]
   git checkout [previous-commit] -- supabase/functions/[function-name]
   git commit -m "Rollback [function-name] to stable version"
   ```

4. **Redeploy Function**
   - Lovable will auto-deploy on git push
   - Monitor deployment logs
   - Test function manually

5. **Verify Function Health**
   ```bash
   # Test function endpoint
   curl -X POST \
     https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/[function-name] \
     -H "Authorization: Bearer [ANON_KEY]" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

---

## **Runbook 4: Backup Verification Failure**

### **Symptoms:**
- Backup verification showing "failed" or "partial" status
- Platform alerts for backup failures
- Tables not verifiable

### **Immediate Actions (0-30 minutes):**

1. **Check Alert Details**
   ```sql
   -- View recent backup alerts
   SELECT * FROM platform_alerts
   WHERE alert_type = 'backup_verification_failed'
   ORDER BY created_at DESC LIMIT 5;
   ```

2. **Run Manual Verification**
   - Go to `/admin/disaster-recovery`
   - Click "Run Manual Verification"
   - Review detailed results

3. **Identify Failed Tables**
   ```sql
   -- Check which tables failed
   SELECT * FROM backup_verification_logs
   WHERE verification_status != 'success'
   ORDER BY timestamp DESC LIMIT 1;
   ```

### **Recovery Actions (30-120 minutes):**

4. **Investigate Table Issues**
   - Check table permissions (RLS policies)
   - Verify table exists
   - Test direct queries to affected tables

5. **Contact Lovable Support**
   - If backup infrastructure issue
   - Provide verification log details
   - Request immediate investigation

6. **Document Resolution**
   - Update backup verification logs
   - Acknowledge platform alerts
   - Post-incident review

---

## **Runbook 5: PITR Test Failure**

### **Symptoms:**
- PITR test logs showing "failed" status
- Critical alert for PITR test failure
- Recovery accuracy below 100%

### **Immediate Actions (0-30 minutes):**

1. **Review Test Results**
   ```sql
   SELECT * FROM pitr_test_logs
   WHERE test_status = 'failed'
   ORDER BY timestamp DESC LIMIT 5;
   ```

2. **Check Test Notes**
   - Review failure reasons
   - Identify patterns
   - Assess severity

3. **Run Manual PITR Test**
   - Test recovery capability
   - Verify data integrity
   - Document findings

### **Recovery Actions (30-120 minutes):**

4. **Contact Lovable Support**
   - Report PITR test failures
   - Request backup infrastructure review
   - Escalate if multiple failures

5. **Increase Test Frequency (temporarily)**
   - Monitor for patterns
   - Validate backup pipeline
   - Document all test results

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
```
Subject: [P1 INCIDENT] Platform Database Outage

Team,

We are experiencing a critical platform outage affecting all users.

Status: INVESTIGATING
Impact: All database operations failing
ETA: Investigating, updates every 15 minutes
Action: Recovery in progress

Next update: [TIME + 15 min]
```

### **Resolution Notification**
```
Subject: [RESOLVED] Platform Database Outage

Team,

The platform has been restored and all services are operational.

Duration: [X minutes]
Root Cause: [Brief description]
Data Loss: [None / X minutes]
Action Taken: [Brief description]

Full post-mortem: [Link to document]
Next steps: [Prevention measures]
```

---

## **Escalation Contacts**

| **Role** | **Escalation Time** | **Contact** |
|----------|-------------------|-------------|
| On-Call Engineer | Immediate | [Internal system] |
| CTO | 15 minutes | [Contact] |
| Lovable Support | 20 minutes | [Support channel] |
| Enterprise Customers | 30 minutes | [Email list] |

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
