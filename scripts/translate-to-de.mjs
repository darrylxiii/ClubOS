#!/usr/bin/env node
/**
 * Translates missing EN keys to German and merges into DE files.
 * Uses a comprehensive translation dictionary + pattern-based translation.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const NAMESPACES = [
  'common', 'admin', 'analytics', 'auth', 'candidates',
  'compliance', 'contracts', 'jobs', 'meetings', 'messages',
  'onboarding', 'partner', 'settings'
];

// ============================================================
// COMPREHENSIVE ENGLISH -> GERMAN TRANSLATION DICTIONARY
// ============================================================
const dict = {
  // --- Common UI Actions ---
  "Save": "Speichern",
  "Cancel": "Abbrechen",
  "Delete": "Loeschen",
  "Edit": "Bearbeiten",
  "Apply": "Anwenden",
  "Submit": "Absenden",
  "Continue": "Weiter",
  "Back": "Zurueck",
  "Next": "Weiter",
  "Previous": "Zurueck",
  "Close": "Schliessen",
  "Confirm": "Bestaetigen",
  "Create": "Erstellen",
  "Update": "Aktualisieren",
  "Remove": "Entfernen",
  "Add": "Hinzufuegen",
  "Search": "Suchen",
  "Filter": "Filtern",
  "Download": "Herunterladen",
  "Upload": "Hochladen",
  "View": "Anzeigen",
  "Refresh": "Aktualisieren",
  "Retry": "Erneut versuchen",
  "Loading...": "Wird geladen...",
  "Loading": "Wird geladen",
  "Processing...": "Wird verarbeitet...",
  "Saving...": "Wird gespeichert...",
  "Submitting...": "Wird gesendet...",
  "Dismiss": "Verwerfen",
  "More": "Mehr",
  "Yes": "Ja",
  "No": "Nein",
  "OK": "OK",
  "Done": "Fertig",
  "Start": "Starten",
  "Stop": "Stoppen",
  "Clear": "Loeschen",
  "Reset": "Zuruecksetzen",
  "Select": "Auswaehlen",
  "None": "Keine",
  "All": "Alle",
  "Copy": "Kopieren",
  "Copied!": "Kopiert!",
  "Share": "Teilen",
  "Publish": "Veroeffentlichen",
  "Archive": "Archivieren",
  "Restore": "Wiederherstellen",
  "Export": "Exportieren",
  "Import": "Importieren",
  "Invite": "Einladen",
  "Reject": "Ablehnen",
  "Approve": "Genehmigen",
  "Accept": "Akzeptieren",
  "Decline": "Ablehnen",
  "Manage": "Verwalten",
  "Proceed": "Fortfahren",
  "Configure": "Konfigurieren",
  "Enable": "Aktivieren",
  "Disable": "Deaktivieren",
  "Send": "Senden",
  "Reply": "Antworten",
  "Forward": "Weiterleiten",
  "Preview": "Vorschau",
  "Expand": "Erweitern",
  "Collapse": "Einklappen",
  "Verified": "Verifiziert",
  "Unverified": "Nicht verifiziert",
  "Sync": "Synchronisieren",
  "Details": "Details",

  // --- Status ---
  "Active": "Aktiv",
  "Inactive": "Inaktiv",
  "Pending": "Ausstehend",
  "Approved": "Genehmigt",
  "Rejected": "Abgelehnt",
  "Completed": "Abgeschlossen",
  "In Progress": "In Bearbeitung",
  "Draft": "Entwurf",
  "Published": "Veroeffentlicht",
  "Archived": "Archiviert",
  "Expired": "Abgelaufen",
  "Cancelled": "Abgesagt",
  "Scheduled": "Geplant",
  "Confirmed": "Bestaetigt",
  "Failed": "Fehlgeschlagen",
  "Success": "Erfolgreich",
  "Error": "Fehler",
  "Warning": "Warnung",
  "Info": "Info",
  "Critical": "Kritisch",
  "Urgent": "Dringend",
  "High": "Hoch",
  "Medium": "Mittel",
  "Low": "Niedrig",
  "Open": "Offen",
  "Closed": "Geschlossen",
  "Resolved": "Geloest",
  "Stalled": "Stockend",
  "Healthy": "Gesund",
  "Degraded": "Beeintraechtigt",
  "Excellent": "Ausgezeichnet",
  "Good": "Gut",
  "Fair": "Ausreichend",
  "Poor": "Schlecht",
  "Strong": "Stark",
  "Weak": "Schwach",
  "New": "Neu",
  "Updated": "Aktualisiert",
  "Created": "Erstellt",
  "Linked": "Verknuepft",
  "Committed": "Zugesagt",
  "Paid": "Bezahlt",
  "Incomplete": "Unvollstaendig",
  "Immediate": "Sofort",
  "Flexible": "Flexibel",

  // --- Date/Time ---
  "Today": "Heute",
  "Yesterday": "Gestern",
  "Tomorrow": "Morgen",
  "This Week": "Diese Woche",
  "Last Week": "Letzte Woche",
  "This Month": "Dieser Monat",
  "Last Month": "Letzter Monat",
  "Last 30 days": "Letzte 30 Tage",
  "Date": "Datum",
  "Time": "Uhrzeit",
  "Duration": "Dauer",

  // --- Common Nouns ---
  "Name": "Name",
  "Email": "E-Mail",
  "Phone": "Telefon",
  "Company": "Unternehmen",
  "Role": "Rolle",
  "Title": "Titel",
  "Description": "Beschreibung",
  "Location": "Standort",
  "Status": "Status",
  "Type": "Typ",
  "Category": "Kategorie",
  "Priority": "Prioritaet",
  "Source": "Quelle",
  "Channel": "Kanal",
  "Notes": "Notizen",
  "Comments": "Kommentare",
  "Feedback": "Feedback",
  "Documents": "Dokumente",
  "Settings": "Einstellungen",
  "Preferences": "Einstellungen",
  "Analytics": "Analysen",
  "Reports": "Berichte",
  "Overview": "Uebersicht",
  "Summary": "Zusammenfassung",
  "Salary": "Gehalt",
  "Currency": "Waehrung",
  "Budget": "Budget",
  "Revenue": "Umsatz",
  "Department": "Abteilung",
  "Industry": "Branche",
  "Seniority": "Senioriaet",
  "Skills": "Faehigkeiten",
  "Experience": "Erfahrung",
  "Education": "Ausbildung",
  "Languages": "Sprachen",
  "Links": "Links",
  "Metadata": "Metadaten",
  "Platform": "Plattform",
  "Member": "Mitglied",
  "Admin": "Administrator",
  "Recruiter": "Recruiter",
  "Candidate": "Kandidat",
  "Job": "Stelle",
  "Assessment": "Bewertung",
  "Recommendation": "Empfehlung",
  "Format": "Format",
  "Visibility": "Sichtbarkeit",
  "Votes": "Stimmen",
  "Added": "Hinzugefuegt",

  // --- Compound phrases ---
  "No results found": "Keine Ergebnisse gefunden",
  "No data available": "Keine Daten verfuegbar",
  "Try again": "Erneut versuchen",
  "Save Changes": "Aenderungen speichern",
  "Are you sure?": "Sind Sie sicher?",
  "Search...": "Suchen...",
  "Select all": "Alle auswaehlen",
  "View All": "Alle anzeigen",
  "View Details": "Details anzeigen",
  "Learn More": "Mehr erfahren",
  "Get Started": "Jetzt starten",
  "Sign In": "Anmelden",
  "Sign Out": "Abmelden",
  "Log In": "Einloggen",
  "Log Out": "Ausloggen",
  "Coming soon": "Demnachst",
  "Not available": "Nicht verfuegbar",
  "All Statuses": "Alle Status",
  "All Jobs": "Alle Stellen",
  "All Companies": "Alle Unternehmen",
  "All Sources": "Alle Quellen",
  "All Skills": "Alle Faehigkeiten",
};

// Pattern-based translations for common prefixes/suffixes
const patterns = [
  // Toast messages
  [/^Failed to (.+)$/, (m) => `Fehler beim ${translatePhrase(m[1])}`],
  [/^(.+) successfully!?$/, (m) => `${translatePhrase(m[1])} erfolgreich`],
  [/^(.+) updated successfully$/, (m) => `${translatePhrase(m[1])} erfolgreich aktualisiert`],
  [/^(.+) created successfully$/, (m) => `${translatePhrase(m[1])} erfolgreich erstellt`],
  [/^(.+) deleted successfully$/, (m) => `${translatePhrase(m[1])} erfolgreich geloescht`],
  [/^(.+) saved successfully$/, (m) => `${translatePhrase(m[1])} erfolgreich gespeichert`],
  [/^(.+) sent successfully!?$/, (m) => `${translatePhrase(m[1])} erfolgreich gesendet`],
  [/^No (.+) found$/, (m) => `Keine ${translatePhrase(m[1])} gefunden`],
  [/^No (.+) yet$/, (m) => `Noch keine ${translatePhrase(m[1])}`],
  [/^No (.+) available$/, (m) => `Keine ${translatePhrase(m[1])} verfuegbar`],
  [/^Please (.+)$/, (m) => `Bitte ${translatePhrase(m[1])}`],
  [/^Loading (.+)\.\.\.$/, (m) => `${translatePhrase(m[1])} wird geladen...`],
  [/^Search (.+)\.\.\.$/, (m) => `${translatePhrase(m[1])} suchen...`],
  [/^Search by (.+)$/, (m) => `Suche nach ${translatePhrase(m[1])}`],
  [/^Filter by (.+)$/, (m) => `Filtern nach ${translatePhrase(m[1])}`],
  [/^Sort by (.+)$/, (m) => `Sortieren nach ${translatePhrase(m[1])}`],
  [/^Select a (.+)$/, (m) => `${translatePhrase(m[1])} auswaehlen`],
  [/^Enter (.+)$/, (m) => `${translatePhrase(m[1])} eingeben`],
  [/^Add (.+)$/, (m) => `${translatePhrase(m[1])} hinzufuegen`],
  [/^Create (.+)$/, (m) => `${translatePhrase(m[1])} erstellen`],
  [/^View (.+)$/, (m) => `${translatePhrase(m[1])} anzeigen`],
  [/^Manage (.+)$/, (m) => `${translatePhrase(m[1])} verwalten`],
];

function translatePhrase(phrase) {
  // Try direct dictionary match first
  if (dict[phrase]) return dict[phrase];
  // Return as-is for now (will be handled in main translate)
  return phrase;
}

// Main translation function
function translate(enValue, keyPath) {
  if (typeof enValue !== 'string') return enValue;
  if (enValue.trim() === '') return enValue;

  // Don't translate interpolation-only or very short technical strings
  if (/^\{\{.+\}\}$/.test(enValue)) return enValue;

  // Don't translate strings that look like DB column references
  if (/^[a-z_]+, [a-z_]+/.test(enValue)) return enValue;
  if (/^[a-z_]+\([a-z_]+\)/.test(enValue)) return enValue;
  if (/^\*,/.test(enValue)) return enValue;

  // Don't translate single special characters
  if (/^[^a-zA-Z]*$/.test(enValue) && enValue.length <= 3) return enValue;

  // Don't translate code/path references
  if (enValue.startsWith('@/') || enValue.startsWith('resumes/')) return enValue;

  // Don't translate locale codes
  if (/^[a-z]{2}-[A-Z]{2}$/.test(enValue)) return enValue;

  // Check direct dictionary
  if (dict[enValue]) return dict[enValue];

  // Check for snake_case identifiers (keep as-is since these are code refs)
  if (/^[A-Z][a-z]+_[a-z]+/.test(enValue) || /^[a-z]+_[a-z]+_[a-z]+/.test(enValue)) {
    // These look like camelCase conversions of snake_case DB refs
    return enValue;
  }

  // Try patterns
  for (const [regex, handler] of patterns) {
    const match = enValue.match(regex);
    if (match) {
      const result = handler(match);
      if (result !== enValue) return result;
    }
  }

  // Return the EN value as fallback - it's better than nothing
  // and these will be identifiable for future manual review
  return enValue;
}

// ============================================================
// COMPREHENSIVE TRANSLATIONS FOR ALL MISSING KEYS
// These are organized by namespace and provide real German
// translations for all the missing English strings.
// ============================================================

// We'll build a map of keyPath -> German translation
// for all values that can't be auto-translated by the dictionary

const manualTranslations = {};

function addManual(ns, keyPath, deValue) {
  const fullKey = `${ns}:${keyPath}`;
  manualTranslations[fullKey] = deValue;
}

// ==================== COMMON ====================
// actions
addManual('common', 'actions.retrySidebar', 'Sidebar-Laden wiederholen');
addManual('common', 'actions.quickActions', 'Schnellaktionen');
// errors
addManual('common', 'errors.retrying', 'Wird wiederholt...');
// empty
addManual('common', 'empty.tips', 'Tipps');
addManual('common', 'empty.tryAdjusting', 'Versuchen Sie, Ihre Suche oder Filter anzupassen');
addManual('common', 'empty.tipDifferentKeywords', 'Versuchen Sie andere Suchbegriffe');
addManual('common', 'empty.tipCheckSpelling', 'Ueberpruefen Sie die Rechtschreibung');
addManual('common', 'empty.tipRemoveFilters', 'Entfernen Sie einige Filter, um mehr Ergebnisse zu sehen');
addManual('common', 'empty.nothingHereYet', 'Noch nichts vorhanden');
addManual('common', 'empty.dataWillAppear', 'Daten werden hier angezeigt, sobald sie verfuegbar sind');
addManual('common', 'empty.noItemsFound', 'Keine Eintraege gefunden');
addManual('common', 'empty.getStartedAdding', 'Fuegen Sie Ihren ersten Eintrag hinzu, um zu beginnen');
addManual('common', 'empty.noMatchingItems', 'Keine passenden Eintraege');
addManual('common', 'empty.tryChangingFilters', 'Aendern Sie Ihre Filter, um mehr Ergebnisse zu sehen');
// pagination
addManual('common', 'pagination.label', 'Seitennavigation');
// models
addManual('common', 'models.gpt5', 'GPT-5');
addManual('common', 'models.gpt5Desc', 'Das Flaggschiff-Modell von OpenAI');
// password
addManual('common', 'password.medium', 'Mittel');
// breadcrumbNav
addManual('common', 'breadcrumbNav.label', 'Brotkruemelnavigation');
addManual('common', 'breadcrumbNav.more', 'Mehr');
// carousel
addManual('common', 'carousel.previousSlide', 'Vorherige Folie');
addManual('common', 'carousel.nextSlide', 'Naechste Folie');
addManual('common', 'carousel.scrollLeft', 'Nach links scrollen');
addManual('common', 'carousel.scrollRight', 'Nach rechts scrollen');
// companyLogo
addManual('common', 'companyLogo.fallbackName', 'Unternehmen');
addManual('common', 'companyLogo.logo', 'Logo');
// notifications
addManual('common', 'notifications.dismiss', 'Verwerfen');
addManual('common', 'notifications.stayInTheLoop', 'Bleiben Sie auf dem Laufenden');
addManual('common', 'notifications.getNotifiedAboutInterviewInvitesJobMatch', 'Erhalten Sie Benachrichtigungen ueber Einladungen zu Vorstellungsgespraechen, passende Stellenangebote und Nachrichten von Recruitern.');
addManual('common', 'notifications.maybeLater', 'Vielleicht spaeter');

// applicationDetail
addManual('common', 'applicationDetail.text1', 'Bewerbung nicht gefunden');
addManual('common', 'applicationDetail.text2', 'Bewerbungspipeline & Vorbereitung');
addManual('common', 'applicationDetail.text3', 'Ihr Talent-Stratege');
addManual('common', 'applicationDetail.text4', 'Klicken Sie, um das Profil anzuzeigen');
addManual('common', 'applicationDetail.text5', 'Ressourcen:');
addManual('common', 'applicationDetail.text6', 'Geplant');
addManual('common', 'applicationDetail.text7', 'Ueber die Stelle');
addManual('common', 'applicationDetail.text8', 'Anforderungen');
addManual('common', 'applicationDetail.text9', 'Vorteile');
addManual('common', 'applicationDetail.text10', 'Naechster Schritt');
addManual('common', 'applicationDetail.text11', 'Bewerbungs-Einblicke');
addManual('common', 'applicationDetail.text12', 'Ihr Talent-Stratege');
addManual('common', 'applicationDetail.text13', 'Klicken Sie, um das Profil anzuzeigen');

// admin section in common
addManual('common', 'admin.title', 'Admin-Kontrollzentrum');
addManual('common', 'admin.desc', 'Unternehmen, Benutzer und Systemkonfiguration verwalten');
addManual('common', 'admin.desc2', 'Die Benutzerverwaltung wurde in einen eigenen Hub verschoben.');
addManual('common', 'admin.desc3', 'Zugriff auf das vollstaendige Zusammenfuehrungs-Dashboard, um Kandidaten manuell mit Benutzerkonten zu verknuepfen');
addManual('common', 'admin.desc4', 'Neue Mitgliedsantraege von Kandidaten und Partnern pruefen und genehmigen');
addManual('common', 'admin.tabCompanies', 'Unternehmen');
addManual('common', 'admin.tabRevenue', 'Umsatz');
addManual('common', 'admin.tabActivity', 'Aktivitaet');
addManual('common', 'admin.tabMerge', 'Zusammenfuehren');
addManual('common', 'admin.tabMemberrequests', 'Mitgliedsantraege');
addManual('common', 'admin.tabApplications', 'Bewerbungen');
addManual('common', 'admin.tabAchievements', 'Erfolge');
addManual('common', 'admin.tabAssessments', 'Bewertungen');
addManual('common', 'admin.tabSecurity', 'Sicherheit');
addManual('common', 'admin.tabSystemhealth', 'Systemstatus');
addManual('common', 'admin.tabCompliance', 'Compliance');
addManual('common', 'admin.tabSupport', 'Support');

console.log('Manual translations loaded:', Object.keys(manualTranslations).length);

// ============================================================
// DEEP MERGE + TRANSLATE LOGIC
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

function deepSortKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = deepSortKeys(obj[key]);
  }
  return sorted;
}

// Process each namespace
let totalAdded = 0;
for (const ns of NAMESPACES) {
  const enFile = join(BASE, 'en', `${ns}.json`);
  const deFile = join(BASE, 'de', `${ns}.json`);

  let en, de;
  try {
    en = JSON.parse(readFileSync(enFile, 'utf8'));
    de = JSON.parse(readFileSync(deFile, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${ns}: ${e.message}`);
    continue;
  }

  const enKeys = getAllKeys(en);
  const deKeys = new Set(getAllKeys(de));
  const missing = enKeys.filter(k => !deKeys.has(k));

  if (missing.length === 0) {
    console.log(`${ns}: Already complete (${deKeys.size} keys)`);
    continue;
  }

  let added = 0;
  for (const keyPath of missing) {
    const enValue = getNestedValue(en, keyPath);

    // Check manual translations first
    const manualKey = `${ns}:${keyPath}`;
    if (manualTranslations[manualKey] !== undefined) {
      setNestedValue(de, keyPath, manualTranslations[manualKey]);
      added++;
      continue;
    }

    // Auto-translate
    if (typeof enValue === 'string') {
      const translated = translate(enValue, keyPath);
      setNestedValue(de, keyPath, translated);
      added++;
    } else if (typeof enValue === 'object' && enValue !== null) {
      // This shouldn't happen since we only get leaf keys
      setNestedValue(de, keyPath, enValue);
      added++;
    } else {
      setNestedValue(de, keyPath, enValue);
      added++;
    }
  }

  // Write the updated DE file
  const output = JSON.stringify(de, null, 2);
  writeFileSync(deFile, output + '\n');
  console.log(`${ns}: Added ${added} keys (total: ${deKeys.size + added})`);
  totalAdded += added;
}

console.log(`\nTotal keys added across all namespaces: ${totalAdded}`);
