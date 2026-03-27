#!/usr/bin/env node
/**
 * Pass 2: Comprehensive German translations for ALL missing keys.
 * Reads each DE file and translates any remaining English strings.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');

// Master translation map: EN -> DE for every string we encounter
const translations = new Map();

function t(en, de) { translations.set(en, de); }

// =================================================================
// MESSAGES namespace (21 keys)
// =================================================================
t("Unified view of all communications with AI-powered insights", "Einheitliche Ansicht aller Kommunikation mit KI-gestuetzten Einblicken");
t("Communication Intelligence", "Kommunikationsintelligenz");
t("All Entities", "Alle Entitaeten");
t("Candidates", "Kandidaten");
t("Prospects", "Interessenten");
t("Partners", "Partner");
t("Healthy", "Gesund");
t("Needs Attention", "Erfordert Aufmerksamkeit");
t("At Risk", "Gefaehrdet");
t("Critical", "Kritisch");
t("Communication Timeline", "Kommunikationsverlauf");
t("No relationships tracked yet", "Noch keine Beziehungen erfasst");
t("Detected Patterns", "Erkannte Muster");
t("No patterns detected", "Keine Muster erkannt");
t("Welcome to Messages", "Willkommen bei Nachrichten");
t("Start conversations with your network", "Starten Sie Gespraeche mit Ihrem Netzwerk");
t("Messages", "Nachrichten");
t("Search conversations and messages...", "Gespraeche und Nachrichten suchen...");
t("Select a conversation", "Waehlen Sie ein Gespraech aus");
t("Choose from your existing conversations or start a new one", "Waehlen Sie aus Ihren bestehenden Gespraechen oder starten Sie ein neues");
t("WhatsApp Business", "WhatsApp Business");

// =================================================================
// JOBS namespace (38 keys)
// =================================================================
t("Manage your jobs and customize hiring pipeline", "Verwalten Sie Ihre Stellen und passen Sie die Einstellungspipeline an");
t("These stages will be used as the template for all new jobs", "Diese Phasen werden als Vorlage fuer alle neuen Stellen verwendet");
t("New Application", "Neue Bewerbung");
t("Get notified when a candidate applies", "Benachrichtigung erhalten, wenn sich ein Kandidat bewirbt");
t("Stage Changes", "Phasenaenderungen");
t("Get notified when candidates move between stages", "Benachrichtigung erhalten, wenn Kandidaten zwischen Phasen wechseln");
t("Rejections", "Ablehnungen");
t("Get notified when candidates are rejected", "Benachrichtigung erhalten, wenn Kandidaten abgelehnt werden");
t("Configure how candidates are scored for this role", "Konfigurieren Sie, wie Kandidaten fuer diese Stelle bewertet werden");
t("Job not found", "Stelle nicht gefunden");
t("Back to Jobs", "Zurueck zu Stellen");
t("Matches", "Treffer");
t("Activity", "Aktivitaet");
t("Generate a Cover Letter", "Anschreiben generieren");
t("Create an AI-powered cover letter for this role", "Erstellen Sie ein KI-gestuetztes Anschreiben fuer diese Stelle");
t("Cover Letter Builder", "Anschreiben-Generator");
t("Key Responsibilities", "Hauptaufgaben");
t("Main areas you'll be working on", "Hauptbereiche, in denen Sie arbeiten werden");
t("Top Benefits", "Wichtigste Vorteile");
t("What we offer", "Was wir bieten");
t("Job Analytics", "Stellen-Analysen");
t("Performance metrics and insights", "Leistungskennzahlen und Einblicke");
t("Total Applications", "Gesamtbewerbungen");
t("Total Views", "Gesamtaufrufe");
t("Conversion Rate", "Konversionsrate");
t("Days Active", "Tage aktiv");
t("No saved jobs yet", "Noch keine gespeicherten Stellen");
t("Curated roles for The Quantum Club members", "Ausgewaehlte Stellen fuer The Quantum Club Mitglieder");
t("Browse opportunities and save roles that interest you", "Durchsuchen Sie Moeglichkeiten und speichern Sie Stellen, die Sie interessieren");
t("This pipeline is protected. Enter the password to view it.", "Diese Pipeline ist geschuetzt. Geben Sie das Passwort ein, um sie anzuzeigen.");
t("Link unavailable", "Link nicht verfuegbar");
t("Password required", "Passwort erforderlich");
t("Enter password", "Passwort eingeben");
t("No candidates in this pipeline yet.", "Noch keine Kandidaten in dieser Pipeline.");
t("The Quantum Club", "The Quantum Club");

// =================================================================
// COMPLIANCE namespace (78 keys)
// =================================================================
t("Public vendor registry with certifications and data location transparency", "Oeffentliches Anbieterverzeichnis mit Zertifizierungen und Datentransparenz");
t("Add Subprocessor", "Auftragsverarbeiter hinzufuegen");
t("Search subprocessors...", "Auftragsverarbeiter suchen...");
t("Loading subprocessors...", "Auftragsverarbeiter werden geladen...");
t("No subprocessors found", "Keine Auftragsverarbeiter gefunden");
t("Data Location", "Datenspeicherort");
t("Certifications", "Zertifizierungen");
t("Legal Agreements", "Rechtliche Vereinbarungen");
t("Manage DPAs, BAAs, and other legal documents with e-signature workflow", "DPAs, BAAs und andere Rechtsdokumente mit E-Signatur-Workflow verwalten");
t("Create from Template", "Aus Vorlage erstellen");
t("Search agreements...", "Vereinbarungen suchen...");
t("Loading agreements...", "Vereinbarungen werden geladen...");
t("No agreements found. Create your first agreement from a template.", "Keine Vereinbarungen gefunden. Erstellen Sie Ihre erste Vereinbarung aus einer Vorlage.");
t("Send for Signature", "Zur Unterschrift senden");
t("Effective Date", "Gueltigkeitsdatum");
t("Expiration Date", "Ablaufdatum");
t("Contact", "Kontakt");
t("Audit Requests", "Pruefungsanfragen");
t("Manage customer audit requests and compliance documentation", "Kunden-Pruefungsanfragen und Compliance-Dokumentation verwalten");
t("Total Requests", "Anfragen gesamt");
t("In Progress", "In Bearbeitung");
t("Search by request number, requester, or audit type...", "Nach Anfragenummer, Antragsteller oder Pruefungsart suchen...");
t("Filter by status", "Nach Status filtern");
t("Loading audit requests...", "Pruefungsanfragen werden geladen...");
t("No audit requests found", "Keine Pruefungsanfragen gefunden");
t("Start Review", "Pruefung starten");
t("Mark Complete", "Als abgeschlossen markieren");
t("Requester", "Antragsteller");
t("Due Date", "Faelligkeitsdatum");
t("Purpose", "Zweck");
t("Requested Documents", "Angeforderte Dokumente");
t("New Request", "Neue Anfrage");
t("Create Audit Request", "Pruefungsanfrage erstellen");
t("Audit Type", "Pruefungsart");
t("Select type", "Art auswaehlen");
t("Internal", "Intern");
t("Select priority", "Prioritaet auswaehlen");
t("Audit Scope", "Pruefungsumfang");
t("e.g., Security controls, Data processing", "z.B. Sicherheitskontrollen, Datenverarbeitung");
t("Audit Purpose", "Pruefungszweck");
t("Describe the purpose of this audit...", "Beschreiben Sie den Zweck dieser Pruefung...");
t("Requester Name", "Name des Antragstellers");
t("Requester Email", "E-Mail des Antragstellers");
t("Requested Documents (comma-separated)", "Angeforderte Dokumente (kommagetrennt)");
t("e.g., Security policies, Incident response plan, Access logs", "z.B. Sicherheitsrichtlinien, Notfallplan, Zugriffsprotokolle");
t("Compliance & Legal", "Compliance & Recht");
t("Enterprise-grade compliance infrastructure and legal document management", "Compliance-Infrastruktur und Rechtsdokumentenverwaltung auf Unternehmensebene");
t("Overall Compliance Score", "Gesamt-Compliance-Score");
t("Data Classification", "Datenklassifizierung");
t("Field-level sensitivity tagging and data governance rules", "Sensitivitaets-Tagging auf Feldebene und Data-Governance-Regeln");
t("Customer audit request management with document portal", "Kunden-Pruefungsanfragen-Verwaltung mit Dokumentenportal");
t("Quick Actions", "Schnellaktionen");
t("Create DPA", "DPA erstellen");
t("Classify Data", "Daten klassifizieren");
t("New Audit Request", "Neue Pruefungsanfrage");
t("Add Classification Rule", "Klassifizierungsregel hinzufuegen");
t("Loading classification rules...", "Klassifizierungsregeln werden geladen...");
t("No classification rules defined. Start by adding rules for sensitive data fields.", "Keine Klassifizierungsregeln definiert. Beginnen Sie mit Regeln fuer sensible Datenfelder.");

// =================================================================
// CONTRACTS namespace (78 keys)
// =================================================================
t("Time Tracking", "Zeiterfassung");
t("Track hours, submit timesheets, and manage approvals", "Stunden erfassen, Stundennachweise einreichen und Genehmigungen verwalten");
t("Total Budget", "Gesamtbudget");
t("Contract Type", "Vertragsart");
t("Timeline", "Zeitplan");
t("Milestones", "Meilensteine");
t("Payments", "Zahlungen");
t("Company Name", "Firmenname");
t("Freelancer Name", "Freelancer-Name");
t("Contract Documents", "Vertragsdokumente");
t("Manage your freelance project contracts and payments", "Verwalten Sie Ihre Freelance-Projektvertraege und Zahlungen");
t("As Freelancer", "Als Freelancer");
t("As Client", "Als Auftraggeber");
t("Total Contracts", "Vertraege gesamt");
t("Pending Signature", "Unterschrift ausstehend");
t("Search contracts...", "Vertraege suchen...");
t("Key Terms", "Wesentliche Bedingungen");
t("Review the contract terms and add your signature to proceed", "Pruefen Sie die Vertragsbedingungen und fuegen Sie Ihre Unterschrift hinzu");
t("Total Value", "Gesamtwert");
t("Payment Schedule", "Zahlungsplan");
t("Platform Fee", "Plattformgebuehr");
t("Escrow Protection", "Treuhandschutz");
t("Terms of Service", "Nutzungsbedingungen");
t("Privacy Policy", "Datenschutzrichtlinie");
t("View Details", "Details anzeigen");
t("Retainer Contracts", "Rahmenvertraege");
t("Manage ongoing client relationships", "Laufende Kundenbeziehungen verwalten");
t("Create Retainer Contract", "Rahmenvertrag erstellen");
t("Set up a recurring monthly arrangement", "Richten Sie eine wiederkehrende monatliche Vereinbarung ein");
t("Monthly Hours", "Monatliche Stunden");
t("Terms & Description", "Bedingungen & Beschreibung");
t("Describe the scope of work...", "Beschreiben Sie den Arbeitsumfang...");
t("Create Contract", "Vertrag erstellen");
t("Monthly", "Monatlich");
t("Rate", "Tarif");
t("This Month", "Dieser Monat");
t("No active retainers", "Keine aktiven Rahmenvertraege");
t("Create a retainer contract to get started", "Erstellen Sie einen Rahmenvertrag, um zu beginnen");
t("Pending Retainer", "Ausstehender Rahmenvertrag");
t("No completed retainers", "Keine abgeschlossenen Rahmenvertraege");
t("Log Hours", "Stunden erfassen");
t("Record time spent on this retainer", "Erfassen Sie die Zeit fuer diesen Rahmenvertrag");
t("Hours", "Stunden");
t("What did you work on?", "Woran haben Sie gearbeitet?");
t("Contract Management", "Vertragsverwaltung");
t("Manage freelance contracts, payments, and change orders", "Freelance-Vertraege, Zahlungen und Aenderungsauftraege verwalten");
t("Search contracts...", "Vertraege suchen...");
t("Create Contract", "Vertrag erstellen");
t("Contracts", "Vertraege");
t("Budget & Spend", "Budget & Ausgaben");
t("Change Orders", "Aenderungsauftraege");
t("Invoices", "Rechnungen");
t("No contracts yet", "Noch keine Vertraege");
t("No contracts match your filters", "Keine Vertraege entsprechen Ihren Filtern");
t("Create your first contract to start hiring freelancers", "Erstellen Sie Ihren ersten Vertrag, um Freelancer zu beauftragen");
t("Contract Invoices", "Vertragsrechnungen");
t("No invoices generated yet", "Noch keine Rechnungen erstellt");

// =================================================================
// ANALYTICS namespace (95 keys)
// =================================================================
t("Manage your AI agents, track goals, and control autonomy levels", "Verwalten Sie Ihre KI-Agenten, verfolgen Sie Ziele und steuern Sie Autonomiestufen");
t("AI-powered career analysis and recommendations", "KI-gestuetzte Karriereanalyse und Empfehlungen");
t("Skill Gap Analysis", "Kompetenzluecken-Analyse");
t("Your skills vs market requirements", "Ihre Faehigkeiten vs. Marktanforderungen");
t("Market Position", "Marktposition");
t("How you compare in the market", "Wie Sie sich im Markt vergleichen");
t("Percentile in your field", "Perzentil in Ihrem Bereich");
t("Salary Range", "Gehaltsspanne");
t("Demand Level", "Nachfrageniveau");
t("Career Trends", "Karrieretrends");
t("Industry trends affecting your career", "Branchentrends, die Ihre Karriere beeinflussen");
t("Recommended Actions", "Empfohlene Massnahmen");
t("Club AI's personalized recommendations", "Personalisierte Empfehlungen von Club AI");
t("No Insights Generated Yet", "Noch keine Einblicke generiert");
t("Click ')Generate Insights' to get AI-powered career recommendations", "Klicken Sie auf \"Einblicke generieren\", um KI-gestuetzte Karriereempfehlungen zu erhalten");
t("Client Analytics", "Kundenanalysen");
t("Monitor your hiring and project metrics", "Ueberwachen Sie Ihre Einstellungs- und Projektkennzahlen");
t("No projects yet", "Noch keine Projekte");
t("Monitor ML performance and company intelligence across the platform", "Ueberwachen Sie die ML-Leistung und Unternehmensintelligenz auf der gesamten Plattform");
t("With intelligence data", "Mit Intelligenzdaten");
t("Data points", "Datenpunkte");
t("AUC-ROC Score", "AUC-ROC-Score");
t("No intelligence data yet. Generate reports for companies to see insights.", "Noch keine Intelligenzdaten. Erstellen Sie Berichte fuer Unternehmen, um Einblicke zu erhalten.");
t("No recent insights. Log interactions to generate intelligence.", "Keine aktuellen Einblicke. Erfassen Sie Interaktionen, um Intelligenz zu generieren.");
t("Filter by job", "Nach Stelle filtern");
t("Active Model", "Aktives Modell");
t("Companies Tracked", "Verfolgte Unternehmen");
t("Interactions (30d)", "Interaktionen (30T)");
t("Training Records", "Trainingsdatensaetze");
t("Model Accuracy", "Modellgenauigkeit");
t("Company Intelligence Leaderboard", "Unternehmensintelligenz-Rangliste");
t("Health", "Gesundheit");
t("Urgency", "Dringlichkeit");
t("Sentiment", "Stimmung");
t("Recent Intelligence Signals", "Aktuelle Intelligenzsignale");
t("Interaction Coverage", "Interaktionsabdeckung");
t("Total Interactions (30d)", "Interaktionen gesamt (30T)");
t("Companies with Data", "Unternehmen mit Daten");
t("Intelligence Quality", "Intelligenzqualitaet");
t("AI Reports Generated", "KI-Berichte erstellt");
t("Insights Extracted", "Extrahierte Einblicke");
t("Average Health Score", "Durchschnittlicher Gesundheits-Score");
t("Model Registry", "Modellregistrierung");
t("Loading models...", "Modelle werden geladen...");
t("AUC-ROC", "AUC-ROC");
t("Interview Rate", "Vorstellungsgespraechsrate");
t("Hire Rate", "Einstellungsrate");
t("A/B Tests", "A/B-Tests");
t("Loading tests...", "Tests werden geladen...");
t("Traffic Split", "Traffic-Aufteilung");
t("Model A Samples", "Modell-A-Stichproben");
t("Model B Samples", "Modell-B-Stichproben");
t("Freelancer Analytics", "Freelancer-Analysen");
t("Track your performance and growth", "Verfolgen Sie Ihre Leistung und Ihr Wachstum");
t("Projects worked", "Bearbeitete Projekte");
t("Failed to load analytics", "Analysen konnten nicht geladen werden");
t("Messaging Analytics", "Messaging-Analysen");
t("Insights into your communication patterns", "Einblicke in Ihre Kommunikationsmuster");
t("Last 30 days", "Letzte 30 Tage");
t("Response time", "Antwortzeit");
t("Conversations", "Gespraeche");
t("Files shared", "Geteilte Dateien");
t("Patterns", "Muster");
t("Media", "Medien");
t("Daily Activity (Last 7 Days)", "Taegliche Aktivitaet (letzte 7 Tage)");
t("Messages sent and received each day", "Taeglich gesendete und empfangene Nachrichten");
t("Hourly Distribution", "Stuendliche Verteilung");
t("When you send messages throughout the day", "Wann Sie im Laufe des Tages Nachrichten senden");
t("Media Breakdown", "Medienaufschluesselung");
t("Types of files shared", "Arten geteilter Dateien");
t("Track your commissions, targets, and placements", "Verfolgen Sie Ihre Provisionen, Ziele und Vermittlungen");
t("My Performance", "Meine Leistung");
t("Hours This Month", "Stunden diesen Monat");
t("Revenue per Hour", "Umsatz pro Stunde");
t("Real market insights powered by platform data", "Echte Markteinblicke basierend auf Plattformdaten");
t("Negotiate after receiving an offer, not during initial interviews.", "Verhandeln Sie erst nach Erhalt eines Angebots, nicht waehrend der ersten Gespraeche.");
t("Salary Intelligence", "Gehaltsintelligenz");
t("Entry Level", "Einstiegsniveau");
t("Mid-Senior", "Mittel-Senior");
t("Executive", "Fuehrungsebene");
t("Fetching market data...", "Marktdaten werden abgerufen...");
t("Median", "Median");
t("Entry Range", "Einstiegsspanne");
t("Market Average", "Marktdurchschnitt");
t("Competitive", "Wettbewerbsfaehig");
t("Your Market Position", "Ihre Marktposition");
t("Know Your Value", "Kennen Sie Ihren Wert");
t("Consider Total Compensation", "Beruecksichtigen Sie die Gesamtverguetung");
t("Timing Matters", "Timing ist wichtig");
t("Manage and track your team's performance and commissions", "Verwalten und verfolgen Sie die Leistung und Provisionen Ihres Teams");
t("Team Performance", "Teamleistung");

// =================================================================
// CANDIDATES namespace (163 keys)
// =================================================================
t("Unified view of all candidate profiles and user data", "Einheitliche Ansicht aller Kandidatenprofile und Benutzerdaten");
t("All Candidates", "Alle Kandidaten");
t("Search & Filter", "Suchen & Filtern");
t("Search by name or email...", "Nach Name oder E-Mail suchen...");
t("Merge Status", "Zusammenfuehrungsstatus");
t("All Status", "Alle Status");
t("Merged", "Zusammengefuehrt");
t("Invited", "Eingeladen");
t("Unlinked", "Nicht verknuepft");
t("Completeness", "Vollstaendigkeit");
t("All Scores", "Alle Bewertungen");
t("Analytics data will appear once your profile starts receiving views and applications.", "Analysedaten werden angezeigt, sobald Ihr Profil Aufrufe und Bewerbungen erhaelt.");
t("No Analytics Data Yet", "Noch keine Analysedaten");
t("Your Career Analytics", "Ihre Karriereanalysen");
t("Track your job search performance and insights", "Verfolgen Sie Ihre Jobsuche-Leistung und Einblicke");
t("Profile Views", "Profilaufrufe");
t("Applications", "Bewerbungen");
t("Interviews", "Vorstellungsgespraeche");
t("Success Rate", "Erfolgsquote");
t("Profile", "Profil");
t("Job Search", "Stellensuche");
t("Network", "Netzwerk");
t("Profile Views Trend", "Profilaufruf-Trend");
t("Daily profile views over the last 30 days", "Taegliche Profilaufrufe der letzten 30 Tage");
t("Top Companies Viewing You", "Top-Unternehmen, die Sie ansehen");
t("Companies that viewed your profile most", "Unternehmen, die Ihr Profil am haeufigsten angesehen haben");
t("Document Engagement", "Dokumenten-Engagement");
t("How recruiters interact with your documents", "Wie Recruiter mit Ihren Dokumenten interagieren");
t("CV Downloads", "Lebenslauf-Downloads");
t("Portfolio Views", "Portfolio-Aufrufe");
t("Docs Shared", "Geteilte Dokumente");
t("Application Timeline", "Bewerbungsverlauf");
t("Your application activity over time", "Ihre Bewerbungsaktivitaet im Zeitverlauf");
t("Applications by Stage", "Bewerbungen nach Phase");
t("Current distribution of your applications", "Aktuelle Verteilung Ihrer Bewerbungen");
t("Interview Performance", "Vorstellungsgespraechs-Leistung");
t("Your average scores across different dimensions", "Ihre Durchschnittsbewertungen in verschiedenen Dimensionen");
t("Interview Metrics", "Vorstellungsgespraechs-Kennzahlen");
t("Overall interview statistics", "Gesamtstatistik der Vorstellungsgespraeche");
t("Total Interviews", "Vorstellungsgespraeche gesamt");
t("Average Rating", "Durchschnittsbewertung");
t("No-Show Rate", "Nichterscheinungsrate");
t("Job Search Behavior", "Stellensuche-Verhalten");
t("What you're looking for", "Wonach Sie suchen");
t("Top Search Terms", "Haeufigste Suchbegriffe");
t("Referrals Made", "Gemachte Empfehlungen");
t("Referrals Hired", "Eingestellte Empfehlungen");
t("Rewards Earned", "Verdiente Belohnungen");
t("Sync this candidate's LinkedIn profile to import their work history automatically.", "Synchronisieren Sie das LinkedIn-Profil dieses Kandidaten, um den Werdegang automatisch zu importieren.");
t("Sync this candidate's LinkedIn profile to import their education history.", "Synchronisieren Sie das LinkedIn-Profil dieses Kandidaten, um die Ausbildung automatisch zu importieren.");
t("Candidate Not Found", "Kandidat nicht gefunden");
t("Profile header", "Profil-Header");
t("Edit Profile", "Profil bearbeiten");
t("Sync LinkedIn", "LinkedIn synchronisieren");
t("LinkedIn", "LinkedIn");
t("GitHub", "GitHub");
t("Portfolio", "Portfolio");
t("Last updated:", "Zuletzt aktualisiert:");
t("Updated:", "Aktualisiert:");
t("Team", "Team");
t("Work Auth", "Arbeitserlaubnis");
t("Pipeline", "Pipeline");
t("Internal Notes & Rating", "Interne Notizen & Bewertung");
t("Interview Intelligence", "Vorstellungsgespraechs-Intelligenz");
t("Avg Score", "Durchschnittsbewertung");
t("Last Interview", "Letztes Vorstellungsgespraech");
t("Strengths", "Staerken");
t("Areas to Develop", "Entwicklungsbereiche");
t("No work experience on record", "Keine Berufserfahrung hinterlegt");
t("No education on record", "Keine Ausbildung hinterlegt");
t("Social Profiles", "Soziale Profile");
t("Try adjusting your search or filters", "Versuchen Sie, Ihre Suche oder Filter anzupassen");
t("Find Talent", "Talente finden");
t("Search and invite freelancers to your projects", "Suchen Sie Freelancer und laden Sie sie zu Ihren Projekten ein");
t("Search by name, title, or bio...", "Nach Name, Titel oder Biografie suchen...");
t("Filter by skill", "Nach Faehigkeit filtern");
t("Availability", "Verfuegbarkeit");
t("Available", "Verfuegbar");
t("Partially Available", "Teilweise verfuegbar");
t("Not Available", "Nicht verfuegbar");
t("No freelancers found", "Keine Freelancer gefunden");
t("Talent Pool", "Talent Pool");
t("AI-powered talent intelligence and pipeline management", "KI-gestuetzte Talentintelligenz und Pipeline-Verwaltung");
t("List not found", "Liste nicht gefunden");
t("Smart List", "Intelligente Liste");
t("No candidates yet", "Noch keine Kandidaten");
t("Tier", "Stufe");
t("Move Probability", "Wechselwahrscheinlichkeit");
t("Create your first list to start organizing candidates", "Erstellen Sie Ihre erste Liste, um Kandidaten zu organisieren");
t("Create List", "Liste erstellen");
t("Talent Lists", "Talentlisten");
t("Organize candidates into curated lists", "Organisieren Sie Kandidaten in kuratierte Listen");
t("No lists yet", "Noch keine Listen");
t("Quick Create from Templates", "Schnellerstellung aus Vorlagen");
t("Already created", "Bereits erstellt");
t("Create New List", "Neue Liste erstellen");
t("Create a manual list to curate candidates", "Erstellen Sie eine manuelle Liste zur Kandidatenkuration");
t("Description (optional)", "Beschreibung (optional)");
t("What's this list for?", "Wofuer ist diese Liste?");
t("Delete List", "Liste loeschen");
t("Edit List", "Liste bearbeiten");
t("Update the list name and description", "Listenname und Beschreibung aktualisieren");
t("Share List", "Liste teilen");
t("Failed to load candidate", "Kandidat konnte nicht geladen werden");
t("Candidate not found", "Kandidat nicht gefunden");
t("Documents & Files", "Dokumente & Dateien");
t("TQC Internal Assessment", "TQC Interne Bewertung");
t("Data Completeness", "Datenvollstaendigkeit");
t("Score", "Score");
t("Talent Pool Status", "Talent-Pool-Status");
t("Career Preferences", "Karrierepraeferenzen");
t("Salary:", "Gehalt:");
t("Notice:", "Kuendigungsfrist:");
t("Work:", "Arbeit:");
t("Desired Locations:", "Gewuenschte Standorte:");
t("Profile completeness: {{score}}%", "Profilvollstaendigkeit: {{score}}%");
t("Filter by Tags", "Nach Tags filtern");
t("Clear all", "Alle loeschen");
t("Quality", "Qualitaet");
t("Function", "Funktion");
t("Custom", "Benutzerdefiniert");
t("Scoring Matrix", "Bewertungsmatrix");
t("Dimension", "Dimension");
t("Overall Score", "Gesamtbewertung");
t("Technical", "Technisch");
t("Communication", "Kommunikation");
t("Problem Solving", "Problemloesung");
t("Culture Fit", "Kulturelle Passung");
t("Leadership", "Fuehrung");
t("Concerns", "Bedenken");

// =================================================================
// SETTINGS namespace (68 keys)
// =================================================================
t("Manage who can see your posts with custom lists and best friends", "Verwalten Sie, wer Ihre Beitraege sehen kann, mit benutzerdefinierten Listen und besten Freunden");
t("Create a special list of your most trusted contacts for exclusive content sharing", "Erstellen Sie eine spezielle Liste Ihrer vertrauenswuerdigsten Kontakte fuer exklusives Teilen von Inhalten");
t("Share with all your 1st-degree connections in The Quantum Club", "Teilen Sie mit allen Ihren direkten Kontakten bei The Quantum Club");
t("Choose your default audience for new posts to save time", "Waehlen Sie Ihre Standardzielgruppe fuer neue Beitraege, um Zeit zu sparen");
t("Every time you create a post, you'll see an audience picker button to select who can see it", "Jedes Mal, wenn Sie einen Beitrag erstellen, sehen Sie eine Zielgruppen-Auswahl, um festzulegen, wer ihn sehen kann");
t("Your employer and current company are automatically protected unless you explicitly allow it", "Ihr Arbeitgeber und aktuelles Unternehmen sind automatisch geschuetzt, es sei denn, Sie erlauben es ausdruecklich");
t("See who viewed your posts and get insights on engagement from each audience segment", "Sehen Sie, wer Ihre Beitraege angesehen hat, und erhalten Sie Einblicke in das Engagement jedes Zielgruppensegments");
t("Audience Settings", "Zielgruppen-Einstellungen");
t("Custom Lists", "Benutzerdefinierte Listen");
t("Best Friends", "Beste Freunde");
t("Your closest contacts", "Ihre engsten Kontakte");
t("Instagram Style", "Instagram-Stil");
t("Organize your audience", "Organisieren Sie Ihre Zielgruppe");
t("Connections", "Verbindungen");
t("Your Quantum Club network", "Ihr Quantum Club Netzwerk");
t("Default Audience", "Standard-Zielgruppe");
t("Set your preference", "Legen Sie Ihre Praeferenz fest");
t("How Audience Targeting Works", "So funktioniert die Zielgruppenansprache");
t("Choose Before You Post", "Waehlen Sie vor dem Posten");
t("Multi-Select Options", "Mehrfachauswahl-Optionen");
t("Privacy First", "Datenschutz zuerst");
t("Analytics Included", "Analysen inklusive");
t("Your Custom Lists", "Ihre benutzerdefinierten Listen");
t("Instagram-style sharing:", "Instagram-artiges Teilen:");
t("Share your availability and let people book time with you", "Teilen Sie Ihre Verfuegbarkeit und lassen Sie Personen Termine bei Ihnen buchen");
t("Create a Round Robin or Collective booking link to enable team load balancing features.", "Erstellen Sie einen Round-Robin- oder Kollektiv-Buchungslink fuer Team-Lastverteilungsfunktionen.");
t("Scheduling", "Terminplanung");
t("Create Booking Link", "Buchungslink erstellen");
t("What's this meeting about?", "Worum geht es in diesem Meeting?");
t("Duration (minutes)", "Dauer (Minuten)");
t("Minimum notice (hours)", "Mindestvorlaufzeit (Stunden)");
t("Buffer before (minutes)", "Puffer vorher (Minuten)");
t("Buffer after (minutes)", "Puffer nachher (Minuten)");
t("Advance booking (days)", "Vorausbuchung (Tage)");
t("Theme Color", "Themenfarbe");
t("Scheduling Type", "Terminplanungstyp");
t("Individual (1-on-1)", "Einzelgespraech (1:1)");
t("Round Robin (Team)", "Round Robin (Team)");
t("Collective (Group)", "Kollektiv (Gruppe)");
t("Video Conferencing", "Videokonferenz");
t("Google Meet", "Google Meet");
t("Zoom", "Zoom");
t("Microsoft Teams", "Microsoft Teams");
t("Max Bookings Per Day (optional)", "Maximale Buchungen pro Tag (optional)");
t("Unlimited", "Unbegrenzt");
t("Primary Calendar (Auto-sync)", "Hauptkalender (Auto-Sync)");
t("Select a calendar", "Kalender auswaehlen");
t("None (No auto-sync)", "Keine (kein Auto-Sync)");
t("Allow booker to delegate permissions", "Buchenden erlauben, Berechtigungen zu delegieren");
t("Let the person booking decide what their guests can do", "Lassen Sie die buchende Person entscheiden, was ihre Gaeste tun koennen");
t("Require payment", "Zahlung erforderlich");
t("Guests must pay before confirming their booking", "Gaeste muessen vor der Buchungsbestaetigung bezahlen");
t("Amount", "Betrag");
t("Booking Links", "Buchungslinks");
t("Upcoming Bookings", "Anstehende Buchungen");
t("AI Intelligence", "KI-Intelligenz");
t("Embed", "Einbetten");
t("Workflows", "Workflows");
t("No Team Booking Links", "Keine Team-Buchungslinks");

// =================================================================
// MEETINGS namespace (195 keys)
// =================================================================
t("Recording Settings", "Aufnahmeeinstellungen");
t("Video Quality", "Videoqualitaet");
t("Higher quality requires more storage space", "Hoehere Qualitaet erfordert mehr Speicherplatz");
t("Best compatibility", "Beste Kompatibilitaet");
t("Universal format", "Universalformat");
t("Audio Quality", "Audioqualitaet");
t("Include System Audio", "Systemaudio einschliessen");
t("Record audio from other participants", "Audio anderer Teilnehmer aufnehmen");
t("Recording Info", "Aufnahmeinformationen");
t("Virtual backgrounds will be included", "Virtuelle Hintergruende werden eingeschlossen");
t("Recording saves locally to your device", "Aufnahme wird lokal auf Ihrem Geraet gespeichert");
t("Estimated file size: ~{{size}} MB/min", "Geschaetzte Dateigroesse: ~{{size}} MB/Min");
t("Start Recording", "Aufnahme starten");
t("Set your status", "Status festlegen");
t("Custom Status", "Benutzerdefinierter Status");
t("Emoji", "Emoji");
t("What's your status?", "Was ist Ihr Status?");
t("Clear after", "Loeschen nach");
t("Never", "Nie");
t("1 hour", "1 Stunde");
t("4 hours", "4 Stunden");
t("8 hours", "8 Stunden");
t("24 hours", "24 Stunden");
t("Save Status", "Status speichern");
t("Enter the 10-character meeting code", "Geben Sie den 10-stelligen Meeting-Code ein");
t("Join a Meeting", "Einem Meeting beitreten");
t("Meeting Code", "Meeting-Code");
t("ABC-DEFG-HIJ", "ABC-DEFG-HIJ");
t("No Recordings Yet", "Noch keine Aufnahmen");
t("Access and review all your interview recordings in one place", "Greifen Sie auf alle Ihre Aufnahmen zu und ueberpruefen Sie sie an einem Ort");
t("Supported formats: MP4, WebM, QuickTime, MP3, WAV (Max 500MB)", "Unterstuetzte Formate: MP4, WebM, QuickTime, MP3, WAV (Max. 500MB)");
t("Loading recordings...", "Aufnahmen werden geladen...");
t("Notes:", "Notizen:");
t("This meeting hasn't been analyzed yet or the AI Notetaker wasn't enabled.", "Dieses Meeting wurde noch nicht analysiert oder der KI-Notizassistent war nicht aktiviert.");
t("Loading meeting insights...", "Meeting-Einblicke werden geladen...");
t("No Insights Available", "Keine Einblicke verfuegbar");
t("Key Decisions", "Wichtige Entscheidungen");
t("Full Transcript", "Vollstaendiges Transkript");
t("Complete conversation record with timestamps", "Vollstaendige Gespraechsaufzeichnung mit Zeitstempeln");
t("Overall Sentiment", "Gesamtstimmung");
t("Topics Discussed", "Besprochene Themen");
t("All your meetings, transcribed and analyzed by Club AI", "Alle Ihre Meetings, transkribiert und analysiert von Club AI");
t("Club AI will automatically join meetings when enabled during creation", "Club AI tritt Meetings automatisch bei, wenn es bei der Erstellung aktiviert wird");
t("Generate insights, action items, and summaries after each meeting", "Generieren Sie Einblicke, Aufgaben und Zusammenfassungen nach jedem Meeting");
t("Get notified when meeting analysis is complete", "Benachrichtigung erhalten, wenn die Meeting-Analyse abgeschlossen ist");
t("Accurate speech-to-text during your meetings with speaker identification", "Genaue Spracherkennung waehrend Ihrer Meetings mit Sprecheridentifikation");
t("Automatic summaries, action items, decisions, and sentiment analysis", "Automatische Zusammenfassungen, Aufgaben, Entscheidungen und Stimmungsanalyse");
t("Find any moment in your meetings with full-text search", "Finden Sie jeden Moment in Ihren Meetings mit Volltextsuche");
t("Automatically create tasks from meeting action items", "Erstellen Sie automatisch Aufgaben aus Meeting-Aktionspunkten");
t("Save Settings", "Einstellungen speichern");
t("Meeting Intelligence Unavailable", "Meeting-Intelligenz nicht verfuegbar");
t("Search meetings, topics, or insights...", "Meetings, Themen oder Einblicke suchen...");
t("Loading your meetings...", "Ihre Meetings werden geladen...");
t("No meetings found", "Keine Meetings gefunden");
t("No topics analyzed yet", "Noch keine Themen analysiert");
t("No sentiment data available", "Keine Stimmungsdaten verfuegbar");
t("Positive", "Positiv");
t("Neutral", "Neutral");
t("Negative", "Negativ");
t("Auto-join meetings", "Meetings automatisch beitreten");
t("Automatic analysis", "Automatische Analyse");
t("Notifications", "Benachrichtigungen");
t("About Club AI Notetaker", "Ueber den Club AI Notizassistenten");
t("Recording Not Found", "Aufnahme nicht gefunden");
t("Action Items", "Aufgaben");
t("Key Moments", "Wichtige Momente");
t("Executive Summary", "Zusammenfassung");
t("Overall Fit", "Gesamteignung");
t("Areas for Concern", "Bedenkensbereiche");
t("No action items identified", "Keine Aufgaben identifiziert");
t("No key moments identified", "Keine wichtigen Momente identifiziert");
t("Skills Assessment", "Faehigkeitsbewertung");
t("No skills assessment available", "Keine Faehigkeitsbewertung verfuegbar");
t("Next Steps", "Naechste Schritte");
t("Follow-Up Email", "Nachfass-E-Mail");
t("Subject", "Betreff");
t("Body", "Inhalt");
t("The meeting link may be invalid or the meeting may have been deleted.", "Der Meeting-Link ist moeglicherweise ungueltig oder das Meeting wurde geloescht.");
t("Joining as a guest. You'll need host approval to enter.", "Beitritt als Gast. Sie benoetigen die Genehmigung des Gastgebers.");
t("You can start the meeting early", "Sie koennen das Meeting fruehzeitig starten");
t("Meeting Not Found", "Meeting nicht gefunden");
t("Enter meeting password", "Meeting-Passwort eingeben");
t("This meeting has ended", "Dieses Meeting ist beendet");
t("Create reusable templates for common meeting types", "Erstellen Sie wiederverwendbare Vorlagen fuer gaengige Meeting-Typen");
t("Create your first meeting template for quick scheduling", "Erstellen Sie Ihre erste Meeting-Vorlage fuer schnelle Planung");
t("Templates Unavailable", "Vorlagen nicht verfuegbar");
t("Meeting Templates", "Meeting-Vorlagen");
t("Quick Interview", "Schnellinterview");
t("Icon", "Symbol");
t("For candidate interviews with standardized settings", "Fuer Kandidatengespraeche mit standardisierten Einstellungen");
t("Access Type", "Zugriffstyp");
t("Public", "Oeffentlich");
t("Private", "Privat");
t("Restricted", "Eingeschraenkt");
t("Compliance Mode", "Compliance-Modus");
t("Allow Guests", "Gaeste erlauben");
t("Require Approval", "Genehmigung erforderlich");
t("Enable AI Notetaker", "KI-Notizassistent aktivieren");
t("Enable Recording", "Aufnahme aktivieren");
t("Make Public Template", "Oeffentliche Vorlage erstellen");
t("No templates yet", "Noch keine Vorlagen");
t("AI Notes", "KI-Notizen");
t("Recording", "Aufnahme");
t("Unified hub for all your meetings, calendar, and AI insights", "Zentraler Hub fuer alle Ihre Meetings, Kalender und KI-Einblicke");
t("Meetings & Intelligence", "Meetings & Intelligenz");
t("Calendar", "Kalender");
t("My Meetings", "Meine Meetings");
t("Prep", "Vorbereitung");
t("Post", "Nachbereitung");
t("History", "Verlauf");
t("Intelligence", "Intelligenz");
t("Search meetings...", "Meetings suchen...");
t("You haven't hosted any meetings yet", "Sie haben noch keine Meetings veranstaltet");
t("Pre-Meeting Prep", "Meeting-Vorbereitung");
t("Generate dossiers and prepare for upcoming meetings", "Erstellen Sie Dossiers und bereiten Sie sich auf kommende Meetings vor");
t("No upcoming meetings to prepare for", "Keine anstehenden Meetings zur Vorbereitung");
t("Prepare", "Vorbereiten");
t("Post-Meeting Review", "Meeting-Nachbereitung");
t("View summaries, action items, and follow-ups for completed meetings", "Zusammenfassungen, Aufgaben und Nachverfolgungen fuer abgeschlossene Meetings anzeigen");
t("No completed meetings to review", "Keine abgeschlossenen Meetings zur Ueberpr uefung");
t("View Notes", "Notizen anzeigen");
t("Add reaction", "Reaktion hinzufuegen");
t("Failed to remove reaction", "Reaktion konnte nicht entfernt werden");
t("Failed to add reaction", "Reaktion konnte nicht hinzugefuegt werden");
t("Please enter a channel name", "Bitte geben Sie einen Kanalnamen ein");
t("Channel created successfully", "Kanal erfolgreich erstellt");
t("Failed to create channel", "Kanal konnte nicht erstellt werden");
t("Create Channel", "Kanal erstellen");
t("Channel Name", "Kanalname");
t("Channel Type", "Kanaltyp");
t("Text Channel", "Textkanal");
t("Voice Channel", "Sprachkanal");
t("Video Channel", "Videokanal");
t("Stage Channel", "Buehnenkanal");
t("Auto-record sessions", "Sitzungen automatisch aufnehmen");
t("Auto-transcribe audio", "Audio automatisch transkribieren");
t("Connected to voice channel", "Mit Sprachkanal verbunden");
t("Failed to connect", "Verbindung fehlgeschlagen");
t("Disconnected", "Getrennt");
t("{{count}} people in channel", "{{count}} Personen im Kanal");
t("Connecting...", "Verbindung wird hergestellt...");
t("Join Voice", "Sprache beitreten");
t("Unknown", "Unbekannt");
t("{{count}} participants", "{{count}} Teilnehmer");
t("You're speaking", "Sie sprechen");
t("Unknown User", "Unbekannter Benutzer");
t("You", "Sie");
t("Loading video...", "Video wird geladen...");
t("Waiting for video...", "Warten auf Video...");
t("Video error", "Videofehler");
t("Get a permanent meeting link that's always available", "Erhalten Sie einen permanenten Meeting-Link, der immer verfuegbar ist");
t("Your always-available meeting space", "Ihr stets verfuegbarer Meeting-Raum");
t("Anyone with the link can join", "Jeder mit dem Link kann beitreten");
t("You must approve each participant", "Sie muessen jeden Teilnehmer genehmigen");
t("Create Your Personal Meeting Room", "Erstellen Sie Ihren persoenlichen Meeting-Raum");
t("Room Name", "Raumname");
t("My Meeting Room", "Mein Meeting-Raum");
t("Personal Meeting Room", "Persoenlicher Meeting-Raum");
t("Share this code with participants", "Teilen Sie diesen Code mit den Teilnehmern");
t("Meeting Code:", "Meeting-Code:");
t("Meeting Link", "Meeting-Link");
t("Direct link to your room", "Direkter Link zu Ihrem Raum");
t("QR Code", "QR-Code");
t("Scan to join instantly", "Scannen Sie, um sofort beizutreten");
t("Room Settings", "Raumeinstellungen");
t("Usage Statistics", "Nutzungsstatistiken");
t("Total Meetings", "Meetings gesamt");
t("Average Duration", "Durchschnittliche Dauer");

// Now process all files with the new translations
const NAMESPACES2 = [
  'common', 'admin', 'analytics', 'auth', 'candidates',
  'compliance', 'contracts', 'jobs', 'meetings', 'messages',
  'onboarding', 'partner', 'settings'
];

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

for (const ns of NAMESPACES2) {
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

  // Find all keys in DE that still have the same value as EN (untranslated)
  const allKeys = getAllKeys(de);
  let updated = 0;

  for (const keyPath of allKeys) {
    const deValue = getNestedValue(de, keyPath);
    const enValue = getNestedValue(en, keyPath);

    // Skip if DE already differs from EN (already translated)
    if (deValue !== enValue) continue;
    if (typeof deValue !== 'string') continue;
    if (deValue.trim() === '') continue;

    // Skip technical/code strings
    if (/^[a-z_]+, [a-z_]+/.test(deValue)) continue;
    if (/^\*,/.test(deValue)) continue;
    if (deValue.startsWith('@/')) continue;
    if (/^[a-z]{2}-[A-Z]{2}$/.test(deValue)) continue;

    // Check translation map
    if (translations.has(deValue)) {
      setNestedValue(de, keyPath, translations.get(deValue));
      updated++;
    }
  }

  if (updated > 0) {
    writeFileSync(deFile, JSON.stringify(de, null, 2) + '\n');
    console.log(`${ns}: Updated ${updated} translations`);
    totalUpdated += updated;
  } else {
    console.log(`${ns}: No updates needed from translation map`);
  }
}

console.log(`\nTotal translations updated: ${totalUpdated}`);
