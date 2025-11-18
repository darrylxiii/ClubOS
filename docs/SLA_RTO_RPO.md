# Service Level Agreement: Recovery Time & Recovery Point Objectives

**The Quantum Club Enterprise SLA**  
**Version:** 2.0  
**Effective Date:** November 18, 2025  
**Last Updated:** November 18, 2025

---

## 1. Overview

This Service Level Agreement (SLA) defines The Quantum Club's commitments regarding system availability, disaster recovery, and data protection for enterprise customers.

---

## 2. Service Commitments by Tier

### 2.1 Tier 1: Enterprise Customers

**Target Customer Profile:**
- Companies with 500+ employees
- Multiple concurrent recruiters (10+)
- High-volume hiring (50+ positions/year)
- Mission-critical talent acquisition

**Commitments:**

| **Metric** | **Commitment** | **Definition** |
|------------|---------------|----------------|
| **RTO** (Recovery Time Objective) | **4 hours** | Maximum time to restore service after total outage |
| **RPO** (Recovery Point Objective) | **15 minutes** | Maximum acceptable data loss window |
| **Uptime SLA** | **99.9% monthly** | 43 minutes max downtime per month |
| **Backup Frequency** | **Every 6 hours** | Automated verified backups |
| **PITR Window** | **30 days** | Point-in-time recovery capability |
| **Critical Issue Response** | **30 minutes** | Initial response to P1 incidents |
| **Incident Updates** | **Every 1 hour** | Status updates during outages |
| **Dedicated Support** | **24/7** | Phone, email, Slack channel |

**Financial Remedies:**
- **99.0% - 99.9% uptime:** 10% monthly service credit
- **95.0% - 99.0% uptime:** 25% monthly service credit
- **< 95.0% uptime:** 50% monthly service credit
- **RTO exceeded:** Additional 25% credit
- **RPO exceeded (data loss):** Additional 50% credit

---

### 2.2 Tier 2: Professional Customers

**Target Customer Profile:**
- Companies with 100-500 employees
- Small recruiting teams (3-10 members)
- Moderate hiring volume (10-50 positions/year)

**Commitments:**

| **Metric** | **Commitment** | **Definition** |
|------------|---------------|----------------|
| **RTO** | **8 hours** | Maximum time to restore service |
| **RPO** | **1 hour** | Maximum data loss window |
| **Uptime SLA** | **99.5% monthly** | 3.6 hours max downtime per month |
| **Backup Frequency** | **Every 12 hours** | Automated backups |
| **PITR Window** | **14 days** | Point-in-time recovery |
| **Critical Issue Response** | **2 hours** | Initial response to P1 incidents |
| **Incident Updates** | **Every 4 hours** | Status updates during outages |
| **Support Hours** | **Business hours** | Monday-Friday, 9 AM - 6 PM CET |

**Financial Remedies:**
- **97.0% - 99.5% uptime:** 10% monthly service credit
- **< 97.0% uptime:** 25% monthly service credit

---

### 2.3 Tier 3: Standard Customers

**Target Customer Profile:**
- Small businesses and startups
- 1-3 recruiters
- Low hiring volume (< 10 positions/year)

**Commitments:**

| **Metric** | **Commitment** | **Definition** |
|------------|---------------|----------------|
| **RTO** | **24 hours** | Maximum time to restore service |
| **RPO** | **6 hours** | Maximum data loss window |
| **Uptime SLA** | **99.0% monthly** | 7.2 hours max downtime per month |
| **Backup Frequency** | **Daily** | Automated backups |
| **PITR Window** | **7 days** | Point-in-time recovery |
| **Issue Response** | **8 business hours** | Initial response |
| **Support Hours** | **Business hours** | Email support only |

**Financial Remedies:**
- **< 99.0% uptime:** 10% monthly service credit

---

## 3. Definitions

### 3.1 Recovery Time Objective (RTO)
The maximum acceptable time between service interruption and restoration. Measured from the moment an incident is **detected** (not reported) until full service is **verified restored**.

**Example:**
- **11:00 AM:** Automated monitoring detects database outage
- **11:30 AM:** Engineering team begins recovery procedures
- **2:45 PM:** Service restored and verified operational
- **Actual RTO:** 3 hours 45 minutes ✅ (Within 4-hour commitment)

### 3.2 Recovery Point Objective (RPO)
The maximum acceptable amount of data loss measured in time. This is the age of the oldest data that must be recovered.

**Example:**
- **Last verified backup:** 10:45 AM
- **Incident occurred:** 11:00 AM
- **RPO achieved:** 15 minutes ✅ (Within 15-minute commitment)

### 3.3 Uptime
The percentage of time the platform is available and functioning correctly, calculated monthly.

**Formula:**
```
Uptime % = (Total Minutes in Month - Downtime Minutes) / Total Minutes in Month × 100
```

**Exclusions from Downtime:**
- Planned maintenance (notified 48 hours in advance)
- Customer-caused issues (API abuse, misconfigurations)
- Third-party service failures (AWS, Cloudflare, Stripe)
- Force majeure events (natural disasters, war, terrorism)

### 3.4 Incident Severity Levels

| **Severity** | **Definition** | **Examples** |
|--------------|---------------|--------------|
| **P1 - Critical** | Complete platform unavailable | Database down, authentication failure |
| **P2 - High** | Major feature unavailable | AI matching disabled, search broken |
| **P3 - Medium** | Minor feature degraded | Slow load times, UI glitches |
| **P4 - Low** | Cosmetic issues | Typos, minor UI inconsistencies |

---

## 4. Backup & Recovery Strategy

### 4.1 Backup Types

**Continuous PITR Backups:**
- Real-time transaction log shipping
- Retained for 30 days (Enterprise), 14 days (Professional), 7 days (Standard)
- Sub-second RPO capability

**Verified Snapshots:**
- Full database snapshots every 6 hours
- Automated verification tests
- Immutable storage for compliance

**Differential Backups:**
- Incremental changes every hour
- Reduces storage costs
- Faster restoration times

### 4.2 Data Retention by Criticality

| **Data Type** | **Criticality** | **Backup Frequency** | **Retention** |
|--------------|----------------|---------------------|---------------|
| User profiles | Critical | Real-time + 6h snapshots | 90 days |
| Applications | Critical | Real-time + 6h snapshots | 90 days |
| Audit logs | Critical | Real-time (immutable) | 7 years |
| Match scores | High | 6-hourly snapshots | 60 days |
| Messages | High | 6-hourly snapshots | 60 days |
| Error logs | Medium | Daily snapshots | 30 days |
| WebRTC signals | Low | None (ephemeral) | 7 days |

### 4.3 Backup Verification

**Automated Tests:**
- Database integrity checks: Every 6 hours
- PITR recovery tests: Weekly
- Full disaster recovery drill: Quarterly

**Metrics Tracked:**
- Backup success rate (target: 99.9%)
- Verification test pass rate (target: 100%)
- Average restoration time (target: < 2 hours)

---

## 5. Disaster Recovery Procedures

### 5.1 Incident Response Timeline

**0-5 minutes: Detection**
- Automated monitoring detects anomaly
- PagerDuty alerts on-call engineer
- Status page updated: "Investigating"

**5-15 minutes: Assessment**
- On-call engineer confirms issue
- Incident severity assigned (P1-P4)
- Incident commander appointed (for P1/P2)
- Customer notifications sent (Enterprise)

**15-60 minutes: Initial Response**
- Root cause analysis begins
- Immediate mitigation applied
- Rollback or failover initiated (if applicable)
- Stakeholder war room established (P1)

**60-240 minutes: Resolution**
- Primary recovery procedures executed
- Service verification and testing
- Status page updated: "Monitoring"
- Customer all-clear notification

**240+ minutes: Post-Incident**
- Root cause analysis completed
- Postmortem document published
- Prevention measures implemented
- Customer follow-up calls (Enterprise)

### 5.2 Escalation Path

```
P4 Incident → On-call Engineer
    ↓ (if unresolved in 8 hours)
P3 Incident → Engineering Lead
    ↓ (if unresolved in 4 hours)
P2 Incident → VP Engineering + CTO
    ↓ (if unresolved in 1 hour)
P1 Incident → CEO + All Leadership
```

---

## 6. Measurement & Reporting

### 6.1 Monthly SLA Reports

Enterprise customers receive detailed monthly reports including:

**Performance Metrics:**
- Actual uptime percentage
- Number and duration of incidents
- RTO/RPO achieved vs. target
- Mean time to detection (MTTD)
- Mean time to resolution (MTTR)

**Backup Health:**
- Backup success rate
- PITR test results
- Storage utilization
- Verification test outcomes

**Compliance Status:**
- SLA compliance (met/breached)
- Service credits issued
- Security audit findings
- Planned maintenance schedule

**Report Delivery:**
- **Enterprise:** 5th business day of each month
- **Professional:** Available on-demand via dashboard
- **Standard:** Self-service dashboard only

### 6.2 Real-Time Monitoring

**Public Status Page:**
- https://status.thequantumclub.com
- Real-time service status
- Historical uptime data
- Scheduled maintenance calendar

**Enterprise Dashboard:**
- Live RTO/RPO metrics
- Backup verification status
- Current incident status
- SLA compliance tracking

---

## 7. Service Credits

### 7.1 Credit Calculation

**Example (Enterprise Tier):**

**Scenario:** 2-hour outage in a 30-day month
- **Target uptime:** 99.9% = 43 minutes allowed downtime
- **Actual downtime:** 120 minutes
- **Actual uptime:** 99.72% = (43,200 - 120) / 43,200

**Credit Determination:**
- **99.72% falls in 99.0% - 99.9% range** → 10% credit
- **RTO target:** 4 hours
- **Actual RTO:** 2 hours ✅ → No additional credit

**Service Credit:** 10% of monthly subscription fee

### 7.2 Credit Redemption Process

**Eligibility:**
- Customer must request credit within 30 days of incident
- Credits applied to following month's invoice
- Maximum credit per month: 100% of subscription fee
- Credits do not roll over to subsequent months

**Request Process:**
1. Email support@thequantumclub.com with subject "SLA Credit Request"
2. Reference incident ID and date
3. Credit reviewed and approved within 5 business days
4. Applied to next invoice automatically

---

## 8. Exclusions & Limitations

### 8.1 Excluded Downtime

The following do **NOT** count toward downtime calculations:

**Planned Maintenance:**
- Scheduled maintenance windows (announced 48h in advance)
- Maximum 4 hours/month
- Conducted during low-traffic periods (Sunday 2-6 AM CET)

**Customer-Caused Issues:**
- API rate limit violations
- Incorrect API usage or configurations
- Insufficient subscription tier for usage patterns
- Security incidents caused by customer (compromised credentials)

**Third-Party Failures:**
- AWS infrastructure outages
- Cloudflare CDN issues
- Stripe payment processing downtime
- Email delivery provider failures

**Force Majeure:**
- Natural disasters (earthquakes, floods, hurricanes)
- War, terrorism, civil unrest
- Government actions or regulations
- Pandemics or public health emergencies

### 8.2 Best Efforts Basis

While we commit to the SLAs above, the following are provided on a **best efforts** basis:

- Response times for P3/P4 incidents
- Resolution times for non-critical issues
- Feature requests and enhancements
- Migration assistance
- Custom integrations

---

## 9. Customer Responsibilities

To maintain SLA eligibility, customers must:

**Technical Requirements:**
- Use supported browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Maintain minimum network bandwidth (10 Mbps)
- Follow API rate limits and best practices
- Keep integrations up-to-date

**Security Requirements:**
- Enable MFA for all admin accounts
- Rotate API keys every 90 days
- Report security incidents within 24 hours
- Follow data handling guidelines

**Operational Requirements:**
- Provide accurate contact information for incident notifications
- Participate in disaster recovery drills (Enterprise only)
- Respond to security questionnaires within 10 business days
- Maintain current billing information

---

## 10. Multi-Region Failover (Enterprise Only)

### 10.1 Availability

Enterprise customers on annual contracts can opt into multi-region deployment:

**Primary Region:** US East (AWS us-east-1)
**Secondary Region:** EU West (AWS eu-west-1)

**Replication:**
- Real-time logical replication
- < 5 second replication lag
- Automatic failover on primary region failure

**RTO Improvement:**
- Standard RTO: 4 hours (single region)
- Multi-region RTO: 2 hours (automatic failover)

**Additional Cost:**
- +$2,000/month for secondary region
- Included free for contracts > $50,000 ARR

### 10.2 Failover Process

**Automatic Failover Triggers:**
- Primary region unavailable for 10+ minutes
- Database corruption detected
- RTO target at risk (after 2 hours of downtime)

**Failover Steps:**
1. Automated health checks detect primary failure
2. Secondary region promoted to primary
3. DNS updated to route traffic to EU
4. Customer notification sent
5. US region restored as secondary (when available)

---

## 11. Changes to This SLA

**Notification:**
- Material changes communicated 60 days in advance
- Non-material changes: 30 days advance notice
- Emergency changes: Immediate notification with explanation

**Customer Options:**
- Accept changes (automatic upon renewal)
- Negotiate custom SLA (Enterprise only)
- Cancel service with pro-rated refund

---

## 12. Contact Information

**Enterprise Support:**
- **Email:** enterprise@thequantumclub.com
- **Phone:** +31 20 123 4567 (24/7)
- **Slack Connect:** Available upon request

**SLA Questions:**
- **Email:** sla@thequantumclub.com
- **Response Time:** 1 business day

**Incident Reporting:**
- **Email:** incidents@thequantumclub.com
- **Phone:** +31 20 123 4567
- **Status Page:** https://status.thequantumclub.com

---

## 13. Legal

**Governing Law:** This SLA is governed by the laws of the Netherlands.

**Entire Agreement:** This SLA is incorporated into and forms part of the Master Services Agreement between The Quantum Club and Customer.

**Severability:** If any provision is found unenforceable, the remainder shall remain in effect.

**Precedence:** In case of conflict, this SLA takes precedence over other service documentation.

---

**THE QUANTUM CLUB B.V.**  
Amsterdam, Netherlands  
KvK: [Registration Number]  
VAT: NL[VAT Number]

**Authorized Signatory:**  
[Name]  
Chief Technology Officer

**Date:** November 18, 2025

---

## Appendix A: Incident Severity Matrix

| **Severity** | **Impact** | **Users Affected** | **Response Time** | **Update Frequency** | **Resolution Target** |
|--------------|-----------|-------------------|------------------|---------------------|---------------------|
| **P1** | Total outage | All users | 30 min (Enterprise)<br>2 hours (Professional) | Every 1 hour | 4 hours (Enterprise)<br>8 hours (Professional) |
| **P2** | Major degradation | > 50% users | 2 hours | Every 4 hours | 24 hours |
| **P3** | Minor degradation | < 50% users | 8 business hours | Daily | 72 hours |
| **P4** | Cosmetic | Minimal | 3 business days | Upon resolution | Best effort |

---

## Appendix B: Backup Verification Test Schedule

| **Test Type** | **Frequency** | **Duration** | **Pass Criteria** |
|--------------|--------------|-------------|------------------|
| Database integrity check | Every 6 hours | 2-5 minutes | All critical tables verified |
| PITR recovery test | Weekly (Sunday 2 AM) | 10-15 minutes | Recovery within 15-minute RPO |
| Full disaster recovery drill | Quarterly | 4 hours | Complete restoration within RTO |
| Failover test (multi-region) | Monthly | 1 hour | < 2 hour failover time |

---

**END OF SERVICE LEVEL AGREEMENT**
