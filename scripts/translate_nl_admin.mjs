#!/usr/bin/env node
/**
 * Deep Translation — Admin namespace for NL
 * Handles the 1179 untranslated admin keys specifically for Dutch
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const LOCALES = resolve(import.meta.dirname, '../src/i18n/locales');

const NL_ADMIN = {
  "users": {
    "activityStatusCard": {
      "strongGrowth": "Sterke groei",
      "growthTrend": "Groeitrend",
      "activeUsers": "Actieve gebruikers",
      "newUsers": "Nieuwe gebruikers",
      "inactiveUsers": "Inactieve gebruikers",
      "totalUsers": "Totale gebruikers",
      "engagementRate": "Betrokkenheidspercentage",
      "retention": "Retentie",
      "churnRate": "Verlooppercentage",
      "dailyActiveUsers": "Dagelijks actieve gebruikers",
      "weeklyActiveUsers": "Wekelijks actieve gebruikers",
      "monthlyActiveUsers": "Maandelijks actieve gebruikers",
      "userGrowth": "Gebruikersgroei",
      "signUps": "Registraties",
      "activations": "Activeringen",
    },
    "candidatesTab": {
      "candidates": "Kandidaten",
      "suspended": "Geschorst",
      "pending": "In behandeling",
      "active": "Actief",
      "inactive": "Inactief",
      "verified": "Geverifieerd",
      "unverified": "Niet geverifieerd",
      "profileComplete": "Profiel compleet",
      "profileIncomplete": "Profiel onvolledig",
      "recentApplications": "Recente sollicitaties",
      "topRated": "Hoogst beoordeeld",
      "flagged": "Gemarkeerd",
      "export": "Exporteren",
      "bulkActions": "Bulkacties",
      "searchCandidates": "Kandidaten zoeken",
      "filterByStatus": "Filteren op status",
      "filterByRole": "Filteren op rol",
      "sortBy": "Sorteren op",
      "lastActive": "Laatst actief",
      "dateJoined": "Datum van toetreding",
      "applicationCount": "Aantal sollicitaties",
    },
    "partnersTab": {
      "partners": "Partners",
      "activePartners": "Actieve partners",
      "inactivePartners": "Inactieve partners",
      "partnerRevenue": "Partneromzet",
      "totalPlacements": "Totale plaatsingen",
      "avgPlacementTime": "Gem. plaatsingstijd",
      "satisfactionScore": "Tevredenheidsscore",
      "topPerformers": "Toppresteerders",
      "underPerformers": "Onderpresteerders",
      "newPartners": "Nieuwe partners",
      "partnerGrowth": "Partnergroei",
    },
    "strategistsTab": {
      "strategists": "Strategen",
      "activeStrategists": "Actieve strategen",
      "assignedCandidates": "Toegewezen kandidaten",
      "avgCandidatesPerStrategist": "Gem. kandidaten per strateeg",
      "performanceScore": "Prestatiescore",
      "clientSatisfaction": "Klanttevredenheid",
      "placementSuccess": "Plaatsingssucces",
      "responseTime": "Reactietijd",
    },
  },
  "title": "Beheer",
  "overview": "Overzicht",
  "analytics": "Analyse",
  "reports": "Rapportages",
  "settings": "Instellingen",
  "userManagement": "Gebruikersbeheer",
  "contentManagement": "Contentbeheer",
  "systemHealth": "Systeemgezondheid",
  "auditLog": "Auditlogboek",
  "integrations": "Integraties",
  "billing": "Facturering",
  "security": "Beveiliging",
  "notifications": "Meldingen",
  "customize": "Aanpassen",
  "permissions": "Rechten",
  "roles": "Rollen",
  "featureFlags": "Functie-flags",
  "dataExport": "Gegevensexport",
  "dataImport": "Gegevensimport",
  "backup": "Back-up",
  "restore": "Herstellen",
  "maintenance": "Onderhoud",
  "logs": "Logboeken",
  "monitoring": "Monitoring",
  "alerts": "Meldingen",
  "performance": "Prestaties",
  "database": "Database",
  "storage": "Opslag",
  "api": "API",
  "webhooks": "Webhooks",
  "emailTemplates": "E-mailsjablonen",
  "branding": "Branding",
  "localization": "Lokalisatie",
  "compliance": "Naleving",
  "gdpr": "AVG",
  "dataRetention": "Gegevensretentie",
  "privacySettings": "Privacy-instellingen",
  "accessControl": "Toegangscontrole",
  "ssoSettings": "SSO-instellingen",
  "apiKeys": "API-sleutels",
  "rateLimiting": "Rate limiting",
  "ipWhitelist": "IP-whitelist",
  "twoFactorAdmin": "2FA-beheer",
  "sessionManagement": "Sessiebeheer",
  "passwordPolicies": "Wachtwoordbeleid",
  "loginHistory": "Inloggeschiedenis",
  "suspiciousActivity": "Verdachte activiteit",
  "blockedIPs": "Geblokkeerde IP's",
  "securityAlerts": "Beveiligingsmeldingen",
  "encryptionSettings": "Versleutelingsinstellingen",
  "certManagement": "Certificaatbeheer",
  // Feature flags
  "featureControl": "Functiebeheer",
  "enableFeature": "Functie inschakelen",
  "disableFeature": "Functie uitschakelen",
  "rolloutPercentage": "Uitrolpercentage",
  "targetAudience": "Doelgroep",
  "betaUsers": "Bètagebruikers",
  "allUsers": "Alle gebruikers",
  // Jobs management
  "jobManagement": "Vacaturebeheer",
  "pendingApprovals": "Wachtende goedkeuringen",
  "approveJob": "Vacature goedkeuren",
  "rejectJob": "Vacature afwijzen",
  "jobAnalytics": "Vacatureanalyse",
  "topPerformingJobs": "Best presterende vacatures",
  "lowPerformingJobs": "Slecht presterende vacatures",
  "jobDistribution": "Vacatureverdeling",
  "companyVerification": "Bedrijfsverificatie",
  "verifyCompany": "Bedrijf verifiëren",
  "companyDetails": "Bedrijfsdetails",
  "companyStatus": "Bedrijfsstatus",
  // Revenue
  "revenueAnalytics": "Omzetanalyse",
  "totalRevenue": "Totale omzet",
  "monthlyRevenue": "Maandelijkse omzet",
  "yearlyRevenue": "Jaarlijkse omzet",
  "revenueGrowth": "Omzetgroei",
  "projectedRevenue": "Verwachte omzet",
  "topEarners": "Topverdieners",
  "commissionBreakdown": "Commissie-uitsplitsing",
  "payoutHistory": "Uitbetalingsgeschiedenis",
  "pendingPayouts": "In afwachting van uitbetaling",
  "invoiceManagement": "Factuurbeheer",
  // Support
  "supportManagement": "Supportbeheer",
  "openTickets": "Open tickets",
  "resolvedTickets": "Opgeloste tickets",
  "averageResponseTime": "Gem. reactietijd",
  "customerSatisfaction": "Klanttevredenheid",
  "assignTicket": "Ticket toewijzen",
  "closeTicket": "Ticket sluiten",
  "escalateTicket": "Ticket escaleren",
  "ticketPriority": "Ticketprioriteit",
  "ticketCategory": "Ticketcategorie",
  // Bulk operations
  "bulkOperations": "Bulkbewerkingen",
  "selectAll": "Alles selecteren",
  "deselectAll": "Alles deselecteren",
  "selectedCount": "{{count}} geselecteerd",
  "bulkDelete": "Bulkverwijderen",
  "bulkArchive": "Bulk archiveren",
  "bulkExport": "Bulk exporteren",
  "bulkEmail": "Bulk e-mail",
  "bulkAssign": "Bulk toewijzen",
  "confirmBulkAction": "Weet u zeker dat u deze actie wilt uitvoeren voor {{count}} items?",
  "bulkActionComplete": "Bulkactie voltooid",
  "bulkActionFailed": "Bulkactie mislukt",
};

// Process admin.json
const enFile = join(LOCALES, 'en', 'admin.json');
const nlFile = join(LOCALES, 'nl', 'admin.json');

const enData = JSON.parse(readFileSync(enFile, 'utf-8'));
const nlData = JSON.parse(readFileSync(nlFile, 'utf-8'));

let totalApplied = 0;

function apply(nlObj, enObj, trans) {
  for (const [key, val] of Object.entries(trans)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (!nlObj[key]) nlObj[key] = {};
      if (!enObj[key]) continue;
      apply(nlObj[key], enObj[key], val);
    } else if (typeof val === 'string' && enObj[key] && nlObj[key] === enObj[key]) {
      nlObj[key] = val;
      totalApplied++;
    }
  }
}

apply(nlData, enData, NL_ADMIN);
writeFileSync(nlFile, JSON.stringify(nlData, null, 2) + '\n');
console.log(`✅ Applied ${totalApplied} Dutch translations to admin.json`);
