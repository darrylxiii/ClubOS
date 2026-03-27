#!/usr/bin/env node
/**
 * Pass 5: Final comprehensive German translations for remaining untranslated keys.
 * Covers remaining common, admin, partner, candidates, meetings, settings, jobs.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');

// ── common.json translations ──────────────────────────────────────────
const commonTranslations = {
  "AI-powered task orchestration \\u2022 Auto-prioritization \\u2022 Smart scheduling": "KI-gestuetzte Aufgabenorchestrierung \\u2022 Automatische Priorisierung \\u2022 Intelligente Planung",
  "Active Deals": "Aktive Deals",
  "Additional Resources": "Zusaetzliche Ressourcen",
  "All Campaigns": "Alle Kampagnen",
  "All Caught Up!": "Alles erledigt!",
  "All caught up. No pending tasks.": "Alles erledigt. Keine ausstehenden Aufgaben.",
  "All member requests have been processed": "Alle Mitgliedsanfragen wurden bearbeitet",
  "All scorecards submitted!": "Alle Scorecards eingereicht!",
  "All sessions have been signed out": "Alle Sitzungen wurden abgemeldet",
  "All tasks are scheduled! Great job! \\ud83c\\udf89": "Alle Aufgaben sind geplant! Grossartige Arbeit!",
  "Allocate 100 points across work values, then make trade-offs in realistic scenarios. We'll compare what you say matters vs. what you actually choose.": "Verteilen Sie 100 Punkte auf Arbeitswerte und treffen Sie dann Kompromisse in realistischen Szenarien. Wir vergleichen, was Sie als wichtig angeben, mit dem, was Sie tatsaechlich waehlen.",
  "Allocate Your 100 Points": "Verteilen Sie Ihre 100 Punkte",
  "Analyzing Your Personality...": "Ihre Persoenlichkeit wird analysiert...",
  "Analyzing messages": "Nachrichten werden analysiert",
  "Application Submitted!": "Bewerbung eingereicht!",
  "Applications will appear here as candidates apply": "Bewerbungen erscheinen hier, sobald sich Kandidaten bewerben",
  "Approvals": "Genehmigungen",
  "Assessment Complete!": "Bewertung abgeschlossen!",
  "Assign To": "Zuweisen an",
  "Assign a senior strategist to this case": "Weisen Sie diesem Fall einen Senior-Strategen zu",
  "Assigned To": "Zugewiesen an",
  "Auto-scheduled by Club Pilot": "Automatisch geplant von Club Pilot",
  "Avg Deal": "Durchschnittl. Deal",
  "Avg Duration": "Durchschnittl. Dauer",
  "Avg Engagement": "Durchschnittl. Engagement",
  "Avg Response": "Durchschnittl. Antwort",
  "Avg Response Rate": "Durchschnittl. Antwortrate",
  "Awaiting Data": "Warten auf Daten",
  "Awaiting scheduling": "Terminplanung ausstehend",
  "BLOCKED": "BLOCKIERT",
  "Back to Assessments": "Zurueck zu Bewertungen",
  "Back to Pipeline": "Zurueck zur Pipeline",
  "Backend Health": "Backend-Gesundheit",
  "Based on your responses to 50 scenarios": "Basierend auf Ihren Antworten zu 50 Szenarien",
  "Before formal proceedings, parties agree to attempt resolution through good-faith discussions.": "Vor formellen Verfahren vereinbaren die Parteien, eine Loesung durch Gespraeche in gutem Glauben zu versuchen.",
  "Blind Spot Detector": "Blinder-Fleck-Detektor",
  "Blind Spots": "Blinde Flecken",
  "Blocked By": "Blockiert durch",
  "Blocked By (Select blocking tasks)": "Blockiert durch (Blockierende Aufgaben auswaehlen)",
  "Blocked Domains": "Blockierte Domains",
  "Blocked Emails": "Blockierte E-Mails",
  "Blocked IPs": "Blockierte IPs",
  "Booking progress": "Buchungsfortschritt",
  "Bounced": "Zurueckgewiesen",
  "Bounces": "Zurueckweisungen",
  "Brief": "Kurzinfo",
  "Brightness": "Helligkeit",
  "Build and manage automated workflows for your CRM": "Erstellen und verwalten Sie automatisierte Workflows fuer Ihr CRM",
  "Campaign": "Kampagne",
  "Campaign Progress": "Kampagnenfortschritt",
  "Campaigns": "Kampagnen",
  "Candidate, Partner, Strategist, and Admin accounts have different rights, obligations, and features.": "Kandidaten-, Partner-, Strategen- und Admin-Konten haben unterschiedliche Rechte, Pflichten und Funktionen.",
  "Chat Preview": "Chat-Vorschau",
  "Check your email for next steps": "Pruefen Sie Ihre E-Mail fuer die naechsten Schritte",
  "Choose 'Without Media'": "Waehlen Sie 'Ohne Medien'",
  "Choose Your Path": "Waehlen Sie Ihren Weg",
  "Choose a file": "Datei auswaehlen",
  "Clear All": "Alles loeschen",
  "Click the star icon on any page to add it to your favorites": "Klicken Sie auf das Stern-Symbol auf jeder Seite, um sie zu Ihren Favoriten hinzuzufuegen",
  "Club AI Analytics": "Club AI Analysen",
  "ClubAI Voice": "ClubAI Stimme",
  "Code expired": "Code abgelaufen",
  "Communication Style": "Kommunikationsstil",
  "Company Setup in Progress": "Unternehmenseinrichtung laeuft",
  "Company information not found. You can invite colleagues from settings later.": "Unternehmensinformationen nicht gefunden. Sie koennen spaeter Kollegen ueber die Einstellungen einladen.",
  "Compare how you see yourself with objective behavioral measurements to uncover blind spots and hidden strengths.": "Vergleichen Sie Ihr Selbstbild mit objektiven Verhaltensmessungen, um blinde Flecken und verborgene Staerken aufzudecken.",
  "Complete history of all changes to prospect records": "Vollstaendige Historie aller Aenderungen an Interessenten-Datensaetzen",
  "Complete overview of all objectives": "Vollstaendige Uebersicht aller Ziele",
  "Complete your account setup to get started with your partner portal": "Schliessen Sie Ihre Kontoeinrichtung ab, um mit Ihrem Partner-Portal zu beginnen",
  "Completion Rate": "Abschlussrate",
  "Confidence in Rating": "Bewertungszuversicht",
  "Configure scoring rules and view score history for your prospects": "Konfigurieren Sie Bewertungsregeln und sehen Sie die Score-Historie Ihrer Interessenten",
  "Configure your CRM preferences and manage data": "Konfigurieren Sie Ihre CRM-Einstellungen und verwalten Sie Daten",
  "Connect external tools and enrich your prospect data": "Verbinden Sie externe Tools und reichern Sie Ihre Interessenten-Daten an",
  "Contact Information": "Kontaktinformationen",
  "Contact Privacy Team": "Datenschutzteam kontaktieren",
  "Continue to Scenarios": "Weiter zu den Szenarien",
  "Continue to Trade-offs": "Weiter zu den Kompromissen",
  "Contrast": "Kontrast",
  "Cookie Policy": "Cookie-Richtlinie",
  "Create, edit, and import templates for your team": "Vorlagen fuer Ihr Team erstellen, bearbeiten und importieren",
  "Culture Fit Scores": "Kulturpassungs-Scores",
  "Current stage breakdown": "Aufschluesselung der aktuellen Phase",
  "Currently": "Aktuell",
  "Currently using {{format}} format. Click to switch.": "Aktuell im {{format}}-Format. Klicken zum Wechseln.",
  "Custom Adjustments": "Individuelle Anpassungen",
  "Data Processing Agreement": "Auftragsverarbeitungsvertrag",
  "Define a new project objective with goals, timeline, and owners.": "Definieren Sie ein neues Projektziel mit Zielen, Zeitplan und Verantwortlichen.",
  "Define what success looks like for this objective...": "Definieren Sie, wie Erfolg fuer dieses Ziel aussieht...",
  "Delete Prospect?": "Interessenten loeschen?",
  "Describe the objective and its context...": "Beschreiben Sie das Ziel und seinen Kontext...",
  "Describe the objective...": "Beschreiben Sie das Ziel...",
  "Describe the task...": "Beschreiben Sie die Aufgabe...",
  "Detailed fee terms are outlined in separate commercial agreements signed between TQC and each partner.": "Detaillierte Gebuehrenbedingungen sind in separaten Handelsvereinbarungen zwischen TQC und jedem Partner festgelegt.",
  "Detected {{date}}": "Erkannt am {{date}}",
  "Detractors": "Kritiker",
  "Didn't receive the code?": "Code nicht erhalten?",
  "Dimension Comparison": "Dimensionsvergleich",
  "Discover the gap between self-perception and reality": "Entdecken Sie die Kluft zwischen Selbstwahrnehmung und Realitaet",
  "Discover what truly motivates you at work": "Entdecken Sie, was Sie bei der Arbeit wirklich motiviert",
  "Distribute points to reflect what truly matters to you in your career": "Verteilen Sie Punkte, um widerzuspiegeln, was Ihnen in Ihrer Karriere wirklich wichtig ist",
  "Domain": "Domain",
  "Don't have an invite? Join the waitlist": "Keine Einladung? Tragen Sie sich in die Warteliste ein",
  "Drag objectives to change their status": "Ziehen Sie Ziele, um ihren Status zu aendern",
  "Due Today": "Heute faellig",
  "ELITE OUTCOMES": "ELITE-ERGEBNISSE",
  "ENTER ACCESS CODE": "ZUGANGSCODE EINGEBEN",
  "Earn rewards for referring qualified candidates who successfully get hired through The Quantum Club.": "Verdienen Sie Praemien fuer die Empfehlung qualifizierter Kandidaten, die ueber The Quantum Club eingestellt werden.",
  "Earned": "Verdient",
  "Editing this page": "Diese Seite bearbeiten",
  "Email *": "E-Mail *",
  "Email Sent": "E-Mail gesendet",
  "Email already added.": "E-Mail bereits hinzugefuegt.",
  "End Session": "Sitzung beenden",
  "Error validating invite code. Please try again.": "Fehler bei der Validierung des Einladungscodes. Bitte versuchen Sie es erneut.",
  "Errors": "Fehler",
  "Escalate to Strategist": "An Strategen eskalieren",
  "Execute Recommended Actions": "Empfohlene Aktionen ausfuehren",
  "Executed {{count}} recommended actions": "{{count}} empfohlene Aktionen ausgefuehrt",
  "Expected Closings": "Erwartete Abschluesse",
  "Field Updated": "Feld aktualisiert",
  "Finish Early": "Fruehzeitig beenden",
  "Focus View": "Fokusansicht",
  "For sensitive or confidential searches, partners must sign an NDA before accessing candidate dossiers.": "Fuer sensible oder vertrauliche Suchen muessen Partner eine Vertraulichkeitsvereinbarung unterzeichnen, bevor sie auf Kandidaten-Dossiers zugreifen koennen.",
  "From Instantly": "Von Instantly",
  "Full Name *": "Vollstaendiger Name *",
  "GDPR Compliant": "DSGVO-konform",
  "Goals & Success Criteria": "Ziele & Erfolgskriterien",
  "Got It": "Verstanden",
  "Got it, let's go! \\ud83d\\ude80": "Verstanden, los geht's!",
  "Hard Deadline": "Harte Frist",
  "Health Score": "Gesundheits-Score",
  "Healthy Relationships": "Gesunde Beziehungen",
  "Help us understand your goals": "Helfen Sie uns, Ihre Ziele zu verstehen",
  "Hidden Strengths": "Verborgene Staerken",
  "Historically popular time with high attendance. Powered by QUIN.": "Historisch beliebte Zeit mit hoher Teilnahme. Unterstuetzt von QUIN.",
  "Host timezone": "Gastgeber-Zeitzone",
  "Host's Time": "Zeit des Gastgebers",
  "How to Play": "Spielanleitung",
  "How to export from WhatsApp:": "So exportieren Sie aus WhatsApp:",
  "How well your stated values match your choices": "Wie gut Ihre angegebenen Werte mit Ihren Entscheidungen uebereinstimmen",
  "How would you rate your abilities in these areas? Be honest!": "Wie wuerden Sie Ihre Faehigkeiten in diesen Bereichen bewerten? Seien Sie ehrlich!",
  "I'm Ready \\u2014 Start Now": "Ich bin bereit \\u2014 Jetzt starten",
  "If any provision is found invalid or unenforceable, the remainder of these Terms remains in full effect.": "Sollte eine Bestimmung ungueltig oder nicht durchsetzbar sein, bleibt der Rest dieser Bedingungen vollstaendig wirksam.",
  "If resolution fails, disputes proceed to the competent courts in Amsterdam, Netherlands.": "Wenn keine Loesung erzielt wird, werden Streitigkeiten vor den zustaendigen Gerichten in Amsterdam, Niederlande, verhandelt.",
  "Import Complete!": "Import abgeschlossen!",
  "Import Failed": "Import fehlgeschlagen",
  "Import WhatsApp Chat": "WhatsApp-Chat importieren",
  "Import in progress": "Import laeuft",
  "Inbound": "Eingehend",
  "Inconsistencies Worth Noting": "Bemerkenswerte Inkonsistenzen",
  "Instantly": "Instantly",
  "Instantly Integration": "Instantly-Integration",
  "Interviews are automatically scheduled once candidates are shortlisted for your roles": "Interviews werden automatisch geplant, sobald Kandidaten fuer Ihre Stellen in die engere Auswahl kommen",
  "Invalid access code. Request an invite to join.": "Ungueltiger Zugangscode. Fordern Sie eine Einladung an.",
  "Invite Reviewed": "Einladung geprueft",
  "Invite Team Member": "Teammitglied einladen",
  "Jobs that match your personality": "Jobs, die zu Ihrer Persoenlichkeit passen",
  "Join The Quantum Club": "The Quantum Club beitreten",
  "Just Getting Started": "Gerade erst angefangen",
  "Keep your suppression list in sync with Instantly's block list": "Halten Sie Ihre Sperrliste mit der Blockliste von Instantly synchron",
  "LIKE IT": "GEFAELLT MIR",
  "LOVE IT!": "LIEBE ES!",
  "Language": "Sprache",
  "Latest candidate applications": "Neueste Kandidaten-Bewerbungen",
  "Legal Center": "Rechtszentrum",
  "Link Expired": "Link abgelaufen",
  "LinkedIn Profile": "LinkedIn-Profil",
  "LinkedIn Profile (Optional)": "LinkedIn-Profil (Optional)",
  "Live": "Live",
  "Live  Now": "Jetzt live",
  "Live Preview": "Live-Vorschau",
  "Live now": "Jetzt live",
  "Load more ({{count}} remaining)": "Mehr laden ({{count}} verbleibend)",
  "MEMBER TESTIMONIALS": "MITGLIEDER-TESTIMONIALS",
  "Manual": "Manuell",
  "Messages, emails, and meetings will appear here": "Nachrichten, E-Mails und Meetings erscheinen hier",
  "Mic": "Mikrofon",
  "Milestone Type": "Meilensteintyp",
  "Month": "Monat",
  "NOT FOR ME": "NICHT FUER MICH",
  "Needs approval": "Genehmigung erforderlich",
  "New members awaiting review": "Neue Mitglieder warten auf Pruefung",
  "No active deals in pipeline": "Keine aktiven Deals in der Pipeline",
  "No activity recorded yet.": "Noch keine Aktivitaet aufgezeichnet.",
  "No audit events today": "Keine Audit-Ereignisse heute",
  "No interviews scheduled for today": "Keine Interviews fuer heute geplant",
  "No pending approvals": "Keine ausstehenden Genehmigungen",
  "No pending tasks": "Keine ausstehenden Aufgaben",
  "No recent activity": "Keine aktuelle Aktivitaet",
  "No recent pages": "Keine aktuellen Seiten",
  "No scheduled tasks. Run Club Pilot to auto-schedule your tasks.": "Keine geplanten Aufgaben. Starten Sie Club Pilot, um Ihre Aufgaben automatisch zu planen.",
  "Note Added": "Notiz hinzugefuegt",
  "Notes / Response": "Notizen / Antwort",
  "Notify assigned strategist about this pattern": "Zugewiesenen Strategen ueber dieses Muster benachrichtigen",
  "ONGOING": "LAUFEND",
  "OS Notes": "OS-Notizen",
  "Objective Owners": "Zielverantwortliche",
  "Objective Title *": "Zieltitel *",
  "Objective status updated": "Zielstatus aktualisiert",
  "Objectives Board": "Ziele-Board",
  "Objectives List": "Zieleliste",
  "On Target": "Im Ziel",
  "On Track": "Auf Kurs",
  "Open Club Pilot": "Club Pilot oeffnen",
  "Open Rate": "Oeffnungsrate",
  "Open the WhatsApp chat you want to export": "Oeffnen Sie den WhatsApp-Chat, den Sie exportieren moechten",
  "Option A": "Option A",
  "Option B": "Option B",
  "Our failure to enforce any right or provision does not constitute a waiver of that right.": "Unsere Nichteinhaltung von Rechten oder Bestimmungen stellt keinen Verzicht auf dieses Recht dar.",
  "Outbound": "Ausgehend",
  "Overall Fit Score": "Gesamtpassungs-Score",
  "Overdue": "Ueberfaellig",
  "Owner Changed": "Eigentuemer geaendert",
  "PLATFORM FEATURES": "PLATTFORM-FUNKTIONEN",
  "Pages you visit will appear here for quick access": "Besuchte Seiten erscheinen hier fuer schnellen Zugriff",
  "Paid Out": "Ausbezahlt",
  "Parsing messages and resolving participants...": "Nachrichten werden analysiert und Teilnehmer aufgeloest...",
  "Participants": "Teilnehmer",
  "Parties may agree to binding arbitration via the Dutch Arbitration Institute (Nederlands Arbitrage Instituut).": "Die Parteien koennen verbindliche Schiedsgerichtsbarkeit ueber das Nederlands Arbitrage Instituut vereinbaren.",
  "Partner Engagement": "Partner-Engagement",
  "Passives": "Passive",
  "Password Changed": "Passwort geaendert",
  "Payment": "Zahlung",
  "Pending Approvals": "Ausstehende Genehmigungen",
  "Pending Sync": "Synchronisierung ausstehend",
  "Pipeline Value": "Pipeline-Wert",
  "Pipeline performance, team metrics, and outreach copy intelligence": "Pipeline-Leistung, Team-Metriken und Outreach-Kopie-Intelligenz",
  "Placement Success Rate": "Vermittlungserfolgsrate",
  "Points Allocated": "Vergebene Punkte",
  "Popular": "Beliebt",
  "Post a role to see applications, interviews, and updates here": "Veroeffentlichen Sie eine Stelle, um hier Bewerbungen, Interviews und Updates zu sehen",
  "Preset Filters": "Voreingestellte Filter",
  "Pressure Cooker Assessment": "Druckkocher-Bewertung",
  "Preview of the first few messages": "Vorschau der ersten Nachrichten",
  "Private & Secure": "Privat & Sicher",
  "Processing": "Verarbeitung",
  "Processing Chat": "Chat wird verarbeitet",
  "Professional": "Professionell",
  "Projected": "Projiziert",
  "Projected Month-End": "Projiziertes Monatsende",
  "Promoters": "Foerderer",
  "Prospect not found": "Interessent nicht gefunden",
  "Quick Task": "Schnellaufgabe",
  "READY FOR ACTION": "BEREIT ZUM HANDELN",
  "Rate Yourself": "Bewerten Sie sich selbst",
  "Reason": "Grund",
  "Recent platform activity": "Aktuelle Plattformaktivitaet",
  "Recommendations": "Empfehlungen",
  "Recommendations will appear when you have active job postings": "Empfehlungen erscheinen, wenn Sie aktive Stellenanzeigen haben",
  "Recommended Roles": "Empfohlene Stellen",
  "Recommended before litigation. We are willing to engage in mediation via a neutral third party.": "Empfohlen vor Rechtsstreitigkeiten. Wir sind bereit, eine Mediation durch einen neutralen Dritten einzugehen.",
  "Referral Code (Optional)": "Empfehlungscode (Optional)",
  "Referral Network": "Empfehlungsnetzwerk",
  "Referral Program Terms": "Empfehlungsprogramm-Bedingungen",
  "Reply Rate": "Antwortrate",
  "Response Tone": "Antwortton",
  "Results downloaded!": "Ergebnisse heruntergeladen!",
  "Results sent to your email!": "Ergebnisse an Ihre E-Mail gesendet!",
  "Revenue &": "Umsatz &",
  "Revenue Share": "Umsatzbeteiligung",
  "Saturation": "Saettigung",
  "Save the .txt file and upload it here": "Speichern Sie die .txt-Datei und laden Sie sie hier hoch",
  "Schedule Follow-up": "Nachfass planen",
  "Scheduled Today": "Heute geplant",
  "Security Policy": "Sicherheitsrichtlinie",
  "See details": "Details anzeigen",
  "Select Company": "Unternehmen auswaehlen",
  "Select Time": "Uhrzeit auswaehlen",
  "Select company": "Unternehmen auswaehlen",
  "Select the category that best describes you": "Waehlen Sie die Kategorie, die Sie am besten beschreibt",
  "Select...": "Auswaehlen...",
  "Send Alert": "Benachrichtigung senden",
  "Send Invitation": "Einladung senden",
  "Send an invitation to join your team": "Einladung zum Beitritt zu Ihrem Team senden",
  "Sensitive": "Sensibel",
  "Set a reminder for future outreach": "Erinnerung fuer kuenftige Kontaktaufnahme setzen",
  "Set up an agency or collaborative team": "Agentur oder kollaboratives Team einrichten",
  "Share link copied to clipboard!": "Teilen-Link in die Zwischenablage kopiert!",
  "Share this code to earn priority status and rewards!": "Teilen Sie diesen Code, um Prioritaetsstatus und Praemien zu erhalten!",
  "Show AI analysis": "KI-Analyse anzeigen",
  "Show in host's timezone": "In Gastgeber-Zeitzone anzeigen",
  "Show in my timezone": "In meiner Zeitzone anzeigen",
  "Show less": "Weniger anzeigen",
  "Skills you may be overestimating": "Faehigkeiten, die Sie moeglicherweise ueberschaetzen",
  "Skills you're undervaluing": "Faehigkeiten, die Sie unterschaetzen",
  "Skip for now": "Erstmal ueberspringen",
  "Something went wrong. Please try again.": "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
  "Sourced": "Beschafft",
  "Speaking": "Spricht",
  "Stable": "Stabil",
  "Stage Changed": "Phase geaendert",
  "Start Assessment": "Bewertung starten",
  "Start Date": "Startdatum",
  "Start Learning \\u2192": "Jetzt lernen \\u2192",
  "Start a timer linked to your AI-prioritized tasks": "Starten Sie einen Timer fuer Ihre KI-priorisierten Aufgaben",
  "Start speaking to interact with ClubAI": "Sprechen Sie, um mit ClubAI zu interagieren",
  "Start with a blank page or choose from our templates": "Beginnen Sie mit einer leeren Seite oder waehlen Sie eine Vorlage",
  "Sub-tasks delegated between agents": "Unteraufgaben zwischen Agenten delegiert",
  "Subscription Activated!": "Abonnement aktiviert!",
  "Successful": "Erfolgreich",
  "Successfully executed {{action}}": "{{action}} erfolgreich ausgefuehrt",
  "Swipe through 50 scenarios to discover your work personality": "Wischen Sie durch 50 Szenarien, um Ihre Arbeitspersoenlichkeit zu entdecken",
  "Switch to {{format}} format": "Zum {{format}}-Format wechseln",
  "THE PLATFORM IS PROVIDED 'AS IS' WITHOUT WARRANTIES OF ANY KIND.": "DIE PLATTFORM WIRD OHNE GEWAEHRLEISTUNGEN JEGLICHER ART BEREITGESTELLT.",
  "Tags": "Schlagwoerter",
  "Talk to ClubAI": "Mit ClubAI sprechen",
  "Task Inbox": "Aufgaben-Posteingang",
  "Task Title *": "Aufgabentitel *",
  "Task created": "Aufgabe erstellt",
  "Task status updated": "Aufgabenstatus aktualisiert",
  "Tasks Blocked By This Objective:": "Aufgaben blockiert durch dieses Ziel:",
  "Tasks Blocking This Objective:": "Aufgaben, die dieses Ziel blockieren:",
  "Team Capacity": "Teamkapazitaet",
  "Team Management": "Teamverwaltung",
  "Team Name": "Teamname",
  "Team Online": "Team online",
  "Tell Us More": "Erzaehlen Sie uns mehr",
  "Template Management": "Vorlagenverwaltung",
  "Thank you for subscribing to The Quantum Club. Your subscription is now active.": "Vielen Dank fuer Ihr Abonnement bei The Quantum Club. Ihr Abonnement ist jetzt aktiv.",
  "These Terms are provided in English. If translated, the English version prevails in case of conflict.": "Diese Bedingungen werden auf Englisch bereitgestellt. Bei Uebersetzungen ist im Konfliktfall die englische Version massgeblich.",
  "They'll help guide your career journey": "Sie werden Ihnen bei Ihrer Karrierereise helfen",
  "This may take a minute for large conversations": "Dies kann bei grossen Gespraechen eine Minute dauern",
  "Timezone Difference: {{hours}} hours": "Zeitzonenunterschied: {{hours}} Stunden",
  "Title *": "Titel *",
  "Today's Progress": "Heutiger Fortschritt",
  "Too many failed attempts": "Zu viele fehlgeschlagene Versuche",
  "Top Performers": "Top-Performer",
  "Top candidates matching your open roles": "Top-Kandidaten passend zu Ihren offenen Stellen",
  "Total": "Gesamt",
  "Total Active": "Gesamt aktiv",
  "Total Entries": "Eintraege gesamt",
  "Track, manage, and approve work hours across your team": "Arbeitszeiten im Team verfolgen, verwalten und genehmigen",
  "Unassigned": "Nicht zugewiesen",
  "Unified Activity": "Vereinte Aktivitaet",
  "Unknown date": "Unbekanntes Datum",
  "Unsubscribed": "Abgemeldet",
  "Unsure": "Unsicher",
  "Upload File": "Datei hochladen",
  "Upload WhatsApp Export": "WhatsApp-Export hochladen",
  "Upload a WhatsApp chat export to track company interactions": "Laden Sie einen WhatsApp-Chat-Export hoch, um Unternehmensinteraktionen zu verfolgen",
  "Use template": "Vorlage verwenden",
  "User Satisfaction": "Benutzerzufriedenheit",
  "Values Poker": "Werte-Poker",
  "Very Sure": "Sehr sicher",
  "Viewing this page": "Diese Seite wird angesehen",
  "Voice-powered assistant": "Sprachgesteuerter Assistent",
  "We expressly disclaim:": "Wir schliessen ausdruecklich aus:",
  "We strive for accuracy and reliability but do not guarantee outcomes.": "Wir streben nach Genauigkeit und Zuverlaessigkeit, garantieren aber keine Ergebnisse.",
  "We will make reasonable efforts to restore services as quickly as possible.": "Wir werden angemessene Anstrengungen unternehmen, Dienste so schnell wie moeglich wiederherzustellen.",
  "We'll review your application and get back to you within 48 hours. Check your email for next steps.": "Wir werden Ihre Bewerbung pruefen und uns innerhalb von 48 Stunden bei Ihnen melden. Pruefen Sie Ihre E-Mail fuer die naechsten Schritte.",
  "Week": "Woche",
  "Weighted": "Gewichtet",
  "Weighted Pipeline": "Gewichtete Pipeline",
  "Weighted values use stage probability from CRM settings": "Gewichtete Werte verwenden die Phasenwahrscheinlichkeit aus den CRM-Einstellungen",
  "What does your team specialize in?": "Worauf ist Ihr Team spezialisiert?",
  "What needs to be done?": "Was muss erledigt werden?",
  "What's next?": "Was kommt als Naechstes?",
  "Which company is this conversation about?": "Um welches Unternehmen geht es in diesem Gespraech?",
  "Why is this being suppressed?": "Warum wird dies unterdrueckt?",
  "Workflow executed": "Workflow ausgefuehrt",
  "Workflow failed": "Workflow fehlgeschlagen",
  "Year": "Jahr",
  "You agree NOT to:": "Sie stimmen zu, NICHT:",
  "You have no pending activities for today. Great job!": "Sie haben heute keine ausstehenden Aktivitaeten. Grossartige Arbeit!",
  "You have this": "Sie haben dies",
  "You retain ownership of your CV, profile data, messages, and uploaded content.": "Sie behalten das Eigentum an Ihrem Lebenslauf, Profildaten, Nachrichten und hochgeladenen Inhalten.",
  "Your Details": "Ihre Angaben",
  "Your Hiring Setup": "Ihre Einstellungskonfiguration",
  "Your Personality Profile": "Ihr Persoenlichkeitsprofil",
  "Your Rating": "Ihre Bewertung",
  "Your Referral Code": "Ihr Empfehlungscode",
  "Your Self-Awareness Profile": "Ihr Selbstwahrnehmungsprofil",
  "Your Time": "Ihre Zeit",
  "Your Top Traits": "Ihre Top-Eigenschaften",
  "Your Top Values": "Ihre Top-Werte",
  "Your Values Profile": "Ihr Werteprofil",
  "Your WhatsApp chat has been successfully imported": "Ihr WhatsApp-Chat wurde erfolgreich importiert",
  "Your activities for today": "Ihre Aktivitaeten fuer heute",
  "Your approach to delegation and task communication": "Ihr Ansatz zur Delegation und Aufgabenkommunikation",
  "Your dedicated talent partner at The Quantum Club": "Ihr dedizierter Talent-Partner bei The Quantum Club",
  "Your hiring pipeline starts here": "Ihre Einstellungs-Pipeline beginnt hier",
  "Your personal workspace for notes, docs, and more": "Ihr persoenlicher Arbeitsbereich fuer Notizen, Dokumente und mehr",
  "Your rights and our commitments, clearly documented. We believe in transparency and want you to understand how we operate.": "Ihre Rechte und unsere Verpflichtungen, klar dokumentiert. Wir glauben an Transparenz und moechten, dass Sie verstehen, wie wir arbeiten.",
  "Your strategist is finalising your company profile. You will see your dashboard here shortly.": "Ihr Stratege stellt Ihr Unternehmensprofil fertig. Sie werden Ihr Dashboard hier in Kuerze sehen.",
  "Your strongest characteristics": "Ihre staerksten Eigenschaften",
  "Your timezone": "Ihre Zeitzone",
  "Youre Fully Activated": "Sie sind vollstaendig aktiviert",
  "via {{source}}": "via {{source}}",
  "{{confidence}}% confidence": "{{confidence}}% Zuversicht",
  "{{count}} events": "{{count}} Ereignisse",
  "{{count}} others here": "{{count}} weitere hier",
  "Warnings": "Warnungen",
  "Details": "Details",
  "Neutral": "Neutral",
  "Basic Information": "Grundlegende Informationen",
  "Innovation": "Innovation",
};

// ── admin.json translations (remaining 19) ────────────────────────────
const adminTranslations = {
  "Avg Sentiment": "Durchschnittl. Stimmung",
  "Banner": "Banner",
  "Companies": "Unternehmen",
  "Departments": "Abteilungen",
  "Global": "Global",
  "Leaderboard": "Bestenliste",
  "Modal": "Modal",
  "Normal": "Normal",
  "Not Started": "Nicht gestartet",
  "Onboarding": "Onboarding",
  "Reviews": "Bewertungen",
  "Rule of 40": "Rule of 40",
  "SLA": "SLA",
  "System": "System",
  "Toast": "Toast",
  "Webhook": "Webhook",
};

// ── partner.json translations (remaining) ────────────────────────────
const partnerTranslations = {
  "A": "A",
  "Behavioral": "Verhaltensbasiert",
  "Compensation": "Verguetung",
  "Consider": "In Betracht ziehen",
  "Convert": "Konvertieren",
  "Description *": "Beschreibung *",
  "Difficulty": "Schwierigkeit",
  "Easy": "Einfach",
  "Feedback": "Feedback",
  "Hard": "Schwer",
  "Interviewers": "Interviewer",
  "Justification": "Begruendung",
  "Name": "Name",
  "Onsite": "Vor Ort",
  "Pass": "Bestanden",
  "Recruiter": "Recruiter",
  "Remaining": "Verbleibend",
  "Submitting": "Wird eingereicht",
  "T": "T",
};

// ── candidates.json translations ──────────────────────────────────────
const candidatesTranslations = {
  "Dimension": "Dimension",
  "Name": "Name",
};

// ── meetings.json translations ────────────────────────────────────────
const meetingsTranslations = {
  "Neutral": "Neutral",
};

// ── settings.json translations ────────────────────────────────────────
const settingsTranslations = {
  "Round Robin (Team)": "Round Robin (Team)",
  "Workflows": "Workflows",
};

// ── jobs.json translations ────────────────────────────────────────────
const jobsTranslations = {
  "Details": "Details",
};

// ── Helper functions ──────────────────────────────────────────────────
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

function applyTranslations(nsName, translations) {
  const deFile = join(BASE, 'de', `${nsName}.json`);
  const enFile = join(BASE, 'en', `${nsName}.json`);
  const de = JSON.parse(readFileSync(deFile, 'utf8'));
  const en = JSON.parse(readFileSync(enFile, 'utf8'));

  let updated = 0;
  const allDeKeys = getAllKeys(de);

  for (const keyPath of allDeKeys) {
    const deValue = getNestedValue(de, keyPath);
    const enValue = getNestedValue(en, keyPath);

    if (typeof deValue !== 'string') continue;
    if (deValue !== enValue) continue;

    const translation = translations[deValue];
    if (translation && translation !== deValue) {
      setNestedValue(de, keyPath, translation);
      updated++;
    }
  }

  writeFileSync(deFile, JSON.stringify(de, null, 2) + '\n');
  console.log(`${nsName}: Updated ${updated} translations`);
  return updated;
}

let total = 0;
total += applyTranslations('common', commonTranslations);
total += applyTranslations('admin', adminTranslations);
total += applyTranslations('partner', partnerTranslations);
total += applyTranslations('candidates', candidatesTranslations);
total += applyTranslations('meetings', meetingsTranslations);
total += applyTranslations('settings', settingsTranslations);
total += applyTranslations('jobs', jobsTranslations);

console.log(`\nTotal updated: ${total}`);
