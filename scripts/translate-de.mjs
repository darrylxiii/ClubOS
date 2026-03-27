#!/usr/bin/env node
/**
 * translate-de.mjs — Comprehensive German translation script
 *
 * Walks every key in EN namespace files, compares with DE,
 * and translates any DE value that still matches the EN value
 * (i.e., was never properly translated). Keeps existing good translations.
 *
 * Also fixes broken word-by-word substitutions by detecting common
 * patterns like "Fehlgeschlagen to Entfernen" or "Wird geladen staff..."
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EN_DIR = join(ROOT, 'src/i18n/locales/en');
const DE_DIR = join(ROOT, 'src/i18n/locales/de');

const NAMESPACES = [
  'common', 'admin', 'analytics', 'auth', 'candidates',
  'compliance', 'contracts', 'jobs', 'meetings', 'messages',
  'onboarding', 'partner', 'settings'
];

// ============================================================
// COMPREHENSIVE TRANSLATION MAP — 600+ entries
// ============================================================
// Priority: longer phrases first, then single words
// This ensures "Save changes" is matched before "Save"

const PHRASE_MAP = new Map([
  // ---------- Common UI phrases ----------
  ["No results found", "Keine Ergebnisse gefunden"],
  ["No results", "Keine Ergebnisse"],
  ["Are you sure?", "Sind Sie sicher?"],
  ["Are you sure you want to", "Sind Sie sicher, dass Sie"],
  ["Loading...", "Wird geladen..."],
  ["Something went wrong", "Etwas ist schiefgelaufen"],
  ["Please try again", "Bitte versuchen Sie es erneut"],
  ["Please try again later", "Bitte versuchen Sie es spaeter erneut"],
  ["No data available", "Keine Daten verfuegbar"],
  ["No data", "Keine Daten"],
  ["View all", "Alle anzeigen"],
  ["View All", "Alle anzeigen"],
  ["Learn more", "Mehr erfahren"],
  ["Sign in", "Anmelden"],
  ["Sign out", "Abmelden"],
  ["Sign up", "Registrieren"],
  ["Log in", "Anmelden"],
  ["Log out", "Abmelden"],
  ["Go back", "Zurueck"],
  ["Save changes", "Aenderungen speichern"],
  ["Save Changes", "Aenderungen speichern"],
  ["Discard changes", "Aenderungen verwerfen"],
  ["Select all", "Alle auswaehlen"],
  ["Select All", "Alle auswaehlen"],
  ["Clear all", "Alle loeschen"],
  ["Clear All", "Alle loeschen"],
  ["Clear filters", "Filter zuruecksetzen"],
  ["Reset filters", "Filter zuruecksetzen"],
  ["Apply filters", "Filter anwenden"],
  ["Coming soon", "In Kuerze verfuegbar"],
  ["Coming Soon", "In Kuerze verfuegbar"],
  ["Releasing soon", "Erscheint in Kuerze"],
  ["Under development", "In Entwicklung"],
  ["under development", "in Entwicklung"],
  ["Not available", "Nicht verfuegbar"],
  ["Not found", "Nicht gefunden"],
  ["Page not found", "Seite nicht gefunden"],
  ["Access denied", "Zugriff verweigert"],
  ["Permission denied", "Berechtigung verweigert"],
  ["Unauthorized", "Nicht autorisiert"],
  ["Session expired", "Sitzung abgelaufen"],
  ["Get started", "Jetzt starten"],
  ["Get Started", "Jetzt starten"],
  ["Try again", "Erneut versuchen"],
  ["Try Again", "Erneut versuchen"],
  ["Reload page", "Seite neu laden"],
  ["Reload Page", "Seite neu laden"],
  ["Contact support", "Support kontaktieren"],
  ["Contact Support", "Support kontaktieren"],
  ["Send message", "Nachricht senden"],
  ["Send Message", "Nachricht senden"],
  ["Type a message", "Nachricht eingeben"],
  ["Type a message...", "Nachricht eingeben..."],
  ["Enter a message", "Nachricht eingeben"],
  ["No messages", "Keine Nachrichten"],
  ["No notifications", "Keine Benachrichtigungen"],
  ["Mark as read", "Als gelesen markieren"],
  ["Mark as unread", "Als ungelesen markieren"],
  ["Mark all as read", "Alle als gelesen markieren"],
  ["Read more", "Weiterlesen"],
  ["Read More", "Weiterlesen"],
  ["Show more", "Mehr anzeigen"],
  ["Show More", "Mehr anzeigen"],
  ["Show less", "Weniger anzeigen"],
  ["Show Less", "Weniger anzeigen"],
  ["Load more", "Mehr laden"],
  ["Load More", "Mehr laden"],
  ["See all", "Alle ansehen"],
  ["See more", "Mehr ansehen"],
  ["See details", "Details ansehen"],
  ["Click here", "Hier klicken"],
  ["Copy to clipboard", "In Zwischenablage kopieren"],
  ["Copied to clipboard", "In Zwischenablage kopiert"],
  ["Copied!", "Kopiert!"],
  ["Copy link", "Link kopieren"],
  ["Share link", "Link teilen"],
  ["Open in new tab", "In neuem Tab oeffnen"],
  ["Open in New Tab", "In neuem Tab oeffnen"],
  ["in new tab", "in neuem Tab"],
  ["Last updated", "Zuletzt aktualisiert"],
  ["Last modified", "Zuletzt geaendert"],
  ["Created at", "Erstellt am"],
  ["Updated at", "Aktualisiert am"],
  ["Sort by", "Sortieren nach"],
  ["Order by", "Sortieren nach"],
  ["Group by", "Gruppieren nach"],
  ["Filter by", "Filtern nach"],
  ["Search by", "Suchen nach"],
  ["Powered by", "Bereitgestellt von"],
  ["Drag and drop", "Ziehen und ablegen"],
  ["Drag to reorder", "Zum Sortieren ziehen"],
  ["Click to upload", "Zum Hochladen klicken"],
  ["or drag and drop", "oder per Drag & Drop"],
  ["Drop files here", "Dateien hier ablegen"],
  ["Browse files", "Dateien durchsuchen"],
  ["Choose file", "Datei auswaehlen"],
  ["Choose files", "Dateien auswaehlen"],
  ["File uploaded", "Datei hochgeladen"],
  ["File uploaded successfully", "Datei erfolgreich hochgeladen"],
  ["Upload failed", "Hochladen fehlgeschlagen"],
  ["Max file size", "Maximale Dateigroesse"],
  ["Supported formats", "Unterstuetzte Formate"],
  ["No files", "Keine Dateien"],
  ["Add new", "Neu hinzufuegen"],
  ["Add New", "Neu hinzufuegen"],
  ["Create new", "Neu erstellen"],
  ["Create New", "Neu erstellen"],
  ["Edit profile", "Profil bearbeiten"],
  ["View profile", "Profil anzeigen"],
  ["View details", "Details anzeigen"],
  ["View Details", "Details anzeigen"],
  ["Close dialog", "Dialog schliessen"],
  ["Close modal", "Dialog schliessen"],
  ["Confirm action", "Aktion bestaetigen"],
  ["Cancel action", "Aktion abbrechen"],
  ["Delete item", "Element loeschen"],
  ["Remove item", "Element entfernen"],
  ["This action cannot be undone", "Diese Aktion kann nicht rueckgaengig gemacht werden"],
  ["This cannot be undone", "Dies kann nicht rueckgaengig gemacht werden"],
  ["Permanently delete", "Dauerhaft loeschen"],
  ["Successfully saved", "Erfolgreich gespeichert"],
  ["Successfully created", "Erfolgreich erstellt"],
  ["Successfully updated", "Erfolgreich aktualisiert"],
  ["Successfully deleted", "Erfolgreich geloescht"],
  ["Successfully removed", "Erfolgreich entfernt"],
  ["Failed to save", "Speichern fehlgeschlagen"],
  ["Failed to create", "Erstellen fehlgeschlagen"],
  ["Failed to update", "Aktualisieren fehlgeschlagen"],
  ["Failed to delete", "Loeschen fehlgeschlagen"],
  ["Failed to load", "Laden fehlgeschlagen"],
  ["Failed to remove", "Entfernen fehlgeschlagen"],
  ["Failed to send", "Senden fehlgeschlagen"],
  ["Failed to connect", "Verbindung fehlgeschlagen"],
  ["Failed to upload", "Hochladen fehlgeschlagen"],
  ["Failed to download", "Herunterladen fehlgeschlagen"],
  ["Failed to export", "Exportieren fehlgeschlagen"],
  ["Failed to import", "Importieren fehlgeschlagen"],
  ["An error occurred", "Ein Fehler ist aufgetreten"],
  ["An unexpected error occurred", "Ein unerwarteter Fehler ist aufgetreten"],
  ["Please select", "Bitte auswaehlen"],
  ["Please enter", "Bitte eingeben"],
  ["Please confirm", "Bitte bestaetigen"],
  ["Please wait", "Bitte warten"],
  ["in progress", "in Bearbeitung"],
  ["In Progress", "In Bearbeitung"],
  ["In progress", "In Bearbeitung"],
  ["on track", "Im Plan"],
  ["On Track", "Im Plan"],
  ["at risk", "Gefaehrdet"],
  ["At Risk", "Gefaehrdet"],
  ["at risk", "gefaehrdet"],
  ["All caught up", "Alles erledigt"],
  ["No pending", "Keine ausstehenden"],
  ["Nothing here yet", "Noch nichts vorhanden"],
  ["No items found", "Keine Eintraege gefunden"],
  ["No matching items", "Keine passenden Eintraege"],
  ["items selected", "Eintraege ausgewaehlt"],
  ["Rows per page", "Zeilen pro Seite"],
  ["of", "von"],
  ["to", "bis"],
  ["per page", "pro Seite"],
  ["Showing", "Anzeige von"],
  ["results", "Ergebnisse"],
  ["entries", "Eintraege"],
  ["records", "Datensaetze"],

  // ---------- Time & Date ----------
  ["Just now", "Gerade eben"],
  ["seconds ago", "vor Sekunden"],
  ["minutes ago", "vor Minuten"],
  ["hours ago", "vor Stunden"],
  ["days ago", "vor Tagen"],
  ["weeks ago", "vor Wochen"],
  ["months ago", "vor Monaten"],
  ["years ago", "vor Jahren"],
  ["Last 24 hours", "Letzte 24 Stunden"],
  ["Last 24 Hours", "Letzte 24 Stunden"],
  ["Last 7 days", "Letzte 7 Tage"],
  ["Last 7 Days", "Letzte 7 Tage"],
  ["Last 30 days", "Letzte 30 Tage"],
  ["Last 30 Days", "Letzte 30 Tage"],
  ["Last hour", "Letzte Stunde"],
  ["Last Hour", "Letzte Stunde"],
  ["Last month", "Letzter Monat"],
  ["Last Month", "Letzter Monat"],
  ["This month", "Dieser Monat"],
  ["This Month", "Dieser Monat"],
  ["This week", "Diese Woche"],
  ["This Week", "Diese Woche"],
  ["Due today", "Heute faellig"],
  ["Due tomorrow", "Morgen faellig"],
  ["Due this week", "Diese Woche faellig"],
  ["Overdue", "Ueberfaellig"],
  ["overdue", "ueberfaellig"],

  // ---------- User & Auth ----------
  ["Sign in with", "Anmelden mit"],
  ["Continue with", "Weiter mit"],
  ["Forgot password", "Passwort vergessen"],
  ["Reset password", "Passwort zuruecksetzen"],
  ["Change password", "Passwort aendern"],
  ["Create account", "Konto erstellen"],
  ["My account", "Mein Konto"],
  ["My profile", "Mein Profil"],
  ["My settings", "Meine Einstellungen"],
  ["Account settings", "Kontoeinstellungen"],
  ["Profile settings", "Profileinstellungen"],
  ["Your profile", "Ihr Profil"],
  ["Your account", "Ihr Konto"],
  ["Join now", "Jetzt beitreten"],
  ["Join Now", "Jetzt beitreten"],

  // ---------- Navigation ----------
  ["Go to", "Gehe zu"],
  ["Back to", "Zurueck zu"],
  ["Navigate to", "Navigieren zu"],
  ["Return to", "Zurueck zu"],
  ["Switch to", "Wechseln zu"],
  ["Jump to", "Springen zu"],

  // ---------- Recruitment / HR ----------
  ["Job posted", "Stelle veroeffentlicht"],
  ["Job closed", "Stelle geschlossen"],
  ["Application received", "Bewerbung eingegangen"],
  ["Application submitted", "Bewerbung eingereicht"],
  ["Interview scheduled", "Vorstellungsgespraech geplant"],
  ["Offer extended", "Angebot unterbreitet"],
  ["Offer accepted", "Angebot angenommen"],
  ["Offer declined", "Angebot abgelehnt"],
  ["Candidate hired", "Kandidat eingestellt"],
  ["Candidate rejected", "Kandidat abgelehnt"],
  ["Time to hire", "Zeit bis zur Einstellung"],
  ["Time to fill", "Zeit bis zur Besetzung"],
  ["Cost per hire", "Kosten pro Einstellung"],
  ["Source effectiveness", "Quelleneffektivitaet"],
  ["Pipeline health", "Pipeline-Zustand"],
  ["Pipeline velocity", "Pipeline-Geschwindigkeit"],
  ["Hiring pipeline", "Recruiting-Pipeline"],
  ["Talent pool", "Talent-Pool"],
  ["Talent Pool", "Talent-Pool"],
  ["Job Board Distribution", "Stellenboersen-Distribution"],
  ["Background Checks", "Hintergrundpruefungen"],
  ["Background checks", "Hintergrundpruefungen"],
  ["Employee Onboarding", "Mitarbeiter-Onboarding"],
  ["Headcount Planning", "Personalplanung"],
  ["Scorecard Library", "Bewertungsbogen-Bibliothek"],
  ["Interview Kits", "Vorstellungsgespraech-Pakete"],
  ["Cover Letter Builder", "Anschreiben-Generator"],
  ["Offer Management", "Angebotsverwaltung"],
  ["Candidate Scheduling", "Kandidaten-Terminplanung"],
  ["Job Templates", "Stellenvorlagen"],
  ["Pipeline Stages", "Pipeline-Phasen"],
  ["Member Management", "Mitgliederverwaltung"],
  ["User Management", "Benutzerverwaltung"],
  ["Job Approvals", "Stellengenehmigungen"],
  ["All Candidates", "Alle Kandidaten"],
  ["All Jobs", "Alle Stellen"],
  ["All Companies", "Alle Unternehmen"],
  ["Target Companies", "Zielunternehmen"],
  ["All Pages", "Alle Seiten"],
  ["All Users", "Alle Benutzer"],
  ["Applications received", "Eingegangene Bewerbungen"],
  ["Positions filled", "Besetzte Positionen"],

  // ---------- Meetings ----------
  ["Leave meeting", "Meeting verlassen"],
  ["Leave Meeting", "Meeting verlassen"],
  ["Join meeting", "Meeting beitreten"],
  ["Join Meeting", "Meeting beitreten"],
  ["Start meeting", "Meeting starten"],
  ["End meeting", "Meeting beenden"],
  ["Schedule meeting", "Meeting planen"],
  ["Schedule Meeting", "Meeting planen"],
  ["Schedule interview", "Vorstellungsgespraech planen"],
  ["Meeting recording", "Meeting-Aufnahme"],
  ["Meeting intelligence", "Meeting-Intelligenz"],
  ["Meeting notes", "Meeting-Notizen"],
  ["Meeting analytics", "Meeting-Analysen"],
  ["Stop recording", "Aufnahme stoppen"],
  ["Start recording", "Aufnahme starten"],
  ["Pause recording", "Aufnahme pausieren"],
  ["Resume recording", "Aufnahme fortsetzen"],
  ["Recording in progress", "Aufnahme laeuft"],
  ["Recording consent required", "Aufnahmeeinwilligung erforderlich"],
  ["Screen sharing", "Bildschirmfreigabe"],
  ["Stop sharing", "Freigabe beenden"],
  ["Share screen", "Bildschirm teilen"],
  ["Raise hand", "Hand heben"],
  ["Lower hand", "Hand senken"],
  ["Raised hands", "Gehobene Haende"],
  ["In the meeting", "Im Meeting"],
  ["More options", "Weitere Optionen"],
  ["Add people", "Personen hinzufuegen"],
  ["Search for people", "Personen suchen"],
  ["Remove from call", "Aus Anruf entfernen"],
  ["Video recording", "Videoaufnahme"],
  ["Audio recording", "Audioaufnahme"],
  ["Automatic transcription", "Automatische Transkription"],
  ["Video quality", "Videoqualitaet"],
  ["Audio quality", "Audioqualitaet"],
  ["Public access", "Oeffentlicher Zugriff"],
  ["Anyone with the link", "Jeder mit dem Link"],
  ["Link expires in", "Link laeuft ab in"],

  // ---------- CRM & Sales ----------
  ["Add prospect", "Interessent hinzufuegen"],
  ["Add Prospect", "Interessent hinzufuegen"],
  ["No prospects", "Keine Interessenten"],
  ["Pipeline value", "Pipeline-Wert"],
  ["Weighted pipeline", "Gewichtete Pipeline"],
  ["Conversion rate", "Konversionsrate"],
  ["Win rate", "Abschlussquote"],
  ["Close won", "Abschluss gewonnen"],
  ["Close lost", "Abschluss verloren"],
  ["Lead score", "Lead-Bewertung"],
  ["Deal value", "Deal-Wert"],
  ["Revenue forecast", "Umsatzprognose"],
  ["Activity feed", "Aktivitaetsfeed"],
  ["Activity Feed", "Aktivitaetsfeed"],
  ["Reply inbox", "Antwort-Posteingang"],
  ["Reply Inbox", "Antwort-Posteingang"],

  // ---------- Security ----------
  ["Active threats", "Aktive Bedrohungen"],
  ["Active Threats", "Aktive Bedrohungen"],
  ["No active threats", "Keine aktiven Bedrohungen"],
  ["Threat details", "Bedrohungsdetails"],
  ["Threat history", "Bedrohungsverlauf"],
  ["Attack details", "Angriffsdetails"],
  ["Resolution notes", "Loesungshinweise"],
  ["Security score", "Sicherheitsbewertung"],
  ["Security dashboard", "Sicherheits-Dashboard"],
  ["Security controls", "Sicherheitskontrollen"],
  ["Security alerts", "Sicherheitswarnungen"],
  ["Brute force protection", "Brute-Force-Schutz"],
  ["Brute Force Protection", "Brute-Force-Schutz"],
  ["Rate limiting", "Ratenbegrenzung"],
  ["Rate Limiting", "Ratenbegrenzung"],
  ["Blocked IPs", "Gesperrte IPs"],
  ["Block IP", "IP sperren"],
  ["Failed logins", "Fehlgeschlagene Anmeldungen"],
  ["Failed Logins", "Fehlgeschlagene Anmeldungen"],
  ["Suspicious activity", "Verdaechtige Aktivitaet"],
  ["Suspicious Activity", "Verdaechtige Aktivitaet"],
  ["Active sessions", "Aktive Sitzungen"],
  ["Active Sessions", "Aktive Sitzungen"],
  ["Terminate session", "Sitzung beenden"],
  ["Terminate Session", "Sitzung beenden"],
  ["IP address", "IP-Adresse"],
  ["IP Address", "IP-Adresse"],

  // ---------- Admin ----------
  ["Total users", "Benutzer gesamt"],
  ["Total Users", "Benutzer gesamt"],
  ["New users", "Neue Benutzer"],
  ["Active users", "Aktive Benutzer"],
  ["Role distribution", "Rollenverteilung"],
  ["Role Distribution", "Rollenverteilung"],
  ["System roles", "Systemrollen"],
  ["System Roles", "Systemrollen"],
  ["Company memberships", "Unternehmens-Mitgliedschaften"],
  ["Company Memberships", "Unternehmens-Mitgliedschaften"],
  ["Account actions", "Kontoaktionen"],
  ["Account Actions", "Kontoaktionen"],
  ["Add company", "Unternehmen hinzufuegen"],
  ["Add Company", "Unternehmen hinzufuegen"],
  ["Company members", "Unternehmensmitglieder"],
  ["Company Members", "Unternehmensmitglieder"],
  ["Pending requests", "Offene Anfragen"],
  ["Pending Requests", "Offene Anfragen"],
  ["Feature control", "Funktionssteuerung"],
  ["Feature Control", "Funktionssteuerung"],
  ["Edge functions", "Edge-Funktionen"],
  ["Edge Functions", "Edge-Funktionen"],
  ["Restore company", "Unternehmen wiederherstellen"],
  ["Delete company", "Unternehmen loeschen"],
  ["Archive company", "Unternehmen archivieren"],
  ["Enter company name", "Unternehmensname eingeben"],
  ["Current assignment", "Aktuelle Zuweisung"],
  ["Current Assignment", "Aktuelle Zuweisung"],
  ["Select strategist", "Stratege auswaehlen"],
  ["Select Strategist", "Stratege auswaehlen"],
  ["Commission split", "Provisionsteilung"],
  ["Commission Split", "Provisionsteilung"],
  ["Total applications", "Bewerbungen gesamt"],
  ["Total Applications", "Bewerbungen gesamt"],
  ["Total companies", "Unternehmen gesamt"],
  ["Total Companies", "Unternehmen gesamt"],
  ["Total jobs", "Stellen gesamt"],
  ["Total Jobs", "Stellen gesamt"],
  ["Total attacks", "Angriffe gesamt"],
  ["Total Attacks", "Angriffe gesamt"],
  ["Total requests", "Anfragen gesamt"],
  ["Total Requests", "Anfragen gesamt"],
  ["Blocked requests", "Blockierte Anfragen"],
  ["Blocked Requests", "Blockierte Anfragen"],
  ["Companies overview", "Unternehmens-Uebersicht"],
  ["Companies Overview", "Unternehmens-Uebersicht"],
  ["Company followers", "Unternehmens-Follower"],
  ["Remove member", "Mitglied entfernen"],
  ["Remove member?", "Mitglied entfernen?"],
  ["Member removed", "Mitglied entfernt"],
  ["Role updated", "Rolle aktualisiert"],
  ["Company added", "Unternehmen hinzugefuegt"],
  ["User updated successfully", "Benutzer erfolgreich aktualisiert"],

  // ---------- Dashboard / Widgets ----------
  ["Quick launch", "Schnellzugriff"],
  ["Quick Launch", "Schnellzugriff"],
  ["Quick actions", "Schnellaktionen"],
  ["Quick Actions", "Schnellaktionen"],
  ["Recent activity", "Letzte Aktivitaeten"],
  ["Recent Activity", "Letzte Aktivitaeten"],
  ["Recent applications", "Aktuelle Bewerbungen"],
  ["Recent Applications", "Aktuelle Bewerbungen"],
  ["System errors", "Systemfehler"],
  ["System Errors", "Systemfehler"],
  ["System health", "Systemstatus"],
  ["System Health", "Systemstatus"],
  ["Task queue", "Aufgabenwarteschlange"],
  ["Task Queue", "Aufgabenwarteschlange"],
  ["Health score", "Gesundheitswert"],
  ["Health Score", "Gesundheitswert"],
  ["Awaiting data", "Warten auf Daten"],
  ["Set up", "Einrichten"],
  ["Set Up", "Einrichten"],
  ["Expand analytics", "Analysen erweitern"],
  ["Career journey", "Karriereweg"],
  ["Career Journey", "Karriereweg"],
  ["View error logs", "Fehlerprotokolle anzeigen"],
  ["View pipeline", "Pipeline anzeigen"],
  ["View Pipeline", "Pipeline anzeigen"],
  ["Open task board", "Aufgabenboard oeffnen"],
  ["Complete task", "Aufgabe abschliessen"],
  ["Browse roles", "Stellen durchsuchen"],
  ["No active applications", "Keine aktiven Bewerbungen"],
  ["View all progress", "Gesamtfortschritt anzeigen"],
  ["View all applications", "Alle Bewerbungen anzeigen"],
  ["View all KPIs", "Alle KPIs anzeigen"],

  // ---------- Settings ----------
  ["Save settings", "Einstellungen speichern"],
  ["Save Settings", "Einstellungen speichern"],
  ["Save preferences", "Einstellungen speichern"],
  ["Save Preferences", "Einstellungen speichern"],
  ["Reset to defaults", "Auf Standard zuruecksetzen"],
  ["Reset to Defaults", "Auf Standard zuruecksetzen"],
  ["Company settings", "Unternehmenseinstellungen"],
  ["Company Settings", "Unternehmenseinstellungen"],
  ["Communication settings", "Kommunikationseinstellungen"],
  ["Communication Settings", "Kommunikationseinstellungen"],
  ["Calendar integration", "Kalenderintegration"],
  ["Calendar Integration", "Kalenderintegration"],
  ["Calendar sync", "Kalendersynchronisierung"],
  ["Calendar Sync", "Kalendersynchronisierung"],
  ["Connect calendar", "Kalender verbinden"],
  ["Disconnect calendar", "Kalender trennen"],
  ["Why connect your calendar", "Warum Ihren Kalender verbinden"],
  ["Available providers", "Verfuegbare Anbieter"],
  ["Default camera", "Standardkamera"],
  ["Default microphone", "Standardmikrofon"],
  ["Select camera", "Kamera auswaehlen"],
  ["Select microphone", "Mikrofon auswaehlen"],
  ["Select speaker", "Lautsprecher auswaehlen"],
  ["System default", "Systemstandard"],
  ["Auto recommended", "Automatisch (empfohlen)"],
  ["Noise suppression", "Geraeuschdaempfung"],
  ["Echo cancellation", "Echounterdrueckung"],
  ["Auto gain control", "Automatische Verstaerkungsregelung"],
  ["Background blur", "Hintergrund-Weichzeichnung"],
  ["Mirror video", "Video spiegeln"],

  // ---------- Privacy / Data ----------
  ["Profile information sharing", "Profilinformationen teilen"],
  ["Profile Information Sharing", "Profilinformationen teilen"],
  ["Matching impact", "Auswirkungen auf Matching"],
  ["Data management", "Datenverwaltung"],
  ["Data export", "Datenexport"],
  ["Data Export", "Datenexport"],
  ["Request data export", "Datenexport anfordern"],
  ["Delete account", "Konto loeschen"],
  ["Delete Account", "Konto loeschen"],
  ["Company blocklist", "Unternehmens-Sperrliste"],
  ["No companies blocked", "Keine Unternehmen gesperrt"],
  ["Blocked companies", "Gesperrte Unternehmen"],
  ["Share full name", "Vollstaendigen Namen teilen"],
  ["Share email", "E-Mail-Adresse teilen"],
  ["Share phone", "Telefonnummer teilen"],
  ["Share location", "Standort teilen"],
  ["Share current title", "Aktuelle Position teilen"],
  ["Share LinkedIn", "LinkedIn-Profil teilen"],
  ["Share career preferences", "Karrierepraeferenzen teilen"],
  ["Share resume", "Lebenslauf teilen"],
  ["Share salary", "Gehaltsvorstellungen teilen"],
  ["Share notice period", "Kuendigungsfrist teilen"],

  // ---------- Onboarding ----------
  ["Let's get started", "Lassen Sie uns beginnen"],
  ["Welcome to", "Willkommen bei"],
  ["Complete your profile", "Vervollstaendigen Sie Ihr Profil"],
  ["Skip for now", "Vorerst ueberspringen"],
  ["Skip this step", "Diesen Schritt ueberspringen"],
  ["Finish setup", "Einrichtung abschliessen"],
  ["Almost done", "Fast fertig"],
  ["All set", "Alles eingerichtet"],

  // ---------- Notifications ----------
  ["New notification", "Neue Benachrichtigung"],
  ["Notification settings", "Benachrichtigungseinstellungen"],
  ["Push notifications", "Push-Benachrichtigungen"],
  ["Email notifications", "E-Mail-Benachrichtigungen"],
  ["SMS notifications", "SMS-Benachrichtigungen"],
  ["In-app notifications", "In-App-Benachrichtigungen"],

  // ---------- Calendar ----------
  ["Add to calendar", "Zum Kalender hinzufuegen"],
  ["Sync with calendar", "Mit Kalender synchronisieren"],
  ["Google Calendar", "Google Kalender"],
  ["Outlook Calendar", "Outlook-Kalender"],
  ["Apple Calendar", "Apple-Kalender"],

  // ---------- Analytics / KPI ----------
  ["Key metrics", "Wichtige Kennzahlen"],
  ["Performance metrics", "Leistungskennzahlen"],
  ["Average score", "Durchschnittswert"],
  ["Growth rate", "Wachstumsrate"],
  ["Conversion rate", "Konversionsrate"],
  ["Bounce rate", "Absprungrate"],
  ["Click rate", "Klickrate"],
  ["Open rate", "Oeffnungsrate"],
  ["Response rate", "Antwortrate"],
  ["Success rate", "Erfolgsquote"],
  ["Placement success rate", "Vermittlungserfolgsquote"],
  ["Active rate", "Aktivitaetsrate"],
  ["Top performers", "Top-Performer"],
  ["Avg per placement", "Durchschn. pro Vermittlung"],
  ["Per working day", "Pro Arbeitstag"],
  ["Best month", "Bester Monat"],
  ["Expected closings", "Erwartete Abschluesse"],
  ["Projected month end", "Projiziertes Monatsende"],
  ["Request volume", "Anfragevolumen"],
  ["Allowed vs blocked", "Erlaubt vs. blockiert"],

  // ---------- Misc domain terms ----------
  ["Approvals", "Genehmigungen"],
  ["Assessments", "Assessments"],
  ["Achievements", "Erfolge"],
  ["Announcement", "Ankuendigung"],
  ["Announcements", "Ankuendigungen"],
  ["Assignment", "Zuweisung"],
  ["Availability", "Verfuegbarkeit"],
  ["Blocklist", "Sperrliste"],
  ["Bookmark", "Lesezeichen"],
  ["Bookmarks", "Lesezeichen"],
  ["Bottleneck", "Engpass"],
  ["Branding", "Markenauftritt"],
  ["Categories", "Kategorien"],
  ["Category", "Kategorie"],
  ["Certificate", "Zertifikat"],
  ["Certificates", "Zertifikate"],
  ["Certification", "Zertifizierung"],
  ["Certifications", "Zertifizierungen"],
  ["Changelog", "Aenderungsprotokoll"],
  ["Checklist", "Checkliste"],
  ["Clipboard", "Zwischenablage"],
  ["Configuration", "Konfiguration"],
  ["Confirmation", "Bestaetigung"],
  ["Connection", "Verbindung"],
  ["Connections", "Verbindungen"],
  ["Consent", "Einwilligung"],
  ["Credentials", "Anmeldedaten"],
  ["Custom", "Benutzerdefiniert"],
  ["Default", "Standard"],
  ["Deliverable", "Liefergegenstand"],
  ["Deliverables", "Liefergegenstaende"],
  ["Demographics", "Demografie"],
  ["Department", "Abteilung"],
  ["Departments", "Abteilungen"],
  ["Deployment", "Bereitstellung"],
  ["Disputes", "Streitigkeiten"],
  ["Document", "Dokument"],
  ["Documents", "Dokumente"],
  ["Duration", "Dauer"],
  ["Employees", "Mitarbeiter"],
  ["Endpoint", "Endpunkt"],
  ["Endpoints", "Endpunkte"],
  ["Enrollment", "Anmeldung"],
  ["Enterprise", "Unternehmen"],
  ["Environment", "Umgebung"],
  ["Event", "Ereignis"],
  ["Events", "Ereignisse"],
  ["Evidence", "Nachweis"],
  ["Favorites", "Favoriten"],
  ["Features", "Funktionen"],
  ["Feedback", "Feedback"],
  ["Followers", "Follower"],
  ["Forecast", "Prognose"],
  ["Framework", "Rahmenwerk"],
  ["Frequency", "Haeufigkeit"],
  ["Headlines", "Schlagzeilen"],
  ["History", "Verlauf"],
  ["Incident", "Vorfall"],
  ["Incidents", "Vorfaelle"],
  ["Industry", "Branche"],
  ["Infrastructure", "Infrastruktur"],
  ["Insights", "Einblicke"],
  ["Integrations", "Integrationen"],
  ["Intelligence", "Intelligenz"],
  ["Inventory", "Inventar"],
  ["Investigation", "Untersuchung"],
  ["Invoice", "Rechnung"],
  ["Invoices", "Rechnungen"],
  ["Landscape", "Landschaft"],
  ["Latency", "Latenz"],
  ["Leaderboard", "Rangliste"],
  ["Location", "Standort"],
  ["Locations", "Standorte"],
  ["Maintenance", "Wartung"],
  ["Management", "Verwaltung"],
  ["Marketplace", "Marktplatz"],
  ["Members", "Mitglieder"],
  ["Membership", "Mitgliedschaft"],
  ["Mentions", "Erwaehnungen"],
  ["Milestone", "Meilenstein"],
  ["Milestones", "Meilensteine"],
  ["Module", "Modul"],
  ["Modules", "Module"],
  ["Monitor", "Ueberwachen"],
  ["Monitoring", "Ueberwachung"],
  ["Newsletter", "Newsletter"],
  ["Objectives", "Ziele"],
  ["Onboarding", "Onboarding"],
  ["Operations", "Betrieb"],
  ["Opportunity", "Chance"],
  ["Opportunities", "Chancen"],
  ["Organization", "Organisation"],
  ["Outreach", "Ansprache"],
  ["Parameters", "Parameter"],
  ["Payment", "Zahlung"],
  ["Payments", "Zahlungen"],
  ["Performance", "Leistung"],
  ["Permissions", "Berechtigungen"],
  ["Placement", "Vermittlung"],
  ["Placements", "Vermittlungen"],
  ["Platform", "Plattform"],
  ["Policies", "Richtlinien"],
  ["Portfolio", "Portfolio"],
  ["Prediction", "Vorhersage"],
  ["Predictions", "Vorhersagen"],
  ["Productivity", "Produktivitaet"],
  ["Project", "Projekt"],
  ["Projects", "Projekte"],
  ["Proposals", "Angebote"],
  ["Prospect", "Interessent"],
  ["Prospects", "Interessenten"],
  ["Provider", "Anbieter"],
  ["Providers", "Anbieter"],
  ["Provisioning", "Bereitstellung"],
  ["Qualification", "Qualifikation"],
  ["Qualifications", "Qualifikationen"],
  ["Queue", "Warteschlange"],
  ["Recommendations", "Empfehlungen"],
  ["Recruiter", "Recruiter"],
  ["Referral", "Empfehlung"],
  ["Referrals", "Empfehlungen"],
  ["Registry", "Register"],
  ["Relationships", "Beziehungen"],
  ["Reliability", "Zuverlaessigkeit"],
  ["Reminder", "Erinnerung"],
  ["Reminders", "Erinnerungen"],
  ["Repository", "Repository"],
  ["Requirements", "Anforderungen"],
  ["Resolution", "Loesung"],
  ["Resources", "Ressourcen"],
  ["Responses", "Antworten"],
  ["Results", "Ergebnisse"],
  ["Revenue", "Umsatz"],
  ["Review", "Bewertung"],
  ["Reviews", "Bewertungen"],
  ["Risk", "Risiko"],
  ["Risks", "Risiken"],
  ["Rollout", "Einfuehrung"],
  ["Rotation", "Rotation"],
  ["Salary", "Gehalt"],
  ["Schedule", "Zeitplan"],
  ["Scheduling", "Terminplanung"],
  ["Scorecard", "Bewertungsbogen"],
  ["Scorecards", "Bewertungsboegen"],
  ["Severity", "Schweregrad"],
  ["Skills", "Kompetenzen"],
  ["Source", "Quelle"],
  ["Sources", "Quellen"],
  ["Stages", "Phasen"],
  ["Statistics", "Statistiken"],
  ["Strategist", "Stratege"],
  ["Strategists", "Strategen"],
  ["Subscription", "Abonnement"],
  ["Summary", "Zusammenfassung"],
  ["Support", "Support"],
  ["Survey", "Umfrage"],
  ["Surveys", "Umfragen"],
  ["Targets", "Zielwerte"],
  ["Tasks", "Aufgaben"],
  ["Template", "Vorlage"],
  ["Templates", "Vorlagen"],
  ["Tenant", "Mandant"],
  ["Tenants", "Mandanten"],
  ["Ticket", "Ticket"],
  ["Tickets", "Tickets"],
  ["Timeline", "Zeitleiste"],
  ["Token", "Token"],
  ["Tokens", "Token"],
  ["Trends", "Trends"],
  ["Triggers", "Ausloeser"],
  ["Verification", "Verifizierung"],
  ["Violations", "Verstoesse"],
  ["Visibility", "Sichtbarkeit"],
  ["Visualization", "Visualisierung"],
  ["Vulnerabilities", "Schwachstellen"],
  ["Webhook", "Webhook"],
  ["Webhooks", "Webhooks"],
  ["Workflow", "Arbeitsablauf"],
  ["Workflows", "Arbeitsablaeufe"],
  ["Workspace", "Arbeitsbereich"],
]);

// Single-word translations (case-sensitive for exact value matches)
const WORD_MAP = new Map([
  ["Save", "Speichern"],
  ["Cancel", "Abbrechen"],
  ["Delete", "Loeschen"],
  ["Edit", "Bearbeiten"],
  ["Search", "Suchen"],
  ["Filter", "Filtern"],
  ["Close", "Schliessen"],
  ["Open", "Oeffnen"],
  ["Add", "Hinzufuegen"],
  ["Remove", "Entfernen"],
  ["Update", "Aktualisieren"],
  ["Create", "Erstellen"],
  ["Submit", "Absenden"],
  ["Confirm", "Bestaetigen"],
  ["Back", "Zurueck"],
  ["Next", "Weiter"],
  ["Previous", "Vorherige"],
  ["Loading", "Wird geladen"],
  ["Error", "Fehler"],
  ["Success", "Erfolg"],
  ["Warning", "Warnung"],
  ["Name", "Name"],
  ["Email", "E-Mail"],
  ["Phone", "Telefon"],
  ["Status", "Status"],
  ["Date", "Datum"],
  ["Time", "Zeit"],
  ["Description", "Beschreibung"],
  ["Title", "Titel"],
  ["Type", "Typ"],
  ["Priority", "Prioritaet"],
  ["Notes", "Notizen"],
  ["Comments", "Kommentare"],
  ["Settings", "Einstellungen"],
  ["Profile", "Profil"],
  ["Dashboard", "Dashboard"],
  ["Overview", "Uebersicht"],
  ["Reports", "Berichte"],
  ["Analytics", "Analysen"],
  ["Active", "Aktiv"],
  ["Inactive", "Inaktiv"],
  ["Pending", "Ausstehend"],
  ["Approved", "Genehmigt"],
  ["Rejected", "Abgelehnt"],
  ["Completed", "Abgeschlossen"],
  ["Failed", "Fehlgeschlagen"],
  ["Total", "Gesamt"],
  ["Actions", "Aktionen"],
  ["Details", "Details"],
  ["View", "Ansehen"],
  ["Download", "Herunterladen"],
  ["Upload", "Hochladen"],
  ["Export", "Exportieren"],
  ["Import", "Importieren"],
  ["Refresh", "Aktualisieren"],
  ["Retry", "Erneut versuchen"],
  ["Yes", "Ja"],
  ["No", "Nein"],
  ["All", "Alle"],
  ["None", "Keine"],
  ["Other", "Sonstiges"],
  ["More", "Mehr"],
  ["Less", "Weniger"],
  ["Show", "Anzeigen"],
  ["Hide", "Ausblenden"],
  ["Send", "Senden"],
  ["Sent", "Gesendet"],
  ["Receive", "Empfangen"],
  ["Received", "Empfangen"],
  ["Accept", "Annehmen"],
  ["Decline", "Ablehnen"],
  ["Apply", "Bewerben"],
  ["Assign", "Zuweisen"],
  ["Assigned", "Zugewiesen"],
  ["Unassigned", "Nicht zugewiesen"],
  ["Block", "Sperren"],
  ["Blocked", "Gesperrt"],
  ["Unblock", "Entsperren"],
  ["Enable", "Aktivieren"],
  ["Disable", "Deaktivieren"],
  ["Enabled", "Aktiviert"],
  ["Disabled", "Deaktiviert"],
  ["Required", "Erforderlich"],
  ["Optional", "Optional"],
  ["Public", "Oeffentlich"],
  ["Private", "Privat"],
  ["Shared", "Geteilt"],
  ["Draft", "Entwurf"],
  ["Published", "Veroeffentlicht"],
  ["Archived", "Archiviert"],
  ["Suspended", "Gesperrt"],
  ["Banned", "Gesperrt"],
  ["Verified", "Verifiziert"],
  ["Unverified", "Nicht verifiziert"],
  ["Connected", "Verbunden"],
  ["Disconnected", "Getrennt"],
  ["Online", "Online"],
  ["Offline", "Offline"],
  ["Available", "Verfuegbar"],
  ["Unavailable", "Nicht verfuegbar"],
  ["Busy", "Beschaeftigt"],
  ["Away", "Abwesend"],
  ["Copied", "Kopiert"],
  ["Saved", "Gespeichert"],
  ["Deleted", "Geloescht"],
  ["Updated", "Aktualisiert"],
  ["Created", "Erstellt"],
  ["Submitted", "Eingereicht"],
  ["Confirmed", "Bestaetigt"],
  ["Cancelled", "Storniert"],
  ["Expired", "Abgelaufen"],
  ["Renewed", "Verlaengert"],
  ["Terminated", "Gekuendigt"],
  ["Paused", "Pausiert"],
  ["Resumed", "Fortgesetzt"],
  ["Started", "Gestartet"],
  ["Stopped", "Gestoppt"],
  ["Finished", "Abgeschlossen"],
  ["Progress", "Fortschritt"],
  ["Percentage", "Prozentsatz"],
  ["Amount", "Betrag"],
  ["Quantity", "Menge"],
  ["Rate", "Rate"],
  ["Count", "Anzahl"],
  ["Average", "Durchschnitt"],
  ["Minimum", "Minimum"],
  ["Maximum", "Maximum"],
  ["Currency", "Waehrung"],
  ["Price", "Preis"],
  ["Cost", "Kosten"],
  ["Discount", "Rabatt"],
  ["Tax", "Steuer"],
  ["Subtotal", "Zwischensumme"],
  ["Balance", "Saldo"],
  ["Address", "Adresse"],
  ["City", "Stadt"],
  ["Country", "Land"],
  ["Region", "Region"],
  ["Company", "Unternehmen"],
  ["Companies", "Unternehmen"],
  ["Team", "Team"],
  ["Teams", "Teams"],
  ["Role", "Rolle"],
  ["Roles", "Rollen"],
  ["User", "Benutzer"],
  ["Users", "Benutzer"],
  ["Admin", "Verwaltung"],
  ["Partner", "Partner"],
  ["Partners", "Partner"],
  ["Candidate", "Kandidat"],
  ["Candidates", "Kandidaten"],
  ["Client", "Auftraggeber"],
  ["Clients", "Auftraggeber"],
  ["Member", "Mitglied"],
  ["Staff", "Mitarbeiter"],
  ["Employee", "Mitarbeiter"],
  ["Employer", "Arbeitgeber"],
  ["Contractor", "Auftragnehmer"],
  ["Freelancer", "Freiberufler"],
  ["Manager", "Manager"],
  ["Owner", "Inhaber"],
  ["Subscriber", "Abonnent"],
  ["Guest", "Gast"],
  ["Host", "Gastgeber"],
  ["Speaker", "Sprecher"],
  ["Participant", "Teilnehmer"],
  ["Participants", "Teilnehmer"],
  ["Attendee", "Teilnehmer"],
  ["Attendees", "Teilnehmer"],
  ["Organizer", "Organisator"],
  ["Author", "Autor"],
  ["Editor", "Redakteur"],
  ["Viewer", "Betrachter"],
  ["Reader", "Leser"],
  ["Writer", "Autor"],
  ["Contributor", "Mitwirkender"],
  ["Job", "Stelle"],
  ["Jobs", "Stellen"],
  ["Application", "Bewerbung"],
  ["Applications", "Bewerbungen"],
  ["Interview", "Vorstellungsgespraech"],
  ["Interviews", "Vorstellungsgespraeche"],
  ["Offer", "Angebot"],
  ["Offers", "Angebote"],
  ["Contract", "Vertrag"],
  ["Contracts", "Vertraege"],
  ["Meeting", "Meeting"],
  ["Meetings", "Meetings"],
  ["Message", "Nachricht"],
  ["Messages", "Nachrichten"],
  ["Notification", "Benachrichtigung"],
  ["Notifications", "Benachrichtigungen"],
  ["Alert", "Warnung"],
  ["Alerts", "Warnungen"],
  ["Report", "Bericht"],
  ["Logs", "Protokolle"],
  ["Log", "Protokoll"],
  ["Audit", "Pruefung"],
  ["Campaign", "Kampagne"],
  ["Campaigns", "Kampagnen"],
  ["Automation", "Automatisierung"],
  ["Tag", "Tag"],
  ["Tags", "Tags"],
  ["Label", "Label"],
  ["Labels", "Labels"],
  ["Note", "Notiz"],
  ["Comment", "Kommentar"],
  ["Reply", "Antwort"],
  ["Forward", "Weiterleiten"],
  ["Attachment", "Anhang"],
  ["Attachments", "Anhaenge"],
  ["Link", "Link"],
  ["Image", "Bild"],
  ["Images", "Bilder"],
  ["Photo", "Foto"],
  ["Photos", "Fotos"],
  ["Video", "Video"],
  ["Audio", "Audio"],
  ["File", "Datei"],
  ["Files", "Dateien"],
  ["Folder", "Ordner"],
  ["Folders", "Ordner"],
  ["Page", "Seite"],
  ["Pages", "Seiten"],
  ["Section", "Abschnitt"],
  ["Sections", "Abschnitte"],
  ["Chapter", "Kapitel"],
  ["Item", "Element"],
  ["Items", "Elemente"],
  ["Entry", "Eintrag"],
  ["Entries", "Eintraege"],
  ["Record", "Datensatz"],
  ["Records", "Datensaetze"],
  ["Field", "Feld"],
  ["Fields", "Felder"],
  ["Column", "Spalte"],
  ["Columns", "Spalten"],
  ["Row", "Zeile"],
  ["Rows", "Zeilen"],
  ["Table", "Tabelle"],
  ["Tables", "Tabellen"],
  ["Chart", "Diagramm"],
  ["Charts", "Diagramme"],
  ["Graph", "Grafik"],
  ["Widget", "Widget"],
  ["Widgets", "Widgets"],
  ["Panel", "Bereich"],
  ["Tab", "Tab"],
  ["Tabs", "Tabs"],
  ["Menu", "Menue"],
  ["Toolbar", "Symbolleiste"],
  ["Sidebar", "Seitenleiste"],
  ["Header", "Kopfzeile"],
  ["Footer", "Fusszeile"],
  ["Content", "Inhalt"],
  ["Body", "Inhalt"],
  ["Subject", "Betreff"],
  ["Theme", "Design"],
  ["Color", "Farbe"],
  ["Colors", "Farben"],
  ["Font", "Schriftart"],
  ["Size", "Groesse"],
  ["Width", "Breite"],
  ["Height", "Hoehe"],
  ["Large", "Gross"],
  ["Medium", "Mittel"],
  ["Small", "Klein"],
  ["High", "Hoch"],
  ["Low", "Niedrig"],
  ["Critical", "Kritisch"],
  ["Normal", "Normal"],
  ["Urgent", "Dringend"],
  ["Important", "Wichtig"],
  ["New", "Neu"],
  ["Old", "Alt"],
  ["Recent", "Aktuell"],
  ["Latest", "Neueste"],
  ["Current", "Aktuell"],
  ["Daily", "Taeglich"],
  ["Weekly", "Woechentlich"],
  ["Monthly", "Monatlich"],
  ["Quarterly", "Quartalsweise"],
  ["Yearly", "Jaehrlich"],
  ["Annual", "Jaehrlich"],
  ["Today", "Heute"],
  ["Yesterday", "Gestern"],
  ["Tomorrow", "Morgen"],
  ["Now", "Jetzt"],
  ["Later", "Spaeter"],
  ["Never", "Nie"],
  ["Always", "Immer"],
  ["Sometimes", "Manchmal"],
  ["Once", "Einmal"],
  ["Twice", "Zweimal"],
  ["First", "Erste"],
  ["Last", "Letzte"],
  ["Both", "Beides"],
  ["Neither", "Keines"],
  ["Here", "Hier"],
  ["There", "Dort"],
  ["Everywhere", "Ueberall"],
  ["Anywhere", "Irgendwo"],
  ["Nowhere", "Nirgends"],
  ["Collapse", "Einklappen"],
  ["Expand", "Ausklappen"],
  ["Minimize", "Minimieren"],
  ["Maximize", "Maximieren"],
  ["Fullscreen", "Vollbild"],
  ["Zoom", "Zoom"],
  ["Preview", "Vorschau"],
  ["Print", "Drucken"],
  ["Copy", "Kopieren"],
  ["Paste", "Einfuegen"],
  ["Cut", "Ausschneiden"],
  ["Undo", "Rueckgaengig"],
  ["Redo", "Wiederholen"],
  ["Select", "Auswaehlen"],
  ["Deselect", "Abwaehlen"],
  ["Toggle", "Umschalten"],
  ["Switch", "Wechseln"],
  ["Swap", "Tauschen"],
  ["Sort", "Sortieren"],
  ["Group", "Gruppieren"],
  ["Merge", "Zusammenfuehren"],
  ["Split", "Aufteilen"],
  ["Move", "Verschieben"],
  ["Rename", "Umbenennen"],
  ["Duplicate", "Duplizieren"],
  ["Clone", "Klonen"],
  ["Archive", "Archivieren"],
  ["Restore", "Wiederherstellen"],
  ["Lock", "Sperren"],
  ["Unlock", "Entsperren"],
  ["Pin", "Anheften"],
  ["Unpin", "Losloesung"],
  ["Star", "Markieren"],
  ["Unstar", "Markierung aufheben"],
  ["Mute", "Stummschalten"],
  ["Unmute", "Stummschaltung aufheben"],
  ["Follow", "Folgen"],
  ["Unfollow", "Nicht mehr folgen"],
  ["Subscribe", "Abonnieren"],
  ["Unsubscribe", "Abbestellen"],
  ["Connect", "Verbinden"],
  ["Disconnect", "Trennen"],
  ["Sync", "Synchronisieren"],
  ["Test", "Testen"],
  ["Validate", "Validieren"],
  ["Configure", "Konfigurieren"],
  ["Customize", "Anpassen"],
  ["Manage", "Verwalten"],
  ["Organize", "Organisieren"],
  ["Explore", "Entdecken"],
  ["Discover", "Entdecken"],
  ["Browse", "Durchsuchen"],
  ["Navigate", "Navigieren"],
  ["Generate", "Generieren"],
  ["Publish", "Veroeffentlichen"],
  ["Unpublish", "Veroeffentlichung zuruecknehmen"],
  ["Share", "Teilen"],
  ["Invite", "Einladen"],
  ["Request", "Anfragen"],
  ["Approve", "Genehmigen"],
  ["Reject", "Ablehnen"],
  ["Revoke", "Widerrufen"],
  ["Suspend", "Sperren"],
  ["Activate", "Aktivieren"],
  ["Deactivate", "Deaktivieren"],
  ["Terminate", "Beenden"],
  ["Escalate", "Eskalieren"],
  ["Resolve", "Loesen"],
  ["Investigate", "Untersuchen"],
  ["Analyze", "Analysieren"],
  ["Evaluate", "Bewerten"],
  ["Assess", "Beurteilen"],
  ["Optimize", "Optimieren"],
  ["Improve", "Verbessern"],
  ["Implement", "Implementieren"],
  ["Deploy", "Bereitstellen"],
  ["Monitor", "Ueberwachen"],
  ["Track", "Verfolgen"],
  ["Measure", "Messen"],
  ["Calculate", "Berechnen"],
  ["Estimate", "Schaetzen"],
  ["Forecast", "Prognostizieren"],
  ["Predict", "Vorhersagen"],
  ["Compare", "Vergleichen"],
  ["Benchmark", "Benchmarken"],
  ["soon", "in Kuerze"],
  ["Soon", "In Kuerze"],
]);

// ============================================================
// BROKEN PATTERN FIXES
// ============================================================
// Detects and fixes the word-by-word substitution patterns
// e.g., "Fehlgeschlagen to Entfernen membership" → proper German

// Patterns for detecting broken translations (DE+EN mixes)
const BROKEN_PATTERNS = [
  // "Fehlgeschlagen to X" patterns
  { regex: /^Fehlgeschlagen to (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} fehlgeschlagen` },
  // "Wird geladen X..." patterns
  { regex: /^Wird geladen (.+?)\.{0,3}$/i, fix: (m) => `${fixBrokenPhrase(m[1])} wird geladen...` },
  // "Nein X found/detected/available"
  { regex: /^Nein (.+?) (?:found|detected|available|yet)\.?$/i, fix: (m) => `Keine ${fixBrokenPhrase(m[1])} gefunden` },
  // "Nein X" at start
  { regex: /^Nein (.+)$/i, fix: (m) => `Keine ${fixBrokenPhrase(m[1])}` },
  // "Hinzufügen X" (inverted Add X)
  { regex: /^Hinzuf(?:ue|ü)gen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} hinzufuegen` },
  // "Löschen X" (inverted Delete X)
  { regex: /^L(?:oe|ö)schen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} loeschen` },
  // "Anzeigen X" (inverted View X)
  { regex: /^Anzeigen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} anzeigen` },
  // "Bearbeiten X" (inverted Edit X)
  { regex: /^Bearbeiten (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} bearbeiten` },
  // "Entfernen X" (inverted Remove X)
  { regex: /^Entfernen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} entfernen` },
  // "Öffnen in Neu tab"
  { regex: /^(?:Oe|Ö)ffnen in Neu tab$/i, fix: () => "In neuem Tab oeffnen" },
  // "Senden X" (inverted Send X)
  { regex: /^Senden (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} senden` },
  // "Stoppen X" (inverted Stop X)
  { regex: /^Stoppen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} stoppen` },
  // "Hochladen X" (inverted Upload X)
  { regex: /^Hochladen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} hochladen` },
  // "Speichern X" (inverted Save X)
  { regex: /^Speichern (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} speichern` },
  // "Suchen by X or Y"
  { regex: /^Suchen (?:by|nach) (.+)$/i, fix: (m) => `Nach ${fixBrokenPhrase(m[1])} suchen` },
  // "Auswählen X"
  { regex: /^Ausw(?:ae|ä)hlen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} auswaehlen` },
  // "Wiederherstellen X"
  { regex: /^Wiederherstellen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} wiederherstellen` },
  // "Verlassen X"
  { regex: /^Verlassen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} verlassen` },
  // "Aktivieren X"
  { regex: /^Aktivieren (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} aktivieren` },
  // "Erstellen X"
  { regex: /^Erstellen (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} erstellen` },
  // "Kopieren X"
  { regex: /^Kopieren (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} kopieren` },
  // "Konfigurieren X"
  { regex: /^Konfigurieren (.+)$/i, fix: (m) => `${fixBrokenPhrase(m[1])} konfigurieren` },
  // "X Management" → "X-Verwaltung"
  { regex: /^(.+?) Management$/i, fix: (m) => `${fixBrokenPhrase(m[1])}-Verwaltung` },
  // "X Dashboard" → "X-Dashboard" (keep Dashboard)
  { regex: /^(.+?) Dashboard$/i, fix: (m) => `${fixBrokenPhrase(m[1])}-Dashboard` },
  // "X Builder" → "X-Generator"
  { regex: /^(.+?) Builder$/i, fix: (m) => `${fixBrokenPhrase(m[1])}-Generator` },
  // "X Hub" → "X-Hub"
  { regex: /^(.+?) Hub$/i, fix: (m) => `${fixBrokenPhrase(m[1])}-Hub` },
  // "X Center" → "X-Zentrale"
  { regex: /^(.+?) Center$/i, fix: (m) => `${fixBrokenPhrase(m[1])}-Zentrale` },
  // "X Control Center" → "X-Steuerungszentrale"
  { regex: /^(.+?) Control Center$/i, fix: (m) => `${fixBrokenPhrase(m[1])}-Steuerungszentrale` },
  // Mixed German+English sentences containing common EN words
  { regex: /\b(found|detected|removed|updated|added|saved|exported|created|deleted|failed|successfully|currently|requested|required|loading|selected)\b/i, fix: null },
];

function fixBrokenPhrase(s) {
  // Translate common English words remaining in a broken phrase
  const parts = s.split(/\s+/);
  return parts.map(w => {
    const key = w.replace(/[.,!?;:]+$/, '');
    const punct = w.slice(key.length);
    // Check word map
    const translated = WORD_MAP.get(key) || WORD_MAP.get(capitalize(key));
    if (translated) return translated.toLowerCase() + punct;
    // Check phrase map fragments
    const lower = key.toLowerCase();
    const LOWER_WORDS = {
      'found': 'gefunden', 'detected': 'erkannt', 'removed': 'entfernt',
      'updated': 'aktualisiert', 'added': 'hinzugefuegt', 'saved': 'gespeichert',
      'exported': 'exportiert', 'created': 'erstellt', 'deleted': 'geloescht',
      'failed': 'fehlgeschlagen', 'successfully': 'erfolgreich',
      'currently': 'derzeit', 'requested': 'angefordert', 'required': 'erforderlich',
      'loading': 'wird geladen', 'selected': 'ausgewaehlt', 'enabled': 'aktiviert',
      'disabled': 'deaktiviert', 'submitted': 'eingereicht', 'cancelled': 'storniert',
      'blocked': 'blockiert', 'allowed': 'erlaubt', 'denied': 'verweigert',
      'missing': 'fehlend', 'uploaded': 'hochgeladen', 'assigned': 'zugewiesen',
      'suspended': 'gesperrt', 'terminated': 'beendet', 'completed': 'abgeschlossen',
      'pending': 'ausstehend', 'approved': 'genehmigt', 'rejected': 'abgelehnt',
      'membership': 'Mitgliedschaft', 'member': 'Mitglied', 'members': 'Mitglieder',
      'company': 'Unternehmen', 'companies': 'Unternehmen', 'user': 'Benutzer',
      'users': 'Benutzer', 'role': 'Rolle', 'roles': 'Rollen',
      'assignment': 'Zuweisung', 'session': 'Sitzung', 'sessions': 'Sitzungen',
      'threat': 'Bedrohung', 'threats': 'Bedrohungen', 'attack': 'Angriff',
      'attacks': 'Angriffe', 'alert': 'Warnung', 'alerts': 'Warnungen',
      'request': 'Anfrage', 'requests': 'Anfragen', 'response': 'Antwort',
      'responses': 'Antworten', 'prospect': 'Interessent', 'prospects': 'Interessenten',
      'application': 'Bewerbung', 'applications': 'Bewerbungen',
      'candidate': 'Kandidat', 'candidates': 'Kandidaten',
      'partner': 'Partner', 'partners': 'Partner',
      'staff': 'Mitarbeiter', 'employee': 'Mitarbeiter', 'employees': 'Mitarbeiter',
      'strategist': 'Stratege', 'strategists': 'Strategen',
      'notification': 'Benachrichtigung', 'notifications': 'Benachrichtigungen',
      'setting': 'Einstellung', 'settings': 'Einstellungen',
      'permission': 'Berechtigung', 'permissions': 'Berechtigungen',
      'activity': 'Aktivitaet', 'activities': 'Aktivitaeten',
      'tab': 'Tab', 'tabs': 'Tabs', 'page': 'Seite', 'pages': 'Seiten',
      'data': 'Daten', 'score': 'Punktzahl', 'scoring': 'Bewertung',
      'history': 'Verlauf', 'details': 'Details', 'overview': 'Uebersicht',
      'summary': 'Zusammenfassung', 'description': 'Beschreibung',
      'location': 'Standort', 'address': 'Adresse', 'name': 'Name',
      'email': 'E-Mail', 'phone': 'Telefon', 'status': 'Status',
      'type': 'Typ', 'date': 'Datum', 'time': 'Zeit',
      'reason': 'Grund', 'duration': 'Dauer', 'format': 'Format',
      'options': 'Optionen', 'option': 'Option',
      'image': 'Bild', 'file': 'Datei', 'document': 'Dokument',
      'link': 'Link', 'url': 'URL',
      'or': 'oder', 'and': 'und', 'with': 'mit', 'without': 'ohne',
      'for': 'fuer', 'from': 'von', 'to': 'zu', 'in': 'in',
      'at': 'bei', 'on': 'auf', 'by': 'nach', 'as': 'als',
      'the': 'der', 'a': 'ein', 'an': 'ein', 'this': 'dies',
      'that': 'das', 'these': 'diese', 'those': 'jene',
      'is': 'ist', 'are': 'sind', 'was': 'war', 'were': 'waren',
      'has': 'hat', 'have': 'haben', 'had': 'hatte',
      'will': 'wird', 'would': 'wuerde', 'can': 'kann', 'could': 'koennte',
      'should': 'sollte', 'must': 'muss', 'may': 'darf', 'might': 'koennte',
      'not': 'nicht', 'no': 'kein', 'yes': 'ja',
      'new': 'neu', 'old': 'alt', 'recent': 'aktuell',
      'first': 'erste', 'last': 'letzte', 'next': 'naechste',
      'all': 'alle', 'some': 'einige', 'any': 'jede',
      'every': 'jede', 'each': 'jede', 'other': 'andere',
      'many': 'viele', 'few': 'wenige', 'more': 'mehr', 'less': 'weniger',
      'most': 'die meisten', 'least': 'am wenigsten',
      'here': 'hier', 'there': 'dort', 'where': 'wo', 'when': 'wann',
      'how': 'wie', 'why': 'warum', 'what': 'was', 'which': 'welche',
      'who': 'wer', 'whom': 'wen',
      'about': 'ueber', 'after': 'nach', 'before': 'vor',
      'between': 'zwischen', 'during': 'waehrend', 'since': 'seit',
      'until': 'bis', 'under': 'unter', 'over': 'ueber',
      'above': 'ueber', 'below': 'unter', 'into': 'in',
      'out': 'aus', 'up': 'hoch', 'down': 'herunter',
      'need': 'benoetigt', 'needs': 'benoetigt',
      'only': 'nur', 'also': 'auch', 'even': 'sogar',
      'still': 'noch', 'already': 'bereits', 'just': 'gerade',
      'never': 'nie', 'always': 'immer', 'often': 'oft',
      'your': 'Ihr', 'our': 'unser', 'their': 'ihr',
      'my': 'mein', 'its': 'sein',
      'do': 'tun', 'does': 'tut', 'did': 'tat',
      'get': 'erhalten', 'give': 'geben', 'go': 'gehen',
      'take': 'nehmen', 'make': 'erstellen', 'see': 'sehen',
      'know': 'wissen', 'think': 'denken', 'come': 'kommen',
      'want': 'moechte', 'look': 'schauen', 'use': 'verwenden',
      'find': 'finden', 'tell': 'sagen', 'ask': 'fragen',
      'work': 'arbeiten', 'try': 'versuchen', 'leave': 'verlassen',
      'call': 'anrufen', 'keep': 'behalten', 'help': 'helfen',
      'start': 'starten', 'stop': 'stoppen',
      'show': 'anzeigen', 'hide': 'ausblenden',
      'open': 'oeffnen', 'close': 'schliessen',
      'read': 'lesen', 'write': 'schreiben',
      'run': 'ausfuehren', 'send': 'senden',
      'receive': 'empfangen', 'accept': 'annehmen',
      'choose': 'waehlen', 'enter': 'eingeben',
      'click': 'klicken', 'press': 'druecken',
      'check': 'pruefen', 'verify': 'verifizieren',
      'confirm': 'bestaetigen', 'submit': 'absenden',
      'reset': 'zuruecksetzen', 'clear': 'loeschen',
      'refresh': 'aktualisieren', 'reload': 'neu laden',
    };
    if (LOWER_WORDS[lower]) return LOWER_WORDS[lower] + punct;
    return w; // keep as-is
  }).join(' ');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
// FULL SENTENCE TRANSLATION MAP
// ============================================================
// For complete sentences that need proper German grammar

const SENTENCE_MAP = new Map([
  // Recording consent
  ["This meeting will be recorded for quality and training purposes.", "Dieses Meeting wird zu Qualitaets- und Schulungszwecken aufgezeichnet."],
  ["The host has enabled recording for this meeting", "Der Gastgeber hat die Aufnahme fuer dieses Meeting aktiviert"],
  ["Your video feed will be included in the recording", "Ihr Videobild wird in die Aufnahme einbezogen"],
  ["Your voice will be captured for transcription", "Ihre Stimme wird zur Transkription erfasst"],
  ["Speech-to-text conversion of the meeting", "Sprache-zu-Text-Umwandlung des Meetings"],
  ["Generate summaries, action items, and meeting intelligence", "Zusammenfassungen, Aufgaben und Meeting-Analysen generieren"],
  ["Your data is encrypted and stored securely. Recordings are only accessible to meeting participants and authorized personnel. You can request deletion at any time per GDPR/privacy requirements.", "Ihre Daten werden verschluesselt und sicher gespeichert. Aufnahmen sind nur fuer Meeting-Teilnehmer und autorisiertes Personal zugaenglich. Sie koennen jederzeit gemaess DSGVO/Datenschutzanforderungen eine Loeschung beantragen."],
  ["You've opted out of all recording. You can still participate in the meeting but no recording of your participation will be saved.", "Sie haben alle Aufnahmen abgelehnt. Sie koennen weiterhin am Meeting teilnehmen, aber es wird keine Aufnahme Ihrer Teilnahme gespeichert."],
  ["Anyone with the link can view", "Jeder mit dem Link kann ansehen"],
  ["Create a shareable clip from this recording segment", "Einen teilbaren Clip aus diesem Aufnahmeabschnitt erstellen"],
  ["This feature is currently under development.", "Diese Funktion befindet sich derzeit in Entwicklung."],
  ["This feature is currently under development", "Diese Funktion befindet sich derzeit in Entwicklung"],
  ["This action cannot be undone.", "Diese Aktion kann nicht rueckgaengig gemacht werden."],
  ["There may be related records that need to be removed first.", "Es gibt moeglicherweise zugehoerige Datensaetze, die zuerst entfernt werden muessen."],
  // Settings sentences
  ["Update your password regularly to keep your account secure", "Aktualisieren Sie Ihr Passwort regelmaessig, um Ihr Konto sicher zu halten"],
  ["You'll be signed out of all devices after changing your password", "Sie werden nach der Passwortaenderung auf allen Geraeten abgemeldet"],
  ["Upload and manage your resumes, cover letters, and certificates", "Laden Sie Ihre Lebenslaeufe, Anschreiben und Zertifikate hoch und verwalten Sie diese"],
  ["Configure your camera and video preferences", "Konfigurieren Sie Ihre Kamera- und Videoeinstellungen"],
  ["Configure your microphone and audio preferences", "Konfigurieren Sie Ihre Mikrofon- und Audioeinstellungen"],
  ["Control recording permissions and privacy", "Aufnahmeberechtigungen und Datenschutz steuern"],
  ["Mirror your camera preview (doesn't affect what others see)", "Kameravorschau spiegeln (aendert nicht, was andere sehen)"],
  ["Reduce background noise in your audio", "Hintergrundgeraeusche in Ihrem Audio reduzieren"],
  ["Prevent audio feedback loops", "Audio-Rueckkopplungsschleifen verhindern"],
  ["Automatically adjust microphone volume", "Mikrofonlautstaerke automatisch anpassen"],
  ["Automatically consent when host starts recording", "Automatisch zustimmen, wenn der Gastgeber die Aufnahme startet"],
  ["Microphone is working! Speak to test.", "Mikrofon funktioniert! Sprechen Sie zum Testen."],
  ["Could not access microphone", "Mikrofon konnte nicht aufgerufen werden"],
  ["Camera is working!", "Kamera funktioniert!"],
  ["Could not access camera", "Kamera konnte nicht aufgerufen werden"],
  ["Connecting your calendar allows recruiters to see your availability and schedule interviews at times that work for you, eliminating back-and-forth emails.", "Durch die Verbindung Ihres Kalenders koennen Recruiter Ihre Verfuegbarkeit sehen und Vorstellungsgespraeche zu fuer Sie passenden Zeiten planen, ohne zeitaufwaendigen E-Mail-Austausch."],
  ["Opening Google Calendar authorization...", "Google-Kalender-Autorisierung wird geoeffnet..."],
  ["Google Calendar connected successfully!", "Google Kalender erfolgreich verbunden!"],
  ["This calendar provider is coming soon!", "Dieser Kalenderanbieter ist in Kuerze verfuegbar!"],
  ["Failed to connect calendar", "Kalenderverbindung fehlgeschlagen"],
  ["Failed to disconnect calendar", "Kalendertrennung fehlgeschlagen"],
  ["Failed to update sync setting", "Synchronisierungseinstellung konnte nicht aktualisiert werden"],
  // Company settings
  ["Manage your company profile, branding, and team members", "Verwalten Sie Ihr Unternehmensprofil, Ihren Markenauftritt und Ihre Teammitglieder"],
  ["Company settings have been consolidated here.", "Unternehmenseinstellungen wurden hier zusammengefasst."],
  ["Go to company management", "Zur Unternehmensverwaltung"],
  ["Go to Company Management", "Zur Unternehmensverwaltung"],
  // Admin security
  ["Add notes about how this was resolved...", "Hinweise zur Loesung hinzufuegen..."],
  ["All systems secure", "Alle Systeme sicher"],
  ["No attack origins detected", "Keine Angriffsurspruenge erkannt"],
  ["No recent attacks", "Keine aktuellen Angriffe"],
  ["No attack data available", "Keine Angriffsdaten verfuegbar"],
  ["No suspicious activity detected", "Keine verdaechtige Aktivitaet erkannt"],
  ["No threat history found", "Kein Bedrohungsverlauf gefunden"],
  ["Monitor and manage API rate limits", "API-Ratenbegrenzungen ueberwachen und verwalten"],
  ["Allowed vs blocked over time", "Erlaubt vs. blockiert im Zeitverlauf"],
  ["Endpoints with most blocked requests", "Endpunkte mit den meisten blockierten Anfragen"],
  ["IPs with most rate limit hits", "IPs mit den meisten Ratenbegrenzungs-Treffern"],
  ["Per-endpoint rate limit metrics", "Ratenbegrenzungs-Metriken pro Endpunkt"],
  ["Row-level security coverage", "Row-Level-Sicherheitsabdeckung"],
  ["API endpoint security", "API-Endpunkt-Sicherheit"],
  ["Public endpoints with rate limiting:", "Oeffentliche Endpunkte mit Ratenbegrenzung:"],
  ["Historical security metrics over time", "Historische Sicherheitsmetriken im Zeitverlauf"],
  ["Historical security metrics and patterns", "Historische Sicherheitsmetriken und -muster"],
  ["Terminate all user sessions", "Alle Benutzersitzungen beenden"],
  ["File storage security", "Dateispeicher-Sicherheit"],
  ["Blocked requests today", "Heute blockierte Anfragen"],
  // Admin general
  ["User must have at least one role", "Benutzer muss mindestens eine Rolle haben"],
  ["User updated successfully", "Benutzer erfolgreich aktualisiert"],
  ["Company membership removed", "Unternehmensmitgliedschaft entfernt"],
  ["Failed to remove membership", "Mitgliedschaft konnte nicht entfernt werden"],
  ["Company added", "Unternehmen hinzugefuegt"],
  ["Failed to add company", "Unternehmen konnte nicht hinzugefuegt werden"],
  ["Failed to reset MFA", "MFA konnte nicht zurueckgesetzt werden"],
  ["Failed to archive company", "Unternehmen konnte nicht archiviert werden"],
  ["Failed to load company members", "Unternehmensmitglieder konnten nicht geladen werden"],
  ["Role updated", "Rolle aktualisiert"],
  ["Failed to update role", "Rolle konnte nicht aktualisiert werden"],
  ["Member removed", "Mitglied entfernt"],
  ["Failed to remove member", "Mitglied konnte nicht entfernt werden"],
  ["Failed to update company status", "Unternehmensstatus konnte nicht aktualisiert werden"],
  ["Failed to restore company", "Unternehmen konnte nicht wiederhergestellt werden"],
  ["Failed to delete company", "Unternehmen konnte nicht geloescht werden"],
  ["Failed to assign strategist", "Stratege konnte nicht zugewiesen werden"],
  ["Strategist assignment removed", "Strategenzuweisung entfernt"],
  ["Failed to remove assignment", "Zuweisung konnte nicht entfernt werden"],
  ["Alert dismissed", "Warnung verworfen"],
  ["Failed to dismiss alert", "Warnung konnte nicht verworfen werden"],
  ["Settings saved", "Einstellungen gespeichert"],
  ["Communication settings saved", "Kommunikationseinstellungen gespeichert"],
  ["Failed to save settings", "Einstellungen konnten nicht gespeichert werden"],
  ["Candidates exported", "Kandidaten exportiert"],
  // Partner
  ["Your dedicated talent partner at The Quantum Club", "Ihr persoenlicher Talent-Partner bei The Quantum Club"],
  // Admin user management EN values
  ["Last Login", "Letzte Anmeldung"],
  ["Last login", "Letzte Anmeldung"],
  ["Joined", "Beigetreten"],
  ["Uploaded", "Hochgeladen"],
  ["Missing", "Fehlend"],
  ["On", "An"],
  ["Off", "Aus"],
  ["Unsuspend", "Entsperren"],
  ["Resume", "Lebenslauf"],
  ["View Profile", "Profil anzeigen"],
  ["View as Candidate", "Als Kandidat anzeigen"],
  ["Edit User", "Benutzer bearbeiten"],
  ["Open in new tab", "In neuem Tab oeffnen"],
  ["Candidates exported", "Kandidaten exportiert"],
  ["Company Members", "Unternehmensmitglieder"],
  ["Loading partners...", "Partner werden geladen..."],
  ["No partners found", "Keine Partner gefunden"],
  ["No company", "Kein Unternehmen"],
  ["Pending Requests", "Offene Anfragen"],
  ["Role Distribution", "Rollenverteilung"],
  ["Loading staff...", "Mitarbeiter werden geladen..."],
  ["No staff found", "Keine Mitarbeiter gefunden"],
  ["Total Users", "Benutzer gesamt"],
  ["System Roles", "Systemrollen"],
  ["Company Memberships", "Unternehmens-Mitgliedschaften"],
  ["No company memberships", "Keine Unternehmens-Mitgliedschaften"],
  ["Account Actions", "Kontoaktionen"],
  ["Add company...", "Unternehmen hinzufuegen..."],
  ["User Management", "Benutzerverwaltung"],
  ["Search by name, email, or location...", "Nach Name, E-Mail oder Standort suchen..."],
  ["Search by name, email, or company...", "Nach Name, E-Mail oder Unternehmen suchen..."],
  ["Search by name, email, or role...", "Nach Name, E-Mail oder Rolle suchen..."],
  ["Company membership removed", "Unternehmens-Mitgliedschaft entfernt"],
  ["User updated successfully", "Benutzer erfolgreich aktualisiert"],
  ["Company added", "Unternehmen hinzugefuegt"],
  ["Failed to add company", "Unternehmen konnte nicht hinzugefuegt werden"],
  ["Failed to reset MFA", "MFA konnte nicht zurueckgesetzt werden"],
  ["Failed to remove membership", "Mitgliedschaft konnte nicht entfernt werden"],
  ["User must have at least one role", "Benutzer muss mindestens eine Rolle haben"],

  // Admin companies EN values
  ["Reason (optional)", "Grund (optional)"],
  ["Reason Optional", "Grund (optional)"],
  ["Contract ended, company requested removal...", "Vertrag beendet, Unternehmen hat Entfernung beantragt..."],
  ["e.g., Contract ended, company requested removal...", "z. B. Vertrag beendet, Unternehmen hat Entfernung beantragt..."],
  ["Failed to archive company", "Unternehmen konnte nicht archiviert werden"],
  ["Companies Overview", "Unternehmens-Uebersicht"],
  ["Company Followers", "Unternehmens-Follower"],
  ["Remove member?", "Mitglied entfernen?"],
  ["Failed to load company members", "Unternehmensmitglieder konnten nicht geladen werden"],
  ["Role updated", "Rolle aktualisiert"],
  ["Failed to update role", "Rolle konnte nicht aktualisiert werden"],
  ["Member removed", "Mitglied entfernt"],
  ["Failed to remove member", "Mitglied konnte nicht entfernt werden"],
  ["Restore company?", "Unternehmen wiederherstellen?"],
  ["More options", "Weitere Optionen"],
  ["Failed to update company status", "Unternehmensstatus konnte nicht aktualisiert werden"],
  ["Failed to restore company", "Unternehmen konnte nicht wiederhergestellt werden"],
  ["This action cannot be undone.", "Diese Aktion kann nicht rueckgaengig gemacht werden."],
  ["Enter company name", "Unternehmensname eingeben"],
  ["Failed to delete company. There may be related records that need to be removed first.", "Unternehmen konnte nicht geloescht werden. Es gibt moeglicherweise zugehoerige Datensaetze, die zuerst entfernt werden muessen."],
  ["Current Assignment", "Aktuelle Zuweisung"],
  ["Select Strategist", "Stratege auswaehlen"],
  ["SLA Response Time (days)", "SLA-Antwortzeit (Tage)"],
  ["Commission Split (%)", "Provisionsteilung (%)"],
  ["Choose a strategist...", "Stratege auswaehlen..."],
  ["Failed to assign strategist", "Stratege konnte nicht zugewiesen werden"],
  ["Strategist assignment removed", "Strategenzuweisung entfernt"],
  ["Failed to remove assignment", "Zuweisung konnte nicht entfernt werden"],
  ["Total Applications", "Bewerbungen gesamt"],
  ["Total Companies", "Unternehmen gesamt"],
  ["Total Jobs", "Stellen gesamt"],

  // Admin security EN values
  ["Active Threats", "Aktive Bedrohungen"],
  ["No active threats", "Keine aktiven Bedrohungen"],
  ["Threat Details", "Bedrohungsdetails"],
  ["Attack Details", "Angriffsdetails"],
  ["Resolution Notes", "Loesungshinweise"],
  ["Add notes about how this was resolved...", "Hinweise zur Loesung hinzufuegen..."],
  ["Total Attacks", "Angriffe gesamt"],
  ["Unique IPs", "Eindeutige IPs"],
  ["Critical Threats", "Kritische Bedrohungen"],
  ["TQC Server", "TQC-Server"],
  ["No attack data available", "Keine Angriffsdaten verfuegbar"],
  ["All systems secure", "Alle Systeme sicher"],
  ["No attack origins detected", "Keine Angriffsurspruenge erkannt"],
  ["No recent attacks", "Keine aktuellen Angriffe"],
  ["Failed Logins", "Fehlgeschlagene Anmeldungen"],
  ["Last 24 hours", "Letzte 24 Stunden"],
  ["Top Failed IPs", "Haeufigste fehlgeschlagene IPs"],
  ["Blocked IPs", "Gesperrte IPs"],
  ["Block IP Address", "IP-Adresse sperren"],
  ["IP Address", "IP-Adresse"],
  ["Reason", "Grund"],
  ["Block Duration", "Sperrdauer"],
  ["Permanent", "Dauerhaft"],
  ["No blocked IPs", "Keine gesperrten IPs"],
  ["Reason for blocking...", "Grund fuer die Sperrung..."],
  ["Edge Functions", "Edge-Funktionen"],
  ["API endpoint security", "API-Endpunkt-Sicherheit"],
  ["Security Score", "Sicherheitsbewertung"],
  ["Public endpoints with rate limiting:", "Oeffentliche Endpunkte mit Ratenbegrenzung:"],
  ["RLS Policies", "RLS-Richtlinien"],
  ["Row-level security coverage", "Row-Level-Sicherheitsabdeckung"],
  ["Coverage", "Abdeckung"],
  ["Top Secured Tables", "Am besten gesicherte Tabellen"],
  ["Rate Limiting Dashboard", "Ratenbegrenzungs-Dashboard"],
  ["Monitor and manage API rate limits", "API-Ratenbegrenzungen ueberwachen und verwalten"],
  ["Rate Limit Configuration", "Ratenbegrenzungs-Konfiguration"],
  ["Default Rate Limit (requests/minute)", "Standard-Ratenbegrenzung (Anfragen/Minute)"],
  ["Burst Limit", "Burst-Limit"],
  ["Block Duration (seconds)", "Sperrdauer (Sekunden)"],
  ["Last Hour", "Letzte Stunde"],
  ["Total Requests", "Anfragen gesamt"],
  ["Blocked Requests", "Blockierte Anfragen"],
  ["AI Rate Limits", "KI-Ratenbegrenzungen"],
  ["Request Volume", "Anfragevolumen"],
  ["Allowed vs Blocked over time", "Erlaubt vs. blockiert im Zeitverlauf"],
  ["Top Limited Endpoints", "Am staerksten begrenzte Endpunkte"],
  ["Endpoints with most blocked requests", "Endpunkte mit den meisten blockierten Anfragen"],
  ["Top IPs by Blocks", "Haeufigste IPs nach Sperrungen"],
  ["IPs with most rate limit hits", "IPs mit den meisten Ratenbegrenzungs-Treffern"],
  ["Endpoint Details", "Endpunkt-Details"],
  ["Per-endpoint rate limit metrics", "Ratenbegrenzungs-Metriken pro Endpunkt"],
  ["Endpoint", "Endpunkt"],
  ["Blocked", "Blockiert"],
  ["Filter IP...", "IP filtern..."],
  ["Settings saved", "Einstellungen gespeichert"],
  ["Blocked requests today", "Heute blockierte Anfragen"],
  ["Top IPs", "Haeufigste IPs"],
  ["Alert dismissed", "Warnung verworfen"],
  ["Failed to dismiss alert", "Warnung konnte nicht verworfen werden"],
  ["Enable Auto-Response", "Auto-Antwort aktivieren"],
  ["Max Attempts", "Max. Versuche"],
  ["Window (min)", "Zeitfenster (Min.)"],
  ["Block (hrs)", "Sperrzeit (Std.)"],
  ["IP Address (e.g., 192.168.1.1)", "IP-Adresse (z. B. 192.168.1.1)"],
  ["Brute Force Protection", "Brute-Force-Schutz"],
  ["Credential Stuffing Protection", "Credential-Stuffing-Schutz"],
  ["Account Enumeration Protection", "Kontoermittlungs-Schutz"],
  ["Security Dashboard", "Sicherheits-Dashboard"],
  ["Auth Timeline", "Auth-Zeitleiste"],
  ["Suspicious Activity", "Verdaechtige Aktivitaet"],
  ["Historical security metrics over time", "Historische Sicherheitsmetriken im Zeitverlauf"],
  ["Historical security metrics and patterns", "Historische Sicherheitsmetriken und -muster"],
  ["Active Sessions", "Aktive Sitzungen"],
  ["Suspicious", "Verdaechtig"],
  ["Terminate Session", "Sitzung beenden"],
  ["Terminate all user sessions", "Alle Benutzersitzungen beenden"],
  ["Search by email, IP, country...", "Nach E-Mail, IP, Land suchen..."],
  ["Suspicious Sessions", "Verdaechtige Sitzungen"],
  ["Countries", "Laender"],
  ["Storage Buckets", "Speicher-Buckets"],
  ["File storage security", "Dateispeicher-Sicherheit"],
  ["Public buckets", "Oeffentliche Buckets"],
  ["Security Controls", "Sicherheitskontrollen"],
  ["Size limits", "Groessenbeschraenkungen"],
  ["MIME restrictions", "MIME-Einschraenkungen"],
  ["No suspicious activity detected", "Keine verdaechtige Aktivitaet erkannt"],
  ["Threat History", "Bedrohungsverlauf"],
  ["No threat history found", "Kein Bedrohungsverlauf gefunden"],
  ["Search by IP, email, type", "Nach IP, E-Mail, Typ suchen"],
  ["Current Threat Level", "Aktueller Bedrohungsgrad"],
  ["Threats (24h)", "Bedrohungen (24h)"],
  ["Attack Types (24h)", "Angriffstypen (24h)"],

  // Dashboard / Clubhome EN values
  ["Recent Applications", "Aktuelle Bewerbungen"],
  ["Latest candidate applications", "Neueste Kandidatenbewerbungen"],
  ["No applications yet", "Noch keine Bewerbungen"],
  ["Applications will appear here as candidates apply", "Bewerbungen erscheinen hier, sobald sich Kandidaten bewerben"],
  ["match", "Uebereinstimmung"],
  ["View All Applications", "Alle Bewerbungen anzeigen"],
  ["System Errors", "Systemfehler"],
  ["View Error Logs", "Fehlerprotokolle anzeigen"],
  ["Task Queue", "Aufgabenwarteschlange"],
  ["No pending tasks", "Keine ausstehenden Aufgaben"],
  ["Due today", "Heute faellig"],
  ["KPI Health", "KPI-Zustand"],
  ["No KPI data available yet", "Noch keine KPI-Daten verfuegbar"],
  ["Set Up KPIs", "KPIs einrichten"],
  ["View All KPIs", "Alle KPIs anzeigen"],
  ["Health Score", "Gesundheitswert"],
  ["Awaiting Data", "Warten auf Daten"],
  ["On Target", "Im Ziel"],
  ["Based on {{count}} tracked metrics", "Basierend auf {{count}} verfolgten Kennzahlen"],
  ["All caught up — no pending tasks", "Alles erledigt — keine ausstehenden Aufgaben"],
  ["Done today", "Heute erledigt"],
  ["Open Task Board", "Aufgabenboard oeffnen"],
  ["Complete Task", "Aufgabe abschliessen"],
  ["High", "Hoch"],
  ["Med", "Mittel"],
  ["Low", "Niedrig"],
  ["Due tomorrow", "Morgen faellig"],
  ["Efficiency", "Effizienz"],
  ["Profitability", "Rentabilitaet"],
  ["Applied", "Beworben"],
  ["Screen", "Vorauswahl"],
  ["Bottleneck:", "Engpass:"],
  ["View Pipeline", "Pipeline anzeigen"],
  ["Agent Activity", "Agentenaktivitaet"],
  ["Autonomous actions & pending approvals (24h)", "Autonome Aktionen & ausstehende Genehmigungen (24h)"],
  ["Needs approval", "Genehmigung erforderlich"],
  ["No agent activity in the last 24 hours", "Keine Agentenaktivitaet in den letzten 24 Stunden"],
  ["CRM Prospects", "CRM-Interessenten"],
  ["Avg Deal", "Durchschn. Deal"],
  ["No prospects yet", "Noch keine Interessenten"],
  ["Add Prospects", "Interessenten hinzufuegen"],
  ["No active applications", "Keine aktiven Bewerbungen"],
  ["Browse roles", "Stellen durchsuchen"],
  ["In Progress", "In Bearbeitung"],
  ["Final / Offer", "Finale / Angebot"],
  ["Career Journey", "Karriereweg"],
  ["Fast Mover", "Schneller Aufsteiger"],
  ["Just started", "Gerade erst angefangen"],
  ["On track", "Auf Kurs"],
  ["Your Current Role", "Ihre aktuelle Rolle"],
  ["Your Dream Role", "Ihre Traumrolle"],
  ["% of milestones completed", "% der Meilensteine abgeschlossen"],
  ["Submit 5 applications", "5 Bewerbungen einreichen"],
  ["Complete 3 interviews", "3 Vorstellungsgespraeche absolvieren"],
  ["Receive an offer", "Ein Angebot erhalten"],
  ["days on your job search journey", "Tage auf Ihrer Stellensuche"],
  ["View All Progress", "Gesamtfortschritt anzeigen"],
  ["Revenue & Growth", "Umsatz & Wachstum"],
  ["Select Date range", "Zeitraum auswaehlen"],
  ["Total Revenue", "Gesamtumsatz"],
  ["Avg / Placement", "Durchschn. pro Vermittlung"],
  ["Per Working Day", "Pro Arbeitstag"],
  ["Best Month", "Bester Monat"],
  ["Placements", "Vermittlungen"],
  ["Weighted Pipeline", "Gewichtete Pipeline"],
  ["Expected Closings", "Erwartete Abschluesse"],
  ["Projected Month End", "Projiziertes Monatsende"],
  ["expected", "erwartet"],
  ["Expand Analytics", "Analysen erweitern"],
  ["Collapse", "Einklappen"],
  ["Pipeline Value", "Pipeline-Wert"],
  ["Team Capacity", "Teamkapazitaet"],
  ["No strategists assigned yet", "Noch keine Strategen zugewiesen"],
  ["Partner Engagement", "Partner-Engagement"],
  ["Active Rate (7 days)", "Aktivitaetsrate (7 Tage)"],
  ["Placement Success Rate", "Vermittlungserfolgsquote"],
  ["partners", "Partner"],
  ["Inactive 14+ days", "Inaktiv seit 14+ Tagen"],
  ["Top Performers", "Top-Performer"],
  ["hires", "Einstellungen"],
  ["Alerts", "Warnungen"],
  ["Quick Launch", "Schnellzugriff"],
  ["Finance", "Finanzen"],
  ["KPI Center", "KPI-Zentrale"],
  ["Job Approvals", "Stellengenehmigungen"],
  ["Employees", "Mitarbeiter"],
  ["Features", "Funktionen"],
  ["Operations Monitor", "Betriebsueberwachung"],
  ["agents", "Agenten"],
  ["decisions (24h)", "Entscheidungen (24h)"],

  // Meetings additional EN values
  ["Create Clip", "Clip erstellen"],
  ["Share Link", "Link teilen"],
  ["Public Access", "Oeffentlicher Zugriff"],
  ["Anyone with the link can view", "Jeder mit dem Link kann ansehen"],
  ["Link expires in", "Link laeuft ab in"],
  ["Copy to clipboard", "In Zwischenablage kopieren"],
  ["Optional context for viewers", "Optionaler Kontext fuer Zuschauer"],
  ["Recording Consent Required", "Aufnahmeeinwilligung erforderlich"],
  ["Video Recording", "Videoaufnahme"],
  ["Audio Recording", "Audioaufnahme"],
  ["Automatic Transcription", "Automatische Transkription"],
  ["Club AI is Recording", "Club AI nimmt auf"],
  ["Leave Meeting", "Meeting verlassen"],
  ["Recording Settings", "Aufnahmeeinstellungen"],
  ["Video Quality", "Videoqualitaet"],
  ["Audio Quality", "Audioqualitaet"],
  ["Include System Audio", "Systemaudio einschliessen"],
  ["Start Recording", "Aufnahme starten"],
  ["Recording Info", "Aufnahmeinformationen"],
  ["In the meeting", "Im Meeting"],
  ["Add people", "Personen hinzufuegen"],
  ["Raised hands", "Gehobene Haende"],
  ["Remove from call", "Aus Anruf entfernen"],
  ["Search for people", "Personen suchen"],

  // Settings EN values
  ["Change Password", "Passwort aendern"],
  ["Save Settings", "Einstellungen speichern"],
  ["Save Preferences", "Einstellungen speichern"],
  ["Reset to Defaults", "Auf Standard zuruecksetzen"],
  ["Communication settings saved", "Kommunikationseinstellungen gespeichert"],
  ["Failed to save settings", "Einstellungen konnten nicht gespeichert werden"],
  ["Upload Document", "Dokument hochladen"],
  ["Select Camera", "Kamera auswaehlen"],
  ["Select Microphone", "Mikrofon auswaehlen"],
  ["Default Camera", "Standardkamera"],
  ["Default Microphone", "Standardmikrofon"],
  ["Default Speaker", "Standard-Lautsprecher"],
  ["Select speaker", "Lautsprecher auswaehlen"],
  ["System Default", "Systemstandard"],
  ["Auto (Recommended)", "Automatisch (empfohlen)"],
  ["Mirror Video", "Video spiegeln"],
  ["Background Blur", "Hintergrund-Weichzeichnung"],
  ["Noise Suppression", "Geraeuschdaempfung"],
  ["Echo Cancellation", "Echounterdrueckung"],
  ["Auto Gain Control", "Automatische Verstaerkungsregelung"],
  ["Auto-consent to recording", "Automatische Aufnahmeeinwilligung"],
  ["Calendar Sync Enabled", "Kalendersynchronisierung aktiviert"],
  ["Calendar Sync Disabled", "Kalendersynchronisierung deaktiviert"],
  ["Calendar disconnected", "Kalender getrennt"],
  ["Failed to connect calendar", "Kalenderverbindung fehlgeschlagen"],
  ["Failed to disconnect calendar", "Kalendertrennung fehlgeschlagen"],
  ["Failed to update sync setting", "Synchronisierungseinstellung konnte nicht aktualisiert werden"],
  ["Opening Google Calendar authorization...", "Google-Kalender-Autorisierung wird geoeffnet..."],
  ["Google Calendar connected successfully!", "Google Kalender erfolgreich verbunden!"],
  ["This calendar provider is coming soon!", "Dieser Kalenderanbieter ist in Kuerze verfuegbar!"],
  ["Available Calendar Providers", "Verfuegbare Kalenderanbieter"],
  ["Automatic Calendar Sync", "Automatische Kalendersynchronisierung"],
  ["Automatically check availability for interview scheduling", "Verfuegbarkeit fuer Vorstellungsgespraech-Planung automatisch pruefen"],
  ["Why Connect your Calendar", "Warum Ihren Kalender verbinden"],
  ["Go to Company Management", "Zur Unternehmensverwaltung"],
  ["Company Settings", "Unternehmenseinstellungen"],
  ["Employment Type Preference", "Beschaeftigungsart-Praeferenz"],
  ["Full-Time Compensation", "Vollzeit-Verguetung"],
  ["Freelance Compensation", "Freelance-Verguetung"],
  ["Current Salary Range (Optional)", "Aktuelles Gehaltsband (optional)"],
  ["Desired Salary Range", "Gewuenschtes Gehaltsband"],
  ["Preferred Hours Per Week", "Bevorzugte Stunden pro Woche"],
  ["Hours Per Week", "Stunden pro Woche"],
  ["Hourly Rate Range", "Stundensatz-Bereich"],
  ["Available Hours Per Week", "Verfuegbare Stunden pro Woche"],
  ["Notice Period & Contract", "Kuendigungsfrist & Vertrag"],
  ["Indefinite Contract", "Unbefristeter Vertrag"],
  ["Do you have a permanent contract", "Haben Sie einen unbefristeten Vertrag"],
  ["Contract End Date", "Vertragsende"],
  ["Save Compensation Settings", "Verguetungseinstellungen speichern"],

  // Common navigation EN values
  ["All Pages", "Alle Seiten"],
  ["My Profile", "Mein Profil"],
  ["My Skills", "Meine Kompetenzen"],
  ["My Performance", "Meine Leistung"],
  ["My Analytics", "Meine Analysen"],
  ["My Communications", "Meine Kommunikation"],
  ["My Proposals", "Meine Angebote"],
  ["My Contracts", "Meine Vertraege"],
  ["Submit Ticket", "Ticket einreichen"],
  ["Admin Panel", "Verwaltungsbereich"],
  ["Meeting Intelligence", "Meeting-Intelligenz"],
  ["Referrals & Invites", "Empfehlungen & Einladungen"],
  ["Freelancer Setup", "Freelancer-Einrichtung"],
  ["Gig Marketplace", "Gig-Marktplatz"],
  ["Time Tracking", "Zeiterfassung"],
  ["Social Feed", "Soziales Feed"],
  ["Post Project", "Projekt veroeffentlichen"],
  ["Find Talent", "Talente finden"],
  ["CRM Settings", "CRM-Einstellungen"],
  ["WhatsApp Booking", "WhatsApp-Buchung"],
  ["Partner Funnel", "Partner-Trichter"],
  ["Partner Relationships", "Partner-Beziehungen"],
  ["Relationships Dashboard", "Beziehungs-Dashboard"],
  ["All Companies", "Alle Unternehmen"],
  ["Target Companies", "Zielunternehmen"],
  ["Global Analytics", "Globale Analysen"],
  ["Performance Hub", "Leistungs-Hub"],
  ["Communication Hub", "Kommunikations-Hub"],
  ["Meeting Analytics", "Meeting-Analysen"],
  ["AI Analytics Hub", "KI-Analyse-Hub"],
  ["Time to Fill", "Zeit bis zur Besetzung"],
  ["Recruiter Productivity", "Recruiter-Produktivitaet"],
  ["Source ROI", "Quellen-ROI"],
  ["Email Analytics", "E-Mail-Analysen"],
  ["Edge Function Command Center", "Edge-Funktionen-Kommandozentrale"],
  ["Feature Control Center", "Funktionssteuerungszentrale"],
  ["Employee Dashboard", "Mitarbeiter-Dashboard"],
  ["Custom Fields", "Benutzerdefinierte Felder"],
  ["Workflow Builder", "Arbeitsablauf-Generator"],
  ["Approval Chains", "Genehmigungsketten"],
  ["Announcements", "Ankuendigungen"],
  ["Notifications Config", "Benachrichtigungs-Konfiguration"],
  ["Report Builder", "Bericht-Generator"],
  ["Avatar Traffic Control", "Avatar-Verkehrssteuerung"],
  ["Page Templates", "Seitenvorlagen"],
  ["Blog Engine", "Blog-Engine"],
  ["Email Builder", "E-Mail-Generator"],
  ["Security Hub", "Sicherheits-Hub"],
  ["MFA Enforcement", "MFA-Durchsetzung"],
  ["Session Management", "Sitzungsverwaltung"],
  ["Custom Roles", "Benutzerdefinierte Rollen"],
  ["Status Page", "Statusseite"],
  ["IP Allowlist", "IP-Zulassungsliste"],
  ["Finance Hub", "Finanz-Hub"],
  ["Inventory Hub", "Inventar-Hub"],
  ["Usage Metering", "Nutzungsmessung"],
  ["Customer Health", "Kundenzustand"],
  ["Compliance Hub", "Compliance-Hub"],
  ["Consent Management", "Einwilligungsverwaltung"],
  ["EEO Compliance", "EEO-Compliance"],
  ["Enterprise Management", "Unternehmensverwaltung"],
  ["Due Diligence Center", "Due-Diligence-Zentrale"],
  ["Risk Management", "Risikomanagement"],
  ["Translations Hub", "Uebersetzungs-Hub"],
  ["Data Retention", "Datenaufbewahrung"],
  ["Investor Metrics", "Investoren-Kennzahlen"],
  ["Developer Portal", "Entwicklerportal"],
  ["Integration Marketplace", "Integrations-Marktplatz"],
  ["API Keys", "API-Schluessel"],
  ["All Projects", "Alle Projekte"],
  ["All Proposals", "Alle Angebote"],
  ["Disputes", "Streitigkeiten"],
  ["Social Management", "Social-Media-Verwaltung"],
  ["Releasing soon", "Erscheint in Kuerze"],
  ["Coming soon", "In Kuerze verfuegbar"],
  ["This feature is currently under development.", "Diese Funktion befindet sich derzeit in Entwicklung."],

  // Actions
  ["Loading OS notes.", "OS-Notizen werden geladen."],
  ["Processing.", "Wird verarbeitet."],
  ["Join now", "Jetzt beitreten"],
  ["Join Now", "Jetzt beitreten"],
  ["Retrying...", "Wird wiederholt..."],
  ["Reload Page", "Seite neu laden"],
  ["Leave Meeting", "Meeting verlassen"],
  ["Contact Support", "Support kontaktieren"],
  ["Toggle Sidebar", "Seitenleiste umschalten"],
  ["Send Message", "Nachricht senden"],
  ["Stop generation", "Generierung stoppen"],
  ["Stop Recording", "Aufnahme stoppen"],
  ["Voice Message", "Sprachnachricht"],
  ["Upload image", "Bild hochladen"],
  ["Mute sounds", "Toene stummschalten"],
  ["Enable sounds", "Toene aktivieren"],

  // Partner
  ["Your dedicated talent partner at The Quantum Club", "Ihr persoenlicher Talent-Partner bei The Quantum Club"],

  // Misc
  ["Choose a strategist...", "Stratege auswaehlen..."],
  ["e.g., Contract ended, company requested removal...", "z. B. Vertrag beendet, Unternehmen hat Entfernung beantragt..."],
  ["Search by name, email, or location", "Nach Name, E-Mail oder Standort suchen"],
  ["Search by name, email, or company", "Nach Name, E-Mail oder Unternehmen suchen"],
  ["Search by name, email, or role", "Nach Name, E-Mail oder Rolle suchen"],
  ["Search by IP, email, type", "Nach IP, E-Mail, Typ suchen"],
  ["Search by email, IP, country...", "Nach E-Mail, IP, Land suchen..."],
  ["Search for people", "Personen suchen"],
  ["Filter IP...", "IP filtern..."],
  ["Reason for blocking...", "Grund fuer die Sperrung..."],
  ["Loading partners...", "Partner werden geladen..."],
  ["No partners found", "Keine Partner gefunden"],
  ["No company", "Kein Unternehmen"],
  ["Loading staff...", "Mitarbeiter werden geladen..."],
  ["No staff found", "Keine Mitarbeiter gefunden"],
  ["View as candidate", "Als Kandidat anzeigen"],
  ["Open in new tab", "In neuem Tab oeffnen"],
  ["Restore company?", "Unternehmen wiederherstellen?"],
  ["Do you have a permanent contract", "Haben Sie einen unbefristeten Vertrag"],
  ["Same as my timezone", "Gleiche Zeitzone wie meine"],
  ["I'm available to work on weekends if needed", "Ich bin bei Bedarf auch am Wochenende verfuegbar"],
  ["No flexibility needed", "Keine Flexibilitaet erforderlich"],
  ["I'm willing to shift my working hours:", "Ich bin bereit, meine Arbeitszeiten zu verschieben:"],
  ["You can start between:", "Sie koennen zwischen folgenden Zeiten beginnen:"],
  ["No strategists assigned yet", "Noch keine Strategen zugewiesen"],
  ["No active applications", "Keine aktiven Bewerbungen"],
  ["No prospects yet", "Noch keine Interessenten"],
  ["No agent activity in the last 24 hours", "Keine Agentenaktivitaet in den letzten 24 Stunden"],
  ["All caught up - no pending tasks", "Alles erledigt - keine ausstehenden Aufgaben"],
  ["Applications will appear here as candidates apply", "Bewerbungen erscheinen hier, sobald sich Kandidaten bewerben"],
  ["No KPI data available yet", "Noch keine KPI-Daten verfuegbar"],
  ["Based on {{count}} tracked metrics", "Basierend auf {{count}} verfolgten Kennzahlen"],
  ["Autonomous actions & pending approvals (24h)", "Autonome Aktionen & ausstehende Genehmigungen (24h)"],
  ["Submit 5 applications", "5 Bewerbungen einreichen"],
  ["Complete 3 interviews", "3 Vorstellungsgespraeche absolvieren"],
  ["Receive an offer", "Ein Angebot erhalten"],
  ["Latest candidate applications", "Neueste Kandidatenbewerbungen"],
  ["No applications yet", "Noch keine Bewerbungen"],
  ["days on your job search journey", "Tage auf Ihrer Stellensuche"],
  ["% of milestones completed", "% der Meilensteine abgeschlossen"],
  ["Your current role", "Ihre aktuelle Rolle"],
  ["Your dream role", "Ihre Traumrolle"],
  // Compensation
  ["Employment type preference", "Beschaeftigungsart-Praeferenz"],
  ["Indefinite contract", "Unbefristeter Vertrag"],
  ["Permanent contract", "Unbefristeter Vertrag"],
  ["Contract end date", "Vertragsende"],
  ["Save compensation settings", "Verguetungseinstellungen speichern"],
  ["Notice period", "Kuendigungsfrist"],
  // Recording
  ["Recording consent required", "Aufnahmeeinwilligung erforderlich"],
  ["Note: You will always be notified when a recording starts, regardless of this setting. You can always opt out of being recorded.", "Hinweis: Sie werden immer benachrichtigt, wenn eine Aufnahme startet, unabhaengig von dieser Einstellung. Sie koennen die Aufnahme jederzeit ablehnen."],
  ["Optional context for viewers", "Optionaler Kontext fuer Zuschauer"],
  ["Club AI is recording", "Club AI nimmt auf"],
  ["Higher quality requires more storage", "Hoehere Qualitaet erfordert mehr Speicherplatz"],
  ["Best compatibility", "Beste Kompatibilitaet"],
  ["Universal format", "Universalformat"],
  ["Include system audio", "Systemaudio einschliessen"],
  ["Record other participants' audio", "Audio anderer Teilnehmer aufnehmen"],
  ["Virtual backgrounds will be included", "Virtuelle Hintergruende werden eingeschlossen"],
  ["Recording is saved locally on your device", "Aufnahme wird lokal auf Ihrem Geraet gespeichert"],
  // Privacy
  ["Choose what information you'd like to share with potential employers", "Waehlen Sie, welche Informationen Sie mit potenziellen Arbeitgebern teilen moechten"],
  ["Sharing less information reduces the likelihood of finding the perfect match. Our AI uses your complete profile to find opportunities that align with your goals and expertise.", "Weniger geteilte Informationen verringern die Wahrscheinlichkeit, die perfekte Stelle zu finden. Unsere KI nutzt Ihr vollstaendiges Profil, um Chancen zu finden, die Ihren Zielen und Ihrer Expertise entsprechen."],
  ["Ensure complete discretion - these companies won't see your profile or opportunities", "Gewaehrleisten Sie volle Diskretion - diese Unternehmen koennen Ihr Profil und Ihre Chancen nicht einsehen"],
  ["No companies blocked yet. Add companies to maintain your privacy.", "Noch keine Unternehmen gesperrt. Fuegen Sie Unternehmen hinzu, um Ihre Privatsphaere zu schuetzen."],
  ["Download all your data in a portable format", "Laden Sie alle Ihre Daten in einem portablen Format herunter"],
  ["Permanently delete your account and all data", "Loeschen Sie Ihr Konto und alle Daten dauerhaft"],
  ["Export or delete your data", "Exportieren oder loeschen Sie Ihre Daten"],
  // Work availability
  ["Set your working hours and timezone flexibility for company matching", "Legen Sie Ihre Arbeitszeiten und Zeitzonen-Flexibilitaet fuer die Unternehmens-Zuordnung fest"],
  ["This is auto-detected but can be changed if needed", "Dies wird automatisch erkannt, kann aber bei Bedarf geaendert werden"],
  ["Your working hours (in your timezone)", "Ihre Arbeitszeiten (in Ihrer Zeitzone)"],
  ["Specify if you'd like to work for companies in a different timezone", "Geben Sie an, ob Sie fuer Unternehmen in einer anderen Zeitzone arbeiten moechten"],
  ["I'd like to primarily work for companies in:", "Ich moechte hauptsaechlich fuer Unternehmen arbeiten in:"],
  ["How willing are you to occasionally work beyond your stated hours?", "Wie bereit sind Sie, gelegentlich ueber Ihre angegebenen Stunden hinaus zu arbeiten?"],
]);

// ============================================================
// CORE LOGIC
// ============================================================

function hasEnglishWords(value) {
  // Check if a string contains common English words that suggest it's untranslated
  const englishIndicators = /\b(the|is|are|was|were|has|have|had|will|would|can|could|should|must|may|might|this|that|these|those|with|from|your|our|their|for|not|you|been|being|does|did|its|into|about|than|them|then|each|which|who|whom|what|when|where|how|why|very|also|just|don't|doesn't|didn't|won't|wouldn't|couldn't|shouldn't|hasn't|haven't|hadn't|isn't|aren't|wasn't|weren't|we've|you've|they've|I'll|we'll|you'll|they'll|I'd|we'd|you'd|they'd|I'm|it's|he's|she's|let's|that's|there's|here's|what's|who's)\b/i;
  return englishIndicators.test(value);
}

function isBrokenTranslation(deValue, enValue) {
  // Detects common patterns of broken word-by-word translations
  // Strategy: check if DE contains English words that shouldn't be there

  // Short values (1-2 words) that are different from EN are likely fine
  if (deValue.split(/\s+/).length <= 1) return false;

  // Common English words that should NEVER appear in proper German translations
  const strongEnglishWords = /\b(to|the|is|are|was|were|have|has|with|from|your|our|their|for|not|you|this|that|can|will|been|does|did|about|than|them|then|each|which|who|when|where|how|why|don't|doesn't|we've|you'll|they|into|found|detected|removed|updated|added|saved|exported|created|deleted|failed|successfully|currently|requested|required|loading|selected|membership|memberships|recently|allowed|blocked|monitoring|settings|requests|responses|assessment|distribution|sessions|activity|unsuspend|dismiss|dismissed|assigned|uploaded|missing|login|joined|exported|should|could|would|might|must|there|here|been|being|already|also|just|very|still|only|after|before|between|during|since|until|under|over|above|below|out|up|down|need|needs|based|tracked|metrics|autonomous|approvals|appear|apply|roles|prospects|browse|complete|receive|milestones|submit|journey|search|dream|progress|consent|regardless|opted|participate|accessible|authorized|personnel|securely|encrypted|requirements|compliance)\b/i;

  // German indicator words - if we see these with English, it's broken
  const germanIndicators = /(?:sch|ue|ae|oe|ung\b|keit\b|heit\b|lich\b|iert\b|Wird|Bitte|Ihr|Sie|der|die|das|ein|und|oder|nicht|ist|sind|wird|wurde|hat|zum|zur|vom|bei|auf|aus|nach|ueber|unter|zwischen|Alle|Keine|Gesamt|Aktiv|Neu|Mehr|Weniger|Zurueck|Weiter|Abbrechen|Speichern|Loeschen|L[öo]schen|Bearbeiten|Entfernen|Anzeigen|Suchen|Filtern|Hinzuf[üu]gen|Erstellen|Aktualisieren|Fehlgeschlagen|Genehmigt|Abgelehnt|Ausstehend|Sicherheit|Einstellungen|Benachrichtigungen|Unternehmen|Benutzer|Mitglied|Kandidat|Stelle|Bewerbung|Vermittlung|Vertrag|Aufnahme|Besprechung|Stunden|Tage|Wochen|Monate|Jahre|Standort|Rolle|Profil|Ansehen|Nachricht|Stellenangebot|Bewerbungen|Konto|Passwort|Analytik|Leistung|Funktion|Arbeit|Punktzahl|Abgeschlossen|Verfügbar|Verwalten|Verbinden|Synchronisieren|Konfigurieren|Mikrofon|Kamera|Lautsprecher|Zeitzone|Kalender|Aufgabe|Verlauf|Warnung|Warnungen|Vorstellungsgespr)/;

  if (!germanIndicators.test(deValue)) return false;

  if (strongEnglishWords.test(deValue)) return true;

  return false;
}

function translateValue(enValue, deValue) {
  // Skip non-string values
  if (typeof enValue !== 'string') return deValue;
  if (typeof deValue !== 'string') return deValue;

  // Skip empty values
  if (!enValue.trim() || !deValue.trim()) return deValue;

  // Skip variables-only values like "{{count}}", technical strings
  if (/^\{\{.+\}\}$/.test(enValue)) return deValue;

  // Skip brand names and technical terms that should stay English
  const keepAsIs = ['Dashboard', 'Pipeline', 'KPI', 'CRM', 'API', 'SSO', 'MFA', 'SCIM',
    'SLA', 'NPS', 'ROI', 'Club AI', 'Club Pilot', 'Club Radio', 'Club Home',
    'QUIN', 'The Quantum Club', 'WhatsApp', 'LinkedIn', 'Google', 'GitHub',
    'Apple', 'Microsoft', 'Slack', 'Stripe', 'Blog', 'Feed', 'OK', 'PDF',
    'CSV', 'JSON', 'URL', 'GDPR', 'OAuth', 'RLS', 'TQC'];
  if (keepAsIs.includes(enValue.trim())) return deValue;

  // STEP 1: If DE === EN exactly, translate from scratch
  const isIdentical = deValue === enValue;

  // STEP 2: Check if DE looks like a broken word-by-word translation
  const isBroken = !isIdentical && isBrokenTranslation(deValue, enValue);

  // If neither identical nor broken, keep existing translation
  if (!isIdentical && !isBroken) return deValue;

  // Now we need to translate. Try in order of specificity:

  // A) Check full sentence map
  const sentenceResult = SENTENCE_MAP.get(enValue);
  if (sentenceResult) return sentenceResult;

  // Also check if the EN value appears as a key in sentence map (case-insensitive for common patterns)
  for (const [sentKey, sentVal] of SENTENCE_MAP) {
    if (sentKey.toLowerCase() === enValue.toLowerCase()) return sentVal;
  }

  // B) Check phrase map (exact match)
  const phraseResult = PHRASE_MAP.get(enValue);
  if (phraseResult) return phraseResult;

  // C) Check word map (exact match for single words)
  const wordResult = WORD_MAP.get(enValue);
  if (wordResult) return wordResult;

  // D) For broken translations, try to fix them
  if (isBroken) {
    for (const { regex, fix } of BROKEN_PATTERNS) {
      if (!fix) continue;
      const match = deValue.match(regex);
      if (match) {
        const fixed = fix(match);
        // Capitalize first letter
        return fixed.charAt(0).toUpperCase() + fixed.slice(1);
      }
    }
    // If still broken but we couldn't pattern-match, try translating the EN value
    // using phrase map with case-insensitive matching
    for (const [phraseKey, phraseVal] of PHRASE_MAP) {
      if (phraseKey.toLowerCase() === enValue.toLowerCase()) return phraseVal;
    }
  }

  // E) Try phrase map as substring (for longer strings containing known phrases)
  if (isIdentical && enValue.length > 3) {
    let translated = enValue;
    // Sort phrases by length descending to match longest first
    const sortedPhrases = [...PHRASE_MAP.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [phraseKey, phraseVal] of sortedPhrases) {
      if (translated.includes(phraseKey)) {
        translated = translated.replace(phraseKey, phraseVal);
      }
    }
    // Then try word replacements for remaining English words
    if (translated !== enValue) {
      // Also replace remaining single words
      const words = translated.split(/(\s+|(?=[.,!?;:])|(?<=[.,!?;:]))/);
      const result = words.map(w => {
        const trimmed = w.trim();
        if (!trimmed) return w;
        return WORD_MAP.get(trimmed) || w;
      }).join('');
      if (result !== enValue) return result;
    }
  }

  // F) For identical values (still English), keep as-is if we can't translate
  // This preserves the English as a fallback rather than creating broken German
  return deValue;
}

function walkAndTranslate(enObj, deObj, path = '') {
  if (!enObj || !deObj) return deObj || enObj || {};

  const result = {};
  let translatedCount = 0;
  let fixedCount = 0;

  for (const key of Object.keys(enObj)) {
    const enVal = enObj[key];
    const deVal = deObj[key];
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof enVal === 'object' && enVal !== null && !Array.isArray(enVal)) {
      // Recurse into nested objects
      const deSubObj = (typeof deVal === 'object' && deVal !== null) ? deVal : {};
      const { result: subResult, translated, fixed } = walkAndTranslateWithStats(enVal, deSubObj, currentPath);
      result[key] = subResult;
      translatedCount += translated;
      fixedCount += fixed;
    } else if (typeof enVal === 'string') {
      const deStr = typeof deVal === 'string' ? deVal : enVal;
      const wasIdentical = deStr === enVal;
      const wasBroken = !wasIdentical && isBrokenTranslation(deStr);

      result[key] = translateValue(enVal, deStr);

      if (wasIdentical && result[key] !== enVal) translatedCount++;
      if (wasBroken && result[key] !== deStr) fixedCount++;
    } else {
      // Keep non-string values as-is (numbers, booleans, arrays, null)
      result[key] = deVal !== undefined ? deVal : enVal;
    }
  }

  // Also keep any DE-only keys that don't exist in EN
  for (const key of Object.keys(deObj)) {
    if (!(key in enObj)) {
      result[key] = deObj[key];
    }
  }

  return result;
}

function walkAndTranslateWithStats(enObj, deObj, path = '') {
  if (!enObj || !deObj) return { result: deObj || enObj || {}, translated: 0, fixed: 0 };

  const result = {};
  let translated = 0;
  let fixed = 0;

  for (const key of Object.keys(enObj)) {
    const enVal = enObj[key];
    const deVal = deObj[key];
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof enVal === 'object' && enVal !== null && !Array.isArray(enVal)) {
      const deSubObj = (typeof deVal === 'object' && deVal !== null) ? deVal : {};
      const sub = walkAndTranslateWithStats(enVal, deSubObj, currentPath);
      result[key] = sub.result;
      translated += sub.translated;
      fixed += sub.fixed;
    } else if (typeof enVal === 'string') {
      const deStr = typeof deVal === 'string' ? deVal : enVal;
      const wasIdentical = deStr === enVal;
      const wasBroken = !wasIdentical && isBrokenTranslation(deStr);

      result[key] = translateValue(enVal, deStr);

      if (wasIdentical && result[key] !== enVal) {
        translated++;
      }
      if (wasBroken && result[key] !== deStr) {
        fixed++;
      }
    } else {
      result[key] = deVal !== undefined ? deVal : enVal;
    }
  }

  // Keep DE-only keys
  for (const key of Object.keys(deObj)) {
    if (!(key in enObj)) {
      result[key] = deObj[key];
    }
  }

  return { result, translated, fixed };
}

// ============================================================
// MAIN
// ============================================================

function processNamespace(namespace) {
  const enPath = join(EN_DIR, `${namespace}.json`);
  const dePath = join(DE_DIR, `${namespace}.json`);

  if (!existsSync(enPath)) {
    console.log(`  [SKIP] ${namespace}: EN file not found`);
    return;
  }
  if (!existsSync(dePath)) {
    console.log(`  [SKIP] ${namespace}: DE file not found`);
    return;
  }

  const enData = JSON.parse(readFileSync(enPath, 'utf-8'));
  const deData = JSON.parse(readFileSync(dePath, 'utf-8'));

  // Count keys for stats
  function countKeys(obj) {
    let count = 0;
    for (const val of Object.values(obj)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        count += countKeys(val);
      } else if (typeof val === 'string') {
        count++;
      }
    }
    return count;
  }

  function countIdentical(enObj, deObj) {
    let count = 0;
    for (const key of Object.keys(enObj)) {
      const enVal = enObj[key];
      const deVal = deObj?.[key];
      if (typeof enVal === 'object' && enVal !== null && !Array.isArray(enVal)) {
        count += countIdentical(enVal, typeof deVal === 'object' ? deVal : {});
      } else if (typeof enVal === 'string' && enVal === deVal) {
        count++;
      }
    }
    return count;
  }

  const totalKeys = countKeys(enData);
  const identicalBefore = countIdentical(enData, deData);

  const { result, translated, fixed } = walkAndTranslateWithStats(enData, deData);

  const identicalAfter = countIdentical(enData, result);

  // Write result
  const output = JSON.stringify(result, null, 2);

  // Validate JSON
  try {
    JSON.parse(output);
  } catch (e) {
    console.error(`  [ERROR] ${namespace}: Invalid JSON output! Not writing.`);
    return;
  }

  writeFileSync(dePath, output + '\n', 'utf-8');

  console.log(`  [OK] ${namespace}:`);
  console.log(`        ${totalKeys} total keys`);
  console.log(`        ${identicalBefore} identical (EN=DE) before -> ${identicalAfter} after`);
  console.log(`        ${translated} newly translated, ${fixed} broken fixes`);
}

console.log('=== German Translation Script ===');
console.log(`EN dir: ${EN_DIR}`);
console.log(`DE dir: ${DE_DIR}`);
console.log('');

for (const ns of NAMESPACES) {
  processNamespace(ns);
  console.log('');
}

console.log('=== Done ===');
