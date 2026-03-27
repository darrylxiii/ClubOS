#!/usr/bin/env node
/**
 * Pass 3: Translate ALL remaining English values in the DE files.
 * This handles the massive common.json and other large files.
 * Uses a comprehensive word/phrase mapping approach.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const NAMESPACES = [
  'common', 'admin', 'analytics', 'candidates',
  'compliance', 'jobs', 'meetings', 'messages',
  'partner', 'settings'
];

// ============================================================
// WORD-LEVEL TRANSLATION MAP for sentence construction
// ============================================================
const wordMap = {
  // Common nouns
  "interview": "Vorstellungsgespraech",
  "interviews": "Vorstellungsgespraeche",
  "meeting": "Meeting",
  "meetings": "Meetings",
  "candidate": "Kandidat",
  "candidates": "Kandidaten",
  "application": "Bewerbung",
  "applications": "Bewerbungen",
  "company": "Unternehmen",
  "companies": "Unternehmen",
  "job": "Stelle",
  "jobs": "Stellen",
  "partner": "Partner",
  "partners": "Partner",
  "member": "Mitglied",
  "members": "Mitglieder",
  "user": "Benutzer",
  "users": "Benutzer",
  "profile": "Profil",
  "team": "Team",
  "role": "Rolle",
  "roles": "Stellen",
  "document": "Dokument",
  "documents": "Dokumente",
  "template": "Vorlage",
  "templates": "Vorlagen",
  "notification": "Benachrichtigung",
  "notifications": "Benachrichtigungen",
  "permission": "Berechtigung",
  "permissions": "Berechtigungen",
  "invitation": "Einladung",
  "invitations": "Einladungen",
  "message": "Nachricht",
  "assessment": "Bewertung",
  "assessments": "Bewertungen",
  "achievement": "Erfolg",
  "achievements": "Erfolge",
  "analytics": "Analysen",
  "insights": "Einblicke",
  "report": "Bericht",
  "reports": "Berichte",
  "dashboard": "Dashboard",
  "pipeline": "Pipeline",
  "workflow": "Workflow",
  "automation": "Automatisierung",
  "integrations": "Integrationen",
  "settings": "Einstellungen",
  "configuration": "Konfiguration",
  "security": "Sicherheit",
  "compliance": "Compliance",
  "performance": "Leistung",
  "feedback": "Feedback",
  "calendar": "Kalender",
  "schedule": "Zeitplan",
  "booking": "Buchung",
  "bookings": "Buchungen",
  "payment": "Zahlung",
  "payments": "Zahlungen",
  "invoice": "Rechnung",
  "invoices": "Rechnungen",
  "subscription": "Abonnement",
  "placement": "Vermittlung",
  "placements": "Vermittlungen",
  "commission": "Provision",
  "commissions": "Provisionen",
};

// ============================================================
// FULL SENTENCE TRANSLATIONS - comprehensive map
// ============================================================
const translations = new Map();
function t(en, de) { translations.set(en, de); }

// --- Common phrases that appear across namespaces ---
// Status/Labels
t("Trends", "Trends");
t("Google", "Google");
t("Apple", "Apple");
t("Compliance", "Compliance");
t("Version", "Version");
t("Interview", "Vorstellungsgespraech");
t("Junior", "Junior");
t("Mid-Level", "Mittleres Niveau");
t("Senior", "Senior");
t("Lead", "Teamleitung");
t("Benefits", "Vorteile");
t("Remote", "Remote");
t("Chat", "Chat");
t("Spam", "Spam");
t("Labels", "Labels");
t("Online", "Online");
t("Offline", "Offline");
t("Slack", "Slack");
t("Support", "Support");
t("FAQ", "FAQ");
t("optional", "optional");
t("Min", "Min");
t("Max", "Max");
t("Tech Corp", "Tech Corp");
t("(Optional)", "(Optional)");
t("Matching Impact", "Auswirkungen auf Matching");

// Very common UI text
t("Strong Growth", "Starkes Wachstum");
t("Suspended", "Gesperrt");
t("Banned", "Gebannt");
t("Stealth", "Verdeckt");
t("Public Access", "Oeffentlicher Zugriff");
t("Link Expires In", "Link laeuft ab in");
t("Creating...", "Wird erstellt...");
t("Data Management", "Datenverwaltung");

// Common.json specific - navigation items that are English brand names can stay
// but let's translate the ones that should be German
t("Club Home", "Club Home");
t("Quantum Meetings", "Quantum Meetings");
t("Achievements", "Achievements");
t("Inbox", "Posteingang");
t("Blog", "Blog");

// Now let's add ALL the remaining common translations we need.
// Read the missing report to get the full picture.

// =================================================================
// MASSIVE TRANSLATION BLOCK FOR ALL NAMESPACES
// =================================================================

// --- COMMON: The remaining ~785 keys from pass 1 that didn't get translated ---
// academy section
t("Explore our academy courses", "Entdecken Sie unsere Akademie-Kurse");
t("Master the skills that matter", "Meistern Sie die Faehigkeiten, die zaehlen");
t("No image", "Kein Bild");
t("Filters", "Filter");
t("Sort by", "Sortieren nach");
t("Share your thoughts about this course", "Teilen Sie Ihre Meinung zu diesem Kurs");
t("Your review (optional)", "Ihre Bewertung (optional)");
t("Would you recommend this course?", "Wuerden Sie diesen Kurs empfehlen?");
t("What will students learn in this module?", "Was werden die Teilnehmer in diesem Modul lernen?");
t("Module Title", "Modultitel");
t("Estimated Time (minutes)", "Geschaetzte Zeit (Minuten)");
t("Featured Course of the Week", "Empfohlener Kurs der Woche");
t("Jobs matching your skills", "Stellen passend zu Ihren Faehigkeiten");

// Big block of common translations for dashboard, settings, etc
t("Announcements", "Ankuendigungen");
t("Retry loading sidebar", "Sidebar-Laden wiederholen");
t("Retrying...", "Wird wiederholt...");
t("Tips", "Tipps");
t("Try adjusting your search or filters", "Versuchen Sie, Ihre Suche oder Filter anzupassen");
t("Try using different keywords", "Versuchen Sie andere Suchbegriffe");
t("Check your spelling", "Ueberpruefen Sie die Rechtschreibung");
t("Remove some filters to see more results", "Entfernen Sie einige Filter, um mehr Ergebnisse zu sehen");
t("Nothing here yet", "Noch nichts vorhanden");
t("Data will appear here once available", "Daten werden hier angezeigt, sobald verfuegbar");
t("No items found", "Keine Eintraege gefunden");
t("Get started by adding your first item", "Beginnen Sie mit Ihrem ersten Eintrag");
t("No matching items", "Keine passenden Eintraege");
t("Try changing your filters to see more results", "Aendern Sie Ihre Filter fuer mehr Ergebnisse");
t("pagination", "Seitennavigation");
t("GPT-5", "GPT-5");
t("OpenAI's flagship model", "Flaggschiff-Modell von OpenAI");
t("Medium", "Mittel");
t("breadcrumb", "Brotkruemelnavigation");
t("More", "Mehr");
t("Previous slide", "Vorherige Folie");
t("Next slide", "Naechste Folie");
t("Scroll left", "Nach links scrollen");
t("Scroll right", "Nach rechts scrollen");
t("logo", "Logo");
t("Dismiss", "Verwerfen");
t("Stay in the loop", "Bleiben Sie auf dem Laufenden");
t("Get notified about interview invites, job matches, and messages from recruiters.", "Erhalten Sie Benachrichtigungen ueber Vorstellungsgespraech-Einladungen, passende Stellen und Nachrichten von Recruitern.");
t("Maybe Later", "Vielleicht spaeter");
t("Application not found", "Bewerbung nicht gefunden");
t("Application Pipeline & Preparation", "Bewerbungspipeline & Vorbereitung");
t("Your Talent Strategist", "Ihr Talent-Stratege");
t("Click to view profile", "Klicken Sie, um das Profil anzuzeigen");
t("Resources:", "Ressourcen:");
t("About the Role", "Ueber die Stelle");
t("Requirements", "Anforderungen");
t("Next Step", "Naechster Schritt");
t("Application Insights", "Bewerbungs-Einblicke");
t("Admin Control Panel", "Admin-Kontrollzentrum");
t("Manage companies, users, and system configuration", "Unternehmen, Benutzer und Systemkonfiguration verwalten");
t("User management has moved to its own dedicated hub.", "Die Benutzerverwaltung befindet sich jetzt in einem eigenen Hub.");
t("Access the full merge dashboard to manually link candidates to user accounts", "Zugriff auf das Zusammenfuehrungs-Dashboard zum manuellen Verknuepfen von Kandidaten mit Benutzerkonten");
t("Review and approve new member applications from candidates and partners", "Neue Mitgliedsantraege von Kandidaten und Partnern pruefen und genehmigen");
t("Revenue", "Umsatz");
t("Merge", "Zusammenfuehren");
t("Member Requests", "Mitgliedsantraege");
t("System Health", "Systemstatus");

// More dashboard items
t("Quick actions", "Schnellaktionen");
t("No data available", "Keine Daten verfuegbar");
t("View All", "Alle anzeigen");
t("See all", "Alle anzeigen");
t("For you", "Fuer Sie");
t("Saved", "Gespeichert");
t("Sign in for matches", "Anmelden fuer Treffer");
t("No matches yet", "Noch keine Treffer");
t("No saved roles yet", "Noch keine gespeicherten Stellen");
t("No messages yet", "Noch keine Nachrichten");

// Common ADMIN translations
t("Manage Users & Roles", "Benutzer & Rollen verwalten");
t("Manage Companies", "Unternehmen verwalten");
t("Security Settings", "Sicherheitseinstellungen");
t("View System Logs", "Systemprotokolle anzeigen");
t("KPI Command Center", "KPI-Kommandozentrale");

// Generic toast messages
t("Failed to load", "Fehler beim Laden");
t("Successfully saved", "Erfolgreich gespeichert");
t("Successfully updated", "Erfolgreich aktualisiert");
t("Successfully created", "Erfolgreich erstellt");
t("Successfully deleted", "Erfolgreich geloescht");
t("No results", "Keine Ergebnisse");
t("Please try again", "Bitte versuchen Sie es erneut");
t("Something went wrong", "Etwas ist schiefgegangen");
t("Operation completed", "Vorgang abgeschlossen");

// --- MEETINGS ---
t("Click the \"Try Again\" button below", "Klicken Sie unten auf die Schaltflaeche \"Erneut versuchen\"");

// --- SETTINGS ---
t("Currently sharing <strong>{{count}} of {{total}}</strong> fields.", "Derzeit werden <strong>{{count}} von {{total}}</strong> Feldern geteilt.");
t("Blocked Companies:", "Gesperrte Unternehmen:");

// --- PARTNER: Many structured dialog translations ---
// Partner funnel
t("Quantum Club", "Quantum Club");
t("Partnership Applications Temporarily Paused", "Partnerschaftsantraege voruebergehend pausiert");
t("Share your brief", "Teilen Sie Ihr Briefing");
t("Speak with a strategist", "Sprechen Sie mit einem Strategen");
t("Review your shortlist", "Ueberpruefen Sie Ihre Shortlist");
t("Describe the role. We handle the rest.", "Beschreiben Sie die Stelle. Wir kuemmern uns um den Rest.");
t("No fees until you hire. No long-term contracts.", "Keine Gebuehren bis zur Einstellung. Keine langfristigen Vertraege.");

// Partner welcome
t("What's Next", "Was kommt als Naechstes");
t("Your Organization", "Ihre Organisation");
t("Your Dedicated Strategist", "Ihr persoenlicher Stratege");
t("Explore Open Roles", "Offene Stellen entdecken");
t("Browse exclusive opportunities curated for your network", "Durchsuchen Sie exklusive Moeglichkeiten, die fuer Ihr Netzwerk kuratiert wurden");
t("Submit Candidates", "Kandidaten einreichen");
t("Introduce top talent through our streamlined process", "Stellen Sie Top-Talente ueber unseren optimierten Prozess vor");
t("Schedule Your Onboarding Call", "Planen Sie Ihr Onboarding-Gespraech");

// Partner addCandidate
t("Duplicate Email Detected", "Doppelte E-Mail erkannt");
t("A candidate with this email already exists. Please search for the existing candidate or use a different email.", "Ein Kandidat mit dieser E-Mail existiert bereits. Bitte suchen Sie nach dem bestehenden Kandidaten oder verwenden Sie eine andere E-Mail.");
t("Database Error", "Datenbankfehler");
t("Unable to link candidate data. Please try again or contact support if the issue persists.", "Kandidatendaten konnten nicht verknuepft werden. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.");
t("Permission Denied", "Zugriff verweigert");
t("You don't have permission to add candidates. Please contact an administrator.", "Sie haben keine Berechtigung, Kandidaten hinzuzufuegen. Bitte kontaktieren Sie einen Administrator.");
t("Duplicate Candidate", "Doppelter Kandidat");
t("This candidate already exists in the system. Please check existing applications.", "Dieser Kandidat existiert bereits im System. Bitte pruefen Sie bestehende Bewerbungen.");
t("John Doe", "Max Mustermann");
t("Senior Developer", "Senior-Entwickler");
t("Why this candidate? Source? Special considerations?", "Warum dieser Kandidat? Quelle? Besondere Aspekte?");

// Partner dialog titles & labels
t("Add Team Member", "Teammitglied hinzufuegen");
t("Failed to load team members", "Teammitglieder konnten nicht geladen werden");
t("Failed to load TQC team members", "TQC-Teammitglieder konnten nicht geladen werden");
t("Please select a team member", "Bitte waehlen Sie ein Teammitglied aus");
t("Please select a user", "Bitte waehlen Sie einen Benutzer aus");
t("Please provide a reason for this assignment", "Bitte geben Sie einen Grund fuer diese Zuweisung an");
t("Team member added successfully", "Teammitglied erfolgreich hinzugefuegt");
t("Team Member", "Teammitglied");
t("Permissions", "Berechtigungen");
t("Select TQC Team Member", "TQC-Teammitglied auswaehlen");
t("Assignment Reason", "Zuweisungsgrund");
t("Select a team member", "Teammitglied auswaehlen");
t("Search TQC team by name or email...", "TQC-Team nach Name oder E-Mail suchen...");
t("Why is this person being assigned to this job?", "Warum wird diese Person dieser Stelle zugewiesen?");
t("Strategist", "Stratege");
t("No matching team members found", "Keine passenden Teammitglieder gefunden");
t("External users receive limited, time-boxed access with audit logging", "Externe Benutzer erhalten begrenzten, zeitlich befristeten Zugriff mit Audit-Protokollierung");
t("Assign a team member or external user to this job with specific role and permissions.", "Weisen Sie dieser Stelle ein Teammitglied oder einen externen Benutzer mit bestimmter Rolle und Berechtigungen zu.");
t("Hiring Manager", "Personalverantwortlicher");
t("Founder/Executive Reviewer", "Gruender/Geschaeftsfuehrer-Pruefer");
t("Technical Interviewer", "Technischer Interviewer");
t("Behavioral Interviewer", "Verhaltensbasierter Interviewer");
t("Panel Member", "Panel-Mitglied");
t("Interview Coordinator", "Interview-Koordinator");
t("Observer", "Beobachter");

// Pipeline/Stage related
t("Add New Pipeline Stage", "Neue Pipeline-Phase hinzufuegen");
t("Configure every detail for a luxury, tailored candidate experience", "Konfigurieren Sie jedes Detail fuer ein massgeschneidertes Kandidatenerlebnis");
t("Candidates can choose between online or in-person. Configure both options above or provide flexible instructions.", "Kandidaten koennen zwischen online und persoenlich waehlen. Konfigurieren Sie beide Optionen oder geben Sie flexible Anweisungen.");
t("This helps evaluators provide consistent, structured feedback", "Dies hilft Bewertern, konsistentes, strukturiertes Feedback zu geben");
t("Quick-start with pre-configured stage templates", "Schnellstart mit vorkonfigurierten Phasenvorlagen");
t("No team members available", "Keine Teammitglieder verfuegbar");
t("Stage configuration saved and audit logged", "Phasenkonfiguration gespeichert und protokolliert");

// Add to job dialog
t("Add to Job Pipeline", "Zur Stellen-Pipeline hinzufuegen");
t("Candidate added but interaction log failed", "Kandidat hinzugefuegt, aber Interaktionsprotokoll fehlgeschlagen");
t("Candidate added but audit log failed", "Kandidat hinzugefuegt, aber Audit-Protokoll fehlgeschlagen");
t("Failed to add candidate to job", "Kandidat konnte nicht zur Stelle hinzugefuegt werden");
t("Starting Stage", "Startphase");
t("Notes (optional)", "Notizen (optional)");
t("Search jobs by title or company...", "Stellen nach Titel oder Unternehmen suchen...");
t("Why are you adding this candidate?", "Warum fuegen Sie diesen Kandidaten hinzu?");
t("Already in pipeline", "Bereits in der Pipeline");
t("No active jobs found.", "Keine aktiven Stellen gefunden.");

// Admin board tools
t("Global Analytics", "Globale Analysen");
t("Cross-company insights and platform-wide metrics", "Unternehmensuebergreifende Einblicke und plattformweite Kennzahlen");
t("Talent Pool Access Granted", "Zugriff auf Talent Pool gewaehrt");
t("Full access to 12,847 candidate profiles", "Vollzugriff auf 12.847 Kandidatenprofile");
t("Company Management", "Unternehmensverwaltung");
t("Manage all partner companies and their access levels", "Alle Partnerunternehmen und deren Zugriffsebenen verwalten");
t("Bulk Operations", "Massenoperationen");
t("Perform bulk actions across multiple jobs and candidates", "Massenaktionen ueber mehrere Stellen und Kandidaten durchfuehren");
t("Platform Settings", "Plattformeinstellungen");
t("Configure global platform rules, AI models, and workflows", "Globale Plattformregeln, KI-Modelle und Workflows konfigurieren");
t("AI Configuration", "KI-Konfiguration");
t("Adjust matching algorithms, scoring weights, and ML models", "Matching-Algorithmen, Bewertungsgewichtungen und ML-Modelle anpassen");
t("System Health: Optimal", "Systemstatus: Optimal");
t("All services running normally. 99.97% uptime", "Alle Dienste laufen normal. 99,97% Verfuegbarkeit");
t("Global Data Export", "Globaler Datenexport");
t("Exporting anonymized platform analytics...", "Anonymisierte Plattformanalysen werden exportiert...");
t("Access Control", "Zugriffskontrolle");
t("Manage roles, permissions, and security policies", "Rollen, Berechtigungen und Sicherheitsrichtlinien verwalten");
t("QUANTUM CLUB ADMIN", "QUANTUM CLUB ADMIN");
t("Platform-wide management & analytics", "Plattformweite Verwaltung & Analysen");
t("View & manage all partners", "Alle Partner anzeigen & verwalten");
t("Cross-job actions at scale", "Stellenuebergreifende Aktionen");
t("AI Model Config", "KI-Modell-Konfiguration");
t("Tune matching algorithms", "Matching-Algorithmen optimieren");
t("Platform status & uptime", "Plattformstatus & Verfuegbarkeit");
t("Roles & permissions", "Rollen & Berechtigungen");
t("Global configurations", "Globale Konfigurationen");
t("Export Global Data", "Globale Daten exportieren");
t("Platform-wide analytics", "Plattformweite Analysen");
t("Refresh All Metrics", "Alle Kennzahlen aktualisieren");
t("Recalculate everything", "Alles neu berechnen");

// Job-related partner strings
t("Email Dump", "E-Mail-Export");
t("Metrics updated successfully", "Kennzahlen erfolgreich aktualisiert");
t("AI Matching Engine", "KI-Matching-Engine");
t("Analyzing global talent pool for perfect matches...", "Globaler Talent Pool wird auf perfekte Treffer analysiert...");
t("Found 23 high-potential candidates", "23 vielversprechende Kandidaten gefunden");
t("Advanced AI scoring applied. Review in pipeline.", "Erweiterte KI-Bewertung angewendet. In der Pipeline pruefen.");
t("Bulk Import", "Massenimport");
t("Upload CSV or connect ATS to import candidates", "CSV hochladen oder ATS verbinden, um Kandidaten zu importieren");
t("Pipeline Health: 94%", "Pipeline-Gesundheit: 94%");
t("Excellent flow. Avg time-to-hire: 12 days", "Ausgezeichneter Fluss. Durchschnittliche Time-to-Hire: 12 Tage");
t("Exporting pipeline data", "Pipeline-Daten werden exportiert");
t("Full analytics export with GDPR compliance", "Vollstaendiger Analyseexport mit DSGVO-Konformitaet");
t("Recalculating metrics...", "Kennzahlen werden neu berechnet...");
t("Using latest AI models and scoring algorithms", "Neueste KI-Modelle und Bewertungsalgorithmen werden verwendet");
t("ADMIN JOB TOOLS", "ADMIN-STELLEN-TOOLS");
t("Job-level operations", "Operationen auf Stellenebene");

// Advanced filters
t("Advanced Filters", "Erweiterte Filter");
t("Created Date Range", "Erstellungszeitraum");
t("From date", "Von Datum");
t("To date", "Bis Datum");

// Applications pipeline
t("No active jobs", "Keine aktiven Stellen");
t("Applicant Pipeline", "Bewerberpipeline");
t("No applications yet", "Noch keine Bewerbungen");
t("Failed to load applicants", "Bewerber konnten nicht geladen werden");
t("Publish a job to start receiving applications", "Veroeffentlichen Sie eine Stelle, um Bewerbungen zu erhalten");
t("Applications will appear here once candidates start applying", "Bewerbungen erscheinen hier, sobald sich Kandidaten bewerben");
t("No candidates in this stage", "Keine Kandidaten in dieser Phase");

// Applications analytics
t("Pipeline Distribution", "Pipeline-Verteilung");
t("Avg. Time to Hire", "Durchschnittliche Time-to-Hire");
t("Active Pipelines", "Aktive Pipelines");
t("Stalled Pipelines", "Stockende Pipelines");
t("Needs improvement", "Verbesserungsbedarf");
t("In progress", "In Bearbeitung");
t("Need attention", "Erfordert Aufmerksamkeit");

// Application filters
t("All statuses", "Alle Status");
t("All jobs", "Alle Stellen");
t("All companies", "Alle Unternehmen");
t("All sources", "Alle Quellen");
t("All urgency", "Alle Dringlichkeiten");
t("All Statuses", "Alle Status");
t("Hired", "Eingestellt");
t("Withdrawn", "Zurueckgezogen");
t("All Sources", "Alle Quellen");
t("Referral", "Empfehlung");
t("Direct", "Direkt");
t("Agency", "Agentur");
t("Recent Activity", "Letzte Aktivitaet");
t("No Activity", "Keine Aktivitaet");
t("Pending Signup", "Registrierung ausstehend");
t("No applications found matching your filters", "Keine Bewerbungen gefunden, die Ihren Filtern entsprechen");
t("Updated today", "Heute aktualisiert");
t("Complete more hiring cycles to unlock benchmark comparisons", "Schliessen Sie mehr Einstellungszyklen ab, um Benchmark-Vergleiche freizuschalten");

// Calendar interview linker
t("TQC", "TQC");
t("Automatically detected interviews from your calendar", "Automatisch erkannte Vorstellungsgespraeche aus Ihrem Kalender");
t("Select a calendar event to link as an interview", "Waehlen Sie ein Kalenderereignis, das als Vorstellungsgespraech verknuepft werden soll");
t("Interviews that have been confirmed and linked to this job", "Vorstellungsgespraeche, die bestaetigt und mit dieser Stelle verknuepft wurden");
t("Browse your calendar events or view automatically detected interviews", "Durchsuchen Sie Ihre Kalenderereignisse oder sehen Sie automatisch erkannte Vorstellungsgespraeche");

// Candidate action dialog
t("No next stage available", "Keine naechste Phase verfuegbar");
t("Please provide a rejection reason", "Bitte geben Sie einen Ablehnungsgrund an");
t("Failed to process action", "Aktion konnte nicht verarbeitet werden");
t("Rejection Reason *", "Ablehnungsgrund *");
t("Select a reason", "Grund auswaehlen");
t("Club Check - Advance Candidate", "Club-Pruefung - Kandidat weiterleiten");
t("This candidate has passed Club vetting standards", "Dieser Kandidat hat die Club-Pruefstandards bestanden");
t("Not a fit", "Nicht geeignet");
t("Salary expectations", "Gehaltsvorstellungen");
t("Seniority mismatch", "Senioriaetsdiskrepanz");
t("Skills gap", "Kompetenzluecke");
t("Cultural fit", "Kulturelle Passung");
t("Other", "Sonstiges");
t("Club Check completed successfully", "Club-Pruefung erfolgreich abgeschlossen");
t("Feedback recorded and candidate notified", "Feedback erfasst und Kandidat benachrichtigt");

// Candidate analytics in partner
t("Failed to load analytics", "Analysen konnten nicht geladen werden");
t("High Interest", "Hohes Interesse");
t("Excellent Fit", "Ausgezeichnete Passung");
t("Highly Engaged", "Sehr engagiert");
t("Profile Views", "Profilaufrufe");
t("Unique Viewers", "Einzigartige Betrachter");
t("Engagement Score", "Engagement-Score");
t("Fit Score", "Eignungs-Score");
t("No profile views yet", "Noch keine Profilaufrufe");
t("This candidate has received significant attention from the team", "Dieser Kandidat hat erhebliche Aufmerksamkeit vom Team erhalten");
t("AI analysis shows strong alignment with role requirements", "KI-Analyse zeigt starke Uebereinstimmung mit den Stellenanforderungen");
t("Candidate shows strong engagement with the application process", "Kandidat zeigt starkes Engagement im Bewerbungsprozess");
t("No insights available yet. Profile views and interactions will generate AI insights.", "Noch keine Einblicke verfuegbar. Profilaufrufe und Interaktionen generieren KI-Einblicke.");
t("Team members who recently viewed this profile", "Teammitglieder, die dieses Profil kuerzlich angesehen haben");

// Candidate decision dashboard
t("Move to Offer Stage", "In Angebotsphase verschieben");
t("No application selected", "Keine Bewerbung ausgewaehlt");
t("Candidate moved to Offer stage", "Kandidat in Angebotsphase verschoben");
t("Failed to move candidate to offer stage", "Kandidat konnte nicht in Angebotsphase verschoben werden");
t("Failed to log verdict", "Ergebnis konnte nicht protokolliert werden");
t("Opening interview scheduler...", "Vorstellungsgespraech-Planer wird geoeffnet...");
t("Add notes about your decision...", "Notizen zu Ihrer Entscheidung hinzufuegen...");
t("Overall", "Gesamt");
t("Years Exp", "Jahre Erfahrung");
t("Notice Period", "Kuendigungsfrist");
t("Preferred Location", "Bevorzugter Standort");
t("This action will trigger the offer workflow and notify relevant stakeholders.", "Diese Aktion loest den Angebots-Workflow aus und benachrichtigt relevante Beteiligte.");

// Candidate detail dialog
t("Candidate Info", "Kandidaten-Info");
t("Failed to add comment", "Kommentar konnte nicht hinzugefuegt werden");
t("Comment added", "Kommentar hinzugefuegt");
t("Failed to submit scorecard", "Bewertungsbogen konnte nicht eingereicht werden");
t("Scorecard submitted", "Bewertungsbogen eingereicht");
t("Failed to move candidate", "Kandidat konnte nicht verschoben werden");
t("Candidate moved", "Kandidat verschoben");
t("Move to stage...", "In Phase verschieben...");
t("What are their strengths?", "Was sind die Staerken?");
t("Any concerns?", "Irgendwelche Bedenken?");
t("Additional notes...", "Zusaetzliche Notizen...");
t("Scorecard", "Bewertungsbogen");
t("Activity timeline coming soon", "Aktivitaetsverlauf kommt bald");
t("Pipeline Stage", "Pipeline-Phase");
t("Strong Yes", "Starkes Ja");
t("Strong No", "Starkes Nein");

// Partner billing
t("Billing & Invoices", "Abrechnung & Rechnungen");
t("Manage your billing details and view invoices", "Verwalten Sie Ihre Rechnungsdaten und sehen Sie Rechnungen ein");
t("Billing Details", "Rechnungsdetails");
t("Billing Information", "Rechnungsinformationen");
t("Update your company billing details for invoicing", "Aktualisieren Sie die Rechnungsdaten Ihres Unternehmens");
t("Your Invoices", "Ihre Rechnungen");
t("View and download your placement fee invoices", "Vermittlungsgebuehr-Rechnungen anzeigen und herunterladen");

// Partner SLA
t("Response Time", "Antwortzeit");
t("Time to first response", "Zeit bis zur ersten Antwort");
t("Shortlist Delivery", "Shortlist-Lieferung");
t("Candidate shortlist delivery", "Kandidaten-Shortlist-Lieferung");
t("Interview Scheduling", "Vorstellungsgespraech-Planung");
t("Interview setup time", "Vorstellungsgespraech-Vorbereitungszeit");
t("Replacement Guarantee", "Ersatzgarantie");
t("Candidate replacement window", "Kandidaten-Ersatzzeitraum");
t("Target", "Ziel");
t("Below target compliance. Review processes to improve performance.", "Unter Ziel-Compliance. Pruefen Sie Prozesse zur Leistungsverbesserung.");
t("Recent SLA Performance", "Aktuelle SLA-Leistung");
t("Last 30 days of SLA tracking", "Letzte 30 Tage SLA-Verfolgung");
t("No SLA metrics recorded yet", "Noch keine SLA-Kennzahlen erfasst");

// Partner audit log
t("Search by user or action...", "Nach Benutzer oder Aktion suchen...");
t("All Actions", "Alle Aktionen");
t("Candidate Moved", "Kandidat verschoben");
t("Job Created", "Stelle erstellt");
t("Team Invited", "Team eingeladen");
t("Application Rejected", "Bewerbung abgelehnt");
t("No audit log entries found", "Keine Audit-Protokolleintraege gefunden");

// Live Interview
t("Interview Sentinel", "Interview Sentinel");
t("Real-time Fact Checking & Copilot", "Echtzeit-Faktencheck & Copilot");
t("Microphone access denied.", "Mikrofonzugriff verweigert.");
t("Browser does not support Speech Recognition.", "Browser unterstuetzt keine Spracherkennung.");
t("Sentinel is listening...", "Sentinel hoert zu...");
t("Live Transcript", "Live-Transkript");
t("Real-time speech-to-text stream", "Echtzeit-Spracherkennungs-Stream");
t("Waiting for speech...", "Warten auf Sprache...");
t("Sentinel HUD", "Sentinel HUD");
t("Live AI Insights", "Live-KI-Einblicke");
t("No alerts yet. System is monitoring...", "Noch keine Warnungen. System ueberwacht...");

// Recent invoices
t("Recent Invoices", "Aktuelle Rechnungen");
t("View and download your invoices", "Rechnungen anzeigen und herunterladen");
t("No invoices found", "Keine Rechnungen gefunden");

// Various partner strings
t("Company Profile", "Unternehmensprofil");
t("Company Name", "Firmenname");
t("Tagline", "Slogan");
t("Website", "Website");
t("LinkedIn URL", "LinkedIn URL");
t("Headquarters Location", "Hauptsitz");
t("Company Size", "Unternehmensgroesse");
t("Manage your company information and branding", "Verwalten Sie Ihre Unternehmensinformationen und Marke");
t("Company Wall", "Unternehmens-Pinnwand");
t("Latest news, updates, and announcements", "Neueste Nachrichten, Updates und Ankuendigungen");

// Team management
t("Team Members", "Teammitglieder");
t("No team members yet", "Noch keine Teammitglieder");
t("Team member removed", "Teammitglied entfernt");
t("Failed to remove team member", "Teammitglied konnte nicht entfernt werden");
t("Invite team members to collaborate on job postings", "Laden Sie Teammitglieder ein, an Stellenausschreibungen zusammenzuarbeiten");
t("Primary", "Primaer");
t("Remove from team", "Vom Team entfernen");
t("Team Member Options", "Teammitglied-Optionen");

// Job analytics
t("Stage Conversion Rates", "Phasen-Konversionsraten");
t("No analytics data available", "Keine Analysedaten verfuegbar");
t("Hires", "Einstellungen");
t("Avg Time to Hire", "Durchschnittliche Time-to-Hire");
t("Fastest Hire", "Schnellste Einstellung");
t("Average", "Durchschnitt");
t("Slowest Hire", "Langsamste Einstellung");
t("Avg Fit Score", "Durchschnittlicher Eignungs-Score");
t("Engagement Rate", "Engagement-Rate");
t("Interview Pass", "Vorstellungsgespraech bestanden");
t("Offer Acceptance", "Angebotsannahme");
t("Club Sync", "Club Sync");
t("Direct Apply", "Direktbewerbung");
t("Referrals", "Empfehlungen");
t("Where candidates are coming from", "Woher Kandidaten kommen");

// Jobs management
t("Job Postings", "Stellenausschreibungen");
t("No jobs yet", "Noch keine Stellen");
t("Job archived", "Stelle archiviert");
t("Job deleted", "Stelle geloescht");
t("Create your first job posting to start receiving applications", "Erstellen Sie Ihre erste Stellenausschreibung, um Bewerbungen zu erhalten");

// QUIN Insights
t("QUIN Insights", "QUIN-Einblicke");
t("No insights available yet", "Noch keine Einblicke verfuegbar");
t("Add more jobs to generate AI predictions", "Fuegen Sie mehr Stellen hinzu, um KI-Vorhersagen zu generieren");
t("QUIN Insights temporarily unavailable", "QUIN-Einblicke voruebergehend nicht verfuegbar");
t("Hiring Forecast", "Einstellungsprognose");
t("Strategic Recommendations", "Strategische Empfehlungen");

// Keyboard shortcuts
t("Keyboard Shortcuts", "Tastaturkuerzel");
t("Navigate and manage jobs efficiently with these shortcuts", "Navigieren und verwalten Sie Stellen effizient mit diesen Kuerzeln");

// Open jobs / Fill rate
t("Open Jobs", "Offene Stellen");
t("Avg Days Open", "Durchschn. Tage offen");
t("Fill Rate", "Besetzungsrate");
t("Active Pipeline", "Aktive Pipeline");

// More partner strings
t("Funnel Analytics", "Funnel-Analysen");
t("Real-time partner request tracking and insights", "Echtzeit-Verfolgung und Einblicke in Partneranfragen");
t("Total Views", "Gesamtaufrufe");
t("Unique Sessions", "Einzigartige Sitzungen");
t("Submissions", "Einreichungen");
t("Drop-off Rate", "Abbruchrate");
t("Funnel Step Progression", "Funnel-Schritt-Fortschritt");
t("Request Status Distribution", "Verteilung des Anfragestatus");
t("Partner Requests", "Partneranfragen");
t("In Review", "In Pruefung");
t("No company associated with your account", "Kein Unternehmen mit Ihrem Konto verknuepft");
t("Benchmarks", "Benchmarks");

// Talent Pool Opportunity
t("Talent Pool Opportunity", "Talent-Pool-Moeglichkeit");
t("Search candidates...", "Kandidaten suchen...");
t("All Reasons", "Alle Gruende");
t("Candidate Relationships", "Kandidatenbeziehungen");
t("Monitor and nurture your candidate connections", "Ueberwachen und pflegen Sie Ihre Kandidatenbeziehungen");
t("Click the camera icon to upload", "Klicken Sie auf das Kamera-Symbol zum Hochladen");
t("We can import your profile photo from LinkedIn automatically.", "Wir koennen Ihr Profilfoto automatisch von LinkedIn importieren.");

// Pipeline customizer
t("Premium Pipeline Editor", "Premium-Pipeline-Editor");
t("Stage removed", "Phase entfernt");
t("Select a reviewer first.", "Bitte waehlen Sie zuerst einen Pruefer aus.");
t("Reviewer assigned", "Pruefer zugewiesen");
t("Failed to assign reviewer", "Pruefer konnte nicht zugewiesen werden");
t("Failed to remove reviewer", "Pruefer konnte nicht entfernt werden");
t("Reviewer removed", "Pruefer entfernt");
t("Pipeline saved", "Pipeline gespeichert");
t("Stage Owner", "Phasen-Verantwortlicher");
t("Describe what happens in this stage...", "Beschreiben Sie, was in dieser Phase passiert...");
t("Review Gate Assignments", "Pruefungs-Gate-Zuweisungen");
t("Only admin and strategist roles can change reviewer assignments.", "Nur Administrator- und Strategist-Rollen koennen Pruefer-Zuweisungen aendern.");
t("Customize your exclusive hiring pipeline stages", "Passen Sie Ihre exklusiven Einstellungspipeline-Phasen an");
t("In-Person", "Persoenlich");

// Various small translations
t("Your Dedicated Concierge", "Ihr persoenlicher Concierge");
t("Direct Contact", "Direkter Kontakt");
t("Total Candidates", "Kandidaten gesamt");
t("Pipeline Health", "Pipeline-Gesundheit");
t("Conversion Rates", "Konversionsraten");
t("Current distribution across pipeline stages", "Aktuelle Verteilung ueber Pipeline-Phasen");

// Job card
t("View original posting", "Originale Stellenausschreibung anzeigen");
t("This job is only visible to selected users", "Diese Stelle ist nur fuer ausgewaehlte Benutzer sichtbar");
t("Hiring Progress", "Einstellungsfortschritt");
t("Conversion", "Konversion");
t("Last Activity", "Letzte Aktivitaet");
t("Confidential", "Vertraulich");

// Partner interview hub
t("No upcoming interviews scheduled", "Keine anstehenden Vorstellungsgespraeche geplant");
t("No completed interviews yet", "Noch keine abgeschlossenen Vorstellungsgespraeche");
t("No candidates ready for decision", "Keine Kandidaten bereit fuer Entscheidung");
t("Interviews need scorecards before decisions", "Vorstellungsgespraeche benoetigen Bewertungsboegen vor Entscheidungen");
t("Track interviews, review insights, and make hiring decisions", "Vorstellungsgespraeche verfolgen, Einblicke pruefen und Einstellungsentscheidungen treffen");
t("All evaluators have submitted scorecards", "Alle Bewerter haben Bewertungsboegen eingereicht");

// Position fill countdown
t("All positions filled! Great work.", "Alle Positionen besetzt! Gute Arbeit.");

// Interview feedback dialog
t("Interview Feedback", "Vorstellungsgespraechs-Feedback");
t("Please select a recommendation", "Bitte waehlen Sie eine Empfehlung aus");
t("Feedback submitted successfully", "Feedback erfolgreich eingereicht");
t("Key Strengths", "Hauptstaerken");
t("Concerns / Areas for Improvement", "Bedenken / Verbesserungsbereiche");
t("Key Observations", "Wichtige Beobachtungen");
t("Detailed Notes", "Detaillierte Notizen");
t("E.g., Strong problem-solving skills", "Z.B. Starke Problemloesungsfaehigkeiten");
t("E.g., Limited experience with X technology", "Z.B. Begrenzte Erfahrung mit X-Technologie");
t("E.g., Handled pressure well during technical challenge", "Z.B. Ging gut mit Druck waehrend technischer Herausforderung um");
t("Provide comprehensive notes about the interview...", "Geben Sie umfassende Notizen zum Vorstellungsgespraech an...");
t("Strong Yes - Exceptional candidate", "Starkes Ja - Aussergewoehnlicher Kandidat");
t("Yes - Good fit, recommend to proceed", "Ja - Gute Passung, Fortschritt empfohlen");
t("Maybe - Has potential but concerns exist", "Vielleicht - Hat Potenzial, aber Bedenken bestehen");
t("No - Not the right fit", "Nein - Nicht die richtige Passung");
t("Strong No - Definitely not suitable", "Starkes Nein - Definitiv nicht geeignet");

// Internal review panel
t("Select at least one candidate.", "Waehlen Sie mindestens einen Kandidaten aus.");
t("Rejection note is required.", "Ablehnungsnotiz ist erforderlich.");
t("Undo is not yet available for this action.", "Rueckgaengig ist fuer diese Aktion noch nicht verfuegbar.");
t("Search by name, title, or skill...", "Nach Name, Titel oder Faehigkeit suchen...");
t("Rejection reason...", "Ablehnungsgrund...");
t("All clear", "Alles erledigt");
t("No candidates awaiting internal review.", "Keine Kandidaten warten auf interne Pruefung.");
t("Provide a reason for rejecting this candidate from the pipeline.", "Geben Sie einen Grund fuer die Ablehnung dieses Kandidaten aus der Pipeline an.");

// Various partner edit job
t("Edit Job", "Stelle bearbeiten");
t("Failed to load companies", "Unternehmen konnten nicht geladen werden");
t("Job updated successfully", "Stelle erfolgreich aktualisiert");
t("Failed to update job", "Stelle konnte nicht aktualisiert werden");
t("Company *", "Unternehmen *");
t("Job Title *", "Stellentitel *");
t("Employment Type", "Beschaeftigungsart");
t("Min Salary", "Mindestgehalt");
t("Max Salary", "Maximalgehalt");
t("Add Supporting Documents", "Unterstuetzende Dokumente hinzufuegen");
t("Nice-to-Have Tools", "Wuenschenswerte Tools");
t("Select a company", "Unternehmen auswaehlen");
t("Full-time", "Vollzeit");
t("Part-time", "Teilzeit");
t("Contract", "Vertrag");
t("Select tools candidates must be proficient with", "Waehlen Sie Tools aus, mit denen Kandidaten vertraut sein muessen");
t("Bonus skills that would be beneficial", "Zusaetzliche Faehigkeiten, die vorteilhaft waeren");
t("Internship", "Praktikum");
t("Job Details", "Stellendetails");
t("You have unsaved changes", "Sie haben nicht gespeicherte Aenderungen");
t("Update the core information about this position", "Aktualisieren Sie die Kerninformationen zu dieser Position");

// Company posts
t("Company Posts", "Unternehmens-Beitraege");
t("Post updated successfully", "Beitrag erfolgreich aktualisiert");
t("Post created successfully", "Beitrag erfolgreich erstellt");
t("Failed to save post", "Beitrag konnte nicht gespeichert werden");
t("Post deleted successfully", "Beitrag erfolgreich geloescht");
t("Failed to delete post", "Beitrag konnte nicht geloescht werden");
t("Content", "Inhalt");
t("Post Type", "Beitragstyp");
t("Tags (comma separated)", "Tags (kommagetrennt)");
t("Featured", "Hervorgehoben");
t("Manage your company news and updates", "Verwalten Sie Ihre Unternehmensnachrichten und -updates");
t("No posts yet. Create your first post to get started.", "Noch keine Beitraege. Erstellen Sie Ihren ersten Beitrag.");
t("Share news, milestones, events, and updates with your audience", "Teilen Sie Nachrichten, Meilensteine, Veranstaltungen und Updates mit Ihrer Zielgruppe");
t("News", "Nachrichten");
t("Milestone", "Meilenstein");
t("Event", "Veranstaltung");
t("No posts yet. Be the first to share something!", "Noch keine Beitraege. Seien Sie die Ersten, die etwas teilen!");

// Branding
t("Brand Colors", "Markenfarben");
t("Typography", "Typografie");
t("Logos & Assets", "Logos & Assets");
t("Brand Preview", "Markenvorschau");
t("Branding updated successfully", "Branding erfolgreich aktualisiert");
t("Failed to update branding", "Branding konnte nicht aktualisiert werden");
t("Primary Color", "Primaerfarbe");
t("Secondary Color", "Sekundaerfarbe");
t("Accent Color", "Akzentfarbe");
t("Heading Font", "Ueberschrift-Schriftart");
t("Body Font", "Text-Schriftart");
t("Customize your company's visual identity", "Passen Sie die visuelle Identitaet Ihres Unternehmens an");

// Domain settings
t("Please enter a valid domain (e.g., example.com)", "Bitte geben Sie eine gueltige Domain ein (z.B. example.com)");
t("This domain is already configured", "Diese Domain ist bereits konfiguriert");
t("Domain request submitted for admin approval", "Domain-Anfrage zur Admin-Genehmigung eingereicht");
t("Failed to submit domain request", "Domain-Anfrage konnte nicht eingereicht werden");
t("Request New Domain", "Neue Domain anfordern");
t("No domains configured yet", "Noch keine Domains konfiguriert");
t("Contact your administrator to set up authorized domains", "Kontaktieren Sie Ihren Administrator, um autorisierte Domains einzurichten");
t("Domain requests require admin approval before they become active", "Domain-Anfragen erfordern Admin-Genehmigung, bevor sie aktiv werden");
t("Team members can only be invited from these email domains", "Teammitglieder koennen nur von diesen E-Mail-Domains eingeladen werden");
t("Loading domain settings...", "Domain-Einstellungen werden geladen...");

// Partner jobs home
t("No jobs found", "Keine Stellen gefunden");
t("Your premium hiring accelerator.", "Ihr Premium-Einstellungsbeschleuniger.");
t("Get vetted candidates in days, not weeks", "Erhalten Sie geprueft Kandidaten in Tagen, nicht Wochen");
t("Pre-Vetted Talent", "Vorgepruefte Talente");
t("Every candidate is Club-verified for quality", "Jeder Kandidat ist Club-verifiziert fuer Qualitaet");
t("Dedicated Support", "Persoenlicher Support");
t("Personal recruiter assistance included", "Persoenliche Recruiter-Unterstuetzung inklusive");
t("Live updates enabled", "Live-Updates aktiviert");
t("Candidates can now see and apply to this job", "Kandidaten koennen diese Stelle jetzt sehen und sich bewerben");

// Job Audit Log
t("Job Audit Log", "Stellen-Audit-Protokoll");
t("Override Duplicate", "Duplikat ueberschreiben");
t("Comprehensive tracking of all job interactions and modifications", "Umfassende Verfolgung aller Stelleninteraktionen und -aenderungen");

// Saved filter presets
t("Save Filter Preset", "Filter-Voreinstellung speichern");
t("Please enter a name for your preset", "Bitte geben Sie einen Namen fuer Ihre Voreinstellung ein");
t("No saved presets", "Keine gespeicherten Voreinstellungen");
t("Save your current filters for quick access", "Speichern Sie Ihre aktuellen Filter fuer schnellen Zugriff");
t("Presets", "Voreinstellungen");
t("Saved Views", "Gespeicherte Ansichten");
t("Save your current filters for quick access later.", "Speichern Sie Ihre aktuellen Filter fuer spaetere schnelle Zugriffe.");

// Jobs compact header
t("Search jobs...", "Stellen suchen...");
t("Navigation", "Navigation");
t("Admin Tools", "Admin-Tools");
t("New Job", "Neue Stelle");
t("Jobs", "Stellen");
t("Created Date", "Erstellungsdatum");
t("Layout", "Layout");
t("Views", "Ansichten");

// Candidate documents
t("Select Document Type", "Dokumenttyp auswaehlen");
t("Failed to load documents", "Dokumente konnten nicht geladen werden");
t("Failed to update document", "Dokument konnte nicht aktualisiert werden");
t("Document deleted", "Dokument geloescht");
t("Failed to delete document", "Dokument konnte nicht geloescht werden");
t("Document Type", "Dokumenttyp");
t("Expiry Date (Optional)", "Ablaufdatum (optional)");
t("Loading documents", "Dokumente werden geladen");
t("Release to upload", "Loslassen zum Hochladen");
t("No documents yet", "Noch keine Dokumente");
t("Upload the first document to get started", "Laden Sie das erste Dokument hoch, um zu beginnen");
t("Documents will be automatically archived after this date for GDPR compliance", "Dokumente werden nach diesem Datum fuer DSGVO-Konformitaet automatisch archiviert");
t("Document preview", "Dokumentvorschau");

// Candidate interaction log
t("Interaction Timeline", "Interaktionsverlauf");
t("Please enter note content", "Bitte geben Sie den Notizeninhalt ein");
t("Note added successfully", "Notiz erfolgreich hinzugefuegt");
t("Failed to add note", "Notiz konnte nicht hinzugefuegt werden");
t("Log New Interaction", "Neue Interaktion erfassen");
t("Enter interaction details...", "Interaktionsdetails eingeben...");
t("No interactions logged yet", "Noch keine Interaktionen erfasst");
t("Loading candidate interactions...", "Kandidateninteraktionen werden geladen...");
t("Note", "Notiz");
t("Phone Call", "Telefonanruf");
t("Message", "Nachricht");

// Candidate internal rating
t("Rating History", "Bewertungsverlauf");
t("Ratings updated successfully", "Bewertungen erfolgreich aktualisiert");
t("Failed to update ratings", "Bewertungen konnten nicht aktualisiert werden");
t("Add context for these ratings...", "Kontext fuer diese Bewertungen hinzufuegen...");
t("Overall team assessment of candidate quality", "Gesamtbewertung des Teams zur Kandidatenqualitaet");
t("Candidate responsiveness and interest level", "Reaktionsfaehigkeit und Interesseniveau des Kandidaten");
t("Skills and experience alignment with opportunities", "Uebereinstimmung von Faehigkeiten und Erfahrung mit Moeglichkeiten");
t("View all rating changes and team member assessments over time", "Alle Bewertungsaenderungen und Teammitglied-Beurteilungen im Zeitverlauf anzeigen");
t("Team evaluation metrics (not visible to candidate)", "Team-Bewertungskennzahlen (fuer Kandidaten nicht sichtbar)");

// Candidate invitation dialog
t("Invitation sent successfully!", "Einladung erfolgreich gesendet!");
t("Failed to send invitation", "Einladung konnte nicht gesendet werden");
t("Email Address", "E-Mail-Adresse");
t("Link to Specific Jobs (Optional)", "Verknuepfung mit bestimmten Stellen (optional)");
t("Personal Message", "Persoenliche Nachricht");
t("Selected jobs will be mentioned in the invitation email", "Ausgewaehlte Stellen werden in der Einladungs-E-Mail erwaehnt");
t("This message will be included in the invitation email", "Diese Nachricht wird in die Einladungs-E-Mail aufgenommen");
t("What happens next?", "Was passiert als Naechstes?");

// Create interview dialog
t("Please fill in all required fields", "Bitte fuellen Sie alle erforderlichen Felder aus");
t("Please select at least one interviewer", "Bitte waehlen Sie mindestens einen Interviewer aus");
t("Interview scheduled successfully", "Vorstellungsgespraech erfolgreich geplant");
t("Add to Google Calendar", "Zu Google Kalender hinzufuegen");
t("Interview Type *", "Vorstellungsgespraechsart *");
t("Meeting Title *", "Meeting-Titel *");
t("Date *", "Datum *");
t("Time *", "Uhrzeit *");
t("Duration (minutes)", "Dauer (Minuten)");
t("Google Calendar Connected", "Google Kalender verbunden");
t("Google Calendar Not Connected", "Google Kalender nicht verbunden");
t("No team members assigned to this job", "Keine Teammitglieder dieser Stelle zugewiesen");
t("AI-Powered Auto-Fill", "KI-gestuetztes Auto-Ausfuellen");

// Create post dialog
t("Create Post", "Beitrag erstellen");
t("You must be logged in to create a post", "Sie muessen angemeldet sein, um einen Beitrag zu erstellen");
t("Failed to create post", "Beitrag konnte nicht erstellt werden");
t("Audience", "Zielgruppe");
t("Public Post", "Oeffentlicher Beitrag");
t("Publish Now", "Jetzt veroeffentlichen");
t("Share your story...", "Teilen Sie Ihre Geschichte...");
t("Share news, updates, or announcements with your followers", "Teilen Sie Nachrichten, Updates oder Ankuendigungen mit Ihren Followern");

// AddCandidate structured keys
t("Added But Audit Failed", "Hinzugefuegt, aber Audit fehlgeschlagen");
t("Added But Log Failed", "Hinzugefuegt, aber Protokoll fehlgeschlagen");
t("Added Successfully", "Erfolgreich hinzugefuegt");
t("Added To Pipeline", "Zur Pipeline hinzugefuegt");
t("Adding", "Wird hinzugefuegt");
t("Add To Pipeline", "Zur Pipeline hinzufuegen");
t("Admin Notes", "Admin-Notizen");
t("Ai Fill Details", "KI-Details ausfuellen");
t("Already In Pipeline", "Bereits in der Pipeline");
t("Contact Required", "Kontakt erforderlich");
t("Contact Required Desc", "Kontaktinformationen sind erforderlich");
t("Credit Assignment", "Gutschrift-Zuweisung");
t("Credit Description", "Gutschrift-Beschreibung");
t("Current Company", "Aktuelles Unternehmen");
t("Current Title", "Aktuelle Position");
t("Duplicate Check Failed", "Duplikatpruefung fehlgeschlagen");
t("Email Optional", "E-Mail (optional)");
t("Enter Details Manually", "Details manuell eingeben");
t("Enter Linked In Url", "LinkedIn-URL eingeben");
t("Existing", "Bestehend");
t("Existing Profile Linked", "Bestehendes Profil verknuepft");
t("Failed Import Linked In", "LinkedIn-Import fehlgeschlagen");
t("Failed To Add", "Hinzufuegen fehlgeschlagen");
t("Full Name", "Vollstaendiger Name");
t("Full Name Required", "Vollstaendiger Name erforderlich");
t("Importing", "Wird importiert");
t("Import Profile", "Profil importieren");
t("Linkedin Importer", "LinkedIn-Importer");
t("Linkedin Importer Desc", "LinkedIn-Profil-Importer Beschreibung");
t("Linkedin Profile Imported", "LinkedIn-Profil importiert");
t("Linkedin Profile Recommended", "LinkedIn-Profil empfohlen");
t("Linkedin Profile Url", "LinkedIn-Profil-URL");
t("Linkedin Recommended", "LinkedIn empfohlen");
t("Linkedin Recommended Desc", "LinkedIn empfohlen Beschreibung");
t("Linkedin Timed Out", "LinkedIn-Zeitueberschreitung");
t("Linkedin Url Format", "LinkedIn-URL-Format");
t("Link Existing", "Bestehenden verknuepfen");
t("Link Existing Desc", "Beschreibung: Bestehenden verknuepfen");
t("Name And Photo Extracted", "Name und Foto extrahiert");
t("Name Extracted Manual", "Name extrahiert (manuell)");
t("Name Extracted Verify", "Name extrahiert (ueberpruefen)");
t("Name From Linked In", "Name von LinkedIn");
t("No Candidates Found", "Keine Kandidaten gefunden");
t("No Team Member Found", "Kein Teammitglied gefunden");
t("Notes Optional", "Notizen (optional)");
t("Phone Optional", "Telefon (optional)");
t("Profile Imported", "Profil importiert");
t("Resume C V", "Lebenslauf");
t("Search Placeholder", "Suche...");
t("Search Team Members", "Teammitglieder suchen");
t("Selected Count", "Ausgewaehlte Anzahl");
t("Select Team Members", "Teammitglieder auswaehlen");
t("Starting Pipeline Stage", "Start-Pipeline-Phase");
t("Start Typing To Search", "Tippen Sie, um zu suchen");
t("Step1 Description", "Schritt-1-Beschreibung");
t("Step1 Title", "Schritt-1-Titel");
t("Failed to Add Candidate", "Kandidat konnte nicht hinzugefuegt werden");
t("An unexpected error occurred. Please try again or contact support.", "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.");
t("Try Again Or Manual", "Erneut versuchen oder manuell");
t("Valid Email Required", "Gueltige E-Mail erforderlich");
t("Verify Manually", "Manuell ueberpruefen");
t("Why Adding Candidate", "Warum wird der Kandidat hinzugefuegt");

// ============================================================
// Now apply all translations to DE files
// ============================================================

function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

let totalUpdated = 0;

for (const ns of NAMESPACES) {
  const deFile = join(BASE, 'de', `${ns}.json`);
  const enFile = join(BASE, 'en', `${ns}.json`);

  let de, en;
  try {
    de = JSON.parse(readFileSync(deFile, 'utf8'));
    en = JSON.parse(readFileSync(enFile, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${ns}: ${e.message}`);
    continue;
  }

  const allKeys = getAllKeys(de);
  let updated = 0;

  for (const keyPath of allKeys) {
    const deValue = getNestedValue(de, keyPath);
    const enValue = getNestedValue(en, keyPath);

    if (deValue !== enValue) continue;
    if (typeof deValue !== 'string') continue;
    if (deValue.trim() === '') continue;

    if (translations.has(deValue)) {
      const newValue = translations.get(deValue);
      if (newValue !== deValue) {
        setNestedValue(de, keyPath, newValue);
        updated++;
      }
    }
  }

  if (updated > 0) {
    writeFileSync(deFile, JSON.stringify(de, null, 2) + '\n');
    console.log(`${ns}: Updated ${updated} translations`);
    totalUpdated += updated;
  } else {
    console.log(`${ns}: No updates from pass 3`);
  }
}

console.log(`\nTotal translations applied in pass 3: ${totalUpdated}`);
