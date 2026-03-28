#!/usr/bin/env node
/**
 * Master Translation Generator
 * Processes all JSON locale files and generates real translations for each language.
 * Works section-by-section through each namespace file.
 * 
 * Strategy:
 * - Reads EN file as source of truth
 * - For each target language, finds values still identical to English
 * - Generates proper translations using a comprehensive dictionary approach
 * - Preserves branding words (Club, Quantum Club, ClubSync, etc.)
 * - Skips technical strings (Supabase columns, URLs, short codes)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const LOCALES_DIR = resolve(import.meta.dirname, '../src/i18n/locales');
const TARGET_LANGUAGES = ['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'];

// ============================================================
// COMPREHENSIVE TRANSLATION DICTIONARIES
// ============================================================
// These contain common English words/phrases → translations for each language.
// The script will use these to translate keys that are still in English.

const TRANSLATIONS = {
  nl: {
    // Common UI words
    "Home": "Startpagina",
    "Jobs": "Vacatures",
    "Messages": "Berichten",
    "Applications": "Sollicitaties",
    "Profile": "Profiel",
    "Settings": "Instellingen",
    "Admin": "Beheer",
    "Academy": "Academie",
    "Analytics": "Analyse",
    "Feed": "Tijdlijn",
    "Achievements": "Prestaties",
    "Inbox": "Postvak IN",
    "Meetings": "Vergaderingen",
    "Scheduling": "Planning",
    "Blog": "Blog",
    "Tasks": "Taken",
    "Templates": "Sjablonen",
    "Documents": "Documenten",
    "Subscription": "Abonnement",
    "Favorites": "Favorieten",
    "Companies": "Bedrijven",
    "Offers": "Aanbiedingen",
    "Assessments": "Beoordelingen",
    "Projects": "Projecten",
    "Proposals": "Voorstellen",
    "Disputes": "Geschillen",
    "Contracts": "Contracten",
    "Pipeline": "Pijplijn",
    "Campaigns": "Campagnes",
    "Hiring": "Werving",
    "Partnerships": "Partnerschappen",
    "Operations": "Operaties",
    "Finance": "Financiën",
    "Governance": "Bestuur",
    "Developer": "Ontwikkelaar",
    "Overview": "Overzicht",
    "Communication": "Communicatie",
    "Learning": "Leren",
    "Support": "Ondersteuning",
    "Career": "Carrière",
    "Social": "Sociaal",
    "Security": "Beveiliging",
    // Common action words
    "Save": "Opslaan",
    "Cancel": "Annuleren",
    "Delete": "Verwijderen",
    "Edit": "Bewerken",
    "Apply": "Solliciteren",
    "Submit": "Indienen",
    "Continue": "Doorgaan",
    "Back": "Terug",
    "Next": "Volgende",
    "Previous": "Vorige",
    "Loading...": "Laden...",
    "Processing...": "Verwerken...",
    "Search": "Zoeken",
    "Filter": "Filteren",
    "Download": "Downloaden",
    "Upload": "Uploaden",
    "View": "Bekijken",
    "Close": "Sluiten",
    "Confirm": "Bevestigen",
    "Resend": "Opnieuw versturen",
    "Verify": "Verifiëren",
    "Save Changes": "Wijzigingen opslaan",
    "Start": "Starten",
    "Join": "Deelnemen",
    "Join Now": "Nu deelnemen",
    "Refresh": "Vernieuwen",
    "Try Again": "Opnieuw proberen",
    "Retry": "Opnieuw proberen",
    "Retrying...": "Opnieuw proberen...",
    "Reload Page": "Pagina herladen",
    "Contact Support": "Contact opnemen met support",
    "Archive": "Archiveren",
    "Restore": "Herstellen",
    "Send message": "Bericht versturen",
    "Quick actions": "Snelle acties",
    // Status words
    "Pending": "In behandeling",
    "Approved": "Goedgekeurd",
    "Declined": "Afgewezen",
    "Rejected": "Afgewezen",
    "Active": "Actief",
    "Archived": "Gearchiveerd",
    "Completed": "Voltooid",
    "In Progress": "Bezig",
    "Live Now": "Nu live",
    "Starting Soon": "Begint binnenkort",
    "All Status": "Alle statussen",
    // Time
    "Today": "Vandaag",
    "Yesterday": "Gisteren",
    "Last Week": "Vorige week",
    "Last Month": "Vorige maand",
    "This Week": "Deze week",
    // Common phrases
    "Something went wrong": "Er ging iets mis",
    "No results found": "Geen resultaten gevonden",
    "No data available": "Geen gegevens beschikbaar",
    "This field is required": "Dit veld is verplicht",
    "Invalid email address": "Ongeldig e-mailadres",
    "Invalid phone number": "Ongeldig telefoonnummer",
    "Success": "Gelukt",
    "Error": "Fout",
    "Info": "Informatie",
    "Warning": "Waarschuwing",
    "Dismiss": "Sluiten",
    "Loading": "Laden",
    "Location": "Locatie",
    "Company": "Bedrijf",
    // Dashboard
    "Your Pipeline": "Uw pijplijn",
    "Intelligence": "Intelligentie",
    "Your Team": "Uw team",
    "Discover": "Ontdekken",
    "Recent Activity": "Recente activiteit",
    "Upcoming Meetings": "Aankomende vergaderingen",
    "Quick Actions": "Snelle acties",
    // Roles
    "Administrator": "Beheerder",
    "Partner": "Partner",
    "Strategist": "Strateeg",
    "Candidate": "Kandidaat",
    "Member": "Lid",
    // Misc
    "or": "of",
    "and": "en",
    "of": "van",
    "with": "met",
    "from": "van",
    "to": "naar",
    "by": "door",
    "for": "voor",
    "in": "in",
    "on": "op",
    "at": "om",
    "the": "de",
    "a": "een",
    "an": "een",
    "is": "is",
    "are": "zijn",
    "was": "was",
    "were": "waren",
    "not": "niet",
    "yes": "ja",
    "no": "nee",
    "Yes": "Ja",
    "No": "Nee",
    "all": "alle",
    "All": "Alle",
    "Total": "Totaal",
    "Average": "Gemiddeld",
    "Maximum": "Maximum",
    "Minimum": "Minimum",
    "Count": "Aantal",
    "Percentage": "Percentage",
    "Duration": "Duur",
    "Date": "Datum",
    "Time": "Tijd",
    "Name": "Naam",
    "Email": "E-mail",
    "Phone": "Telefoon",
    "Address": "Adres",
    "City": "Stad",
    "Country": "Land",
    "Description": "Beschrijving",
    "Notes": "Notities",
    "Comments": "Opmerkingen",
    "Tags": "Tags",
    "Category": "Categorie",
    "Type": "Type",
    "Priority": "Prioriteit",
    "Status": "Status",
    "Created": "Aangemaakt",
    "Updated": "Bijgewerkt",
    "Deleted": "Verwijderd",
    "Details": "Details",
    "Summary": "Samenvatting",
    "Report": "Rapport",
    "Reports": "Rapportages",
    "Export": "Exporteren",
    "Import": "Importeren",
    "Manage": "Beheren",
    "Create": "Aanmaken",
    "Update": "Bijwerken",
    "Remove": "Verwijderen",
    "Add": "Toevoegen",
    "Select": "Selecteren",
    "Choose": "Kiezen",
    "Enable": "Inschakelen",
    "Disable": "Uitschakelen",
    "Show": "Tonen",
    "Hide": "Verbergen",
    "Open": "Openen",
    "Send": "Versturen",
    "Copy": "Kopiëren",
    "Paste": "Plakken",
    "Cut": "Knippen",
    "Undo": "Ongedaan maken",
    "Redo": "Opnieuw",
    "Reset": "Opnieuw instellen",
    "Clear": "Wissen",
    "Done": "Gereed",
    "Finish": "Voltooien",
    "Complete": "Voltooid",
    "Cancel": "Annuleren",
    "Skip": "Overslaan",
    "Dismiss": "Sluiten",
    "Accept": "Accepteren",
    "Decline": "Weigeren",
    "Approve": "Goedkeuren",
    "Reject": "Afwijzen",
    "Invite": "Uitnodigen",
    "Schedule": "Plannen",
    "Reschedule": "Opnieuw plannen",
    "Assign": "Toewijzen",
    "Unassign": "Toewijzing opheffen",
    "Pin": "Vastmaken",
    "Unpin": "Losmaken",
    "Lock": "Vergrendelen",
    "Unlock": "Ontgrendelen",
    "Expand": "Uitvouwen",
    "Collapse": "Samenvouwen",
    "More": "Meer",
    "Less": "Minder",
    "Other": "Anders",
    "None": "Geen",
    "Unknown": "Onbekend",
    "Default": "Standaard",
    "Custom": "Aangepast",
    "Auto": "Automatisch",
    "Manual": "Handmatig",
    "Automatic": "Automatisch",
    "Required": "Vereist",
    "Optional": "Optioneel",
    "Recommended": "Aanbevolen",
    "New": "Nieuw",
    "Old": "Oud",
    "Latest": "Laatste",
    "Results": "Resultaten",
    "Actions": "Acties",
    "Options": "Opties",
    "Configuration": "Configuratie",
    "Preferences": "Voorkeuren",
    "General": "Algemeen",
    "Advanced": "Geavanceerd",
    "About": "Over",
    "Help": "Hulp",
    "Version": "Versie",
    "Language": "Taal",
    "Theme": "Thema",
    "Dark": "Donker",
    "Light": "Licht",
    "System": "Systeem",
    "Notifications": "Meldingen",
    "Account": "Account",
    "Password": "Wachtwoord",
    "Sign in": "Inloggen",
    "Sign out": "Uitloggen",
    "Log in": "Inloggen",
    "Log out": "Uitloggen",
    "Register": "Registreren",
    "Forgot password?": "Wachtwoord vergeten?",
    "Remember me": "Onthoud mij",
    "Salary": "Salaris",
    "Revenue": "Omzet",
    "Budget": "Budget",
    "Cost": "Kosten",
    "Price": "Prijs",
    "Rate": "Tarief",
    "Amount": "Bedrag",
    "Payment": "Betaling",
    "Invoice": "Factuur",
    "Invoices": "Facturen",
    "Tax": "Belasting",
    "Discount": "Korting",
    "Commission": "Commissie",
    "Bonus": "Bonus",
    "Penalty": "Boete",
    "Fee": "Kosten",
    "Reward": "Beloning",
    "Points": "Punten",
    "Score": "Score",
    "Level": "Niveau",
    "Rank": "Rangorde",
    "Badge": "Badge",
    "Certificate": "Certificaat",
    "Milestone": "Mijlpaal",
    "Goal": "Doel",
    "Target": "Doelstelling",
    "Progress": "Voortgang",
    "Stage": "Fase",
    "Step": "Stap",
    "Phase": "Fase",
    "Round": "Ronde",
    "Session": "Sessie",
    "Meeting": "Vergadering",
    "Interview": "Sollicitatiegesprek",
    "Call": "Gesprek",
    "Chat": "Chat",
    "Thread": "Discussie",
    "Topic": "Onderwerp",
    "Channel": "Kanaal",
    "Group": "Groep",
    "Team": "Team",
    "Department": "Afdeling",
    "Organization": "Organisatie",
    "Workspace": "Werkruimte",
    "Project": "Project",
    "Task": "Taak",
    "Issue": "Probleem",
    "Bug": "Bug",
    "Feature": "Functie",
    "Request": "Verzoek",
    "Ticket": "Ticket",
    "Case": "Casus",
    "Client": "Klant",
    "Customer": "Klant",
    "User": "Gebruiker",
    "Owner": "Eigenaar",
    "Creator": "Maker",
    "Author": "Auteur",
    "Editor": "Redacteur",
    "Reviewer": "Beoordelaar",
    "Viewer": "Kijker",
    "Guest": "Gast",
    "Public": "Openbaar",
    "Private": "Privé",
    "Shared": "Gedeeld",
    "Draft": "Concept",
    "Published": "Gepubliceerd",
    "Scheduled": "Gepland",
    "Cancelled": "Geannuleerd",
    "Expired": "Verlopen",
    "Renewed": "Verlengd",
    "Suspended": "Opgeschort",
    "Blocked": "Geblokkeerd",
    "Verified": "Geverifieerd",
    "Unverified": "Niet geverifieerd",
    "Internal": "Intern",
    "External": "Extern",
    "Incoming": "Inkomend",
    "Outgoing": "Uitgaand",
    "Sent": "Verzonden",
    "Received": "Ontvangen",
    "Read": "Gelezen",
    "Unread": "Ongelezen",
    "Starred": "Met ster",
    "Spam": "Spam",
    "Trash": "Prullenbak",
    "Folder": "Map",
    "File": "Bestand",
    "Image": "Afbeelding",
    "Video": "Video",
    "Audio": "Audio",
    "Link": "Link",
    "Attachment": "Bijlage",
    "Attachments": "Bijlagen",
    "Preview": "Voorbeeld",
    "Fullscreen": "Volledig scherm",
    "Zoom": "Zoom",
    "Rotate": "Draaien",
    "Crop": "Bijsnijden",
    "Resize": "Formaat wijzigen",
    "Title": "Titel",
    "Subtitle": "Ondertitel",
    "Header": "Koptekst",
    "Footer": "Voettekst",
    "Body": "Inhoud",
    "Content": "Inhoud",
    "Label": "Label",
    "Value": "Waarde",
    "Key": "Sleutel",
    "Color": "Kleur",
    "Size": "Grootte",
    "Width": "Breedte",
    "Height": "Hoogte",
    "Position": "Positie",
    "Alignment": "Uitlijning",
    "Margin": "Marge",
    "Padding": "Opvulling",
    "Border": "Rand",
    "Background": "Achtergrond",
    "Foreground": "Voorgrond",
    "Icon": "Pictogram",
    "Logo": "Logo",
    "Avatar": "Avatar",
    "Placeholder": "Tijdelijke aanduiding",
    "Tooltip": "Knopinfo",
    "Loading": "Laden",
    "Saving...": "Opslaan...",
    "Uploading...": "Uploaden...",
    "Downloading...": "Downloaden...",
    "Searching...": "Zoeken...",
    "Connected": "Verbonden",
    "Disconnected": "Verbroken",
    "Online": "Online",
    "Offline": "Offline",
    "Available": "Beschikbaar",
    "Unavailable": "Niet beschikbaar",
    "Busy": "Bezet",
    "Away": "Afwezig",
    "Idle": "Inactief",
    "Do Not Disturb": "Niet storen",
    "Invisible": "Onzichtbaar",
    // Common phrases used in the app
    "No upcoming meetings": "Geen aankomende vergaderingen",
    "All caught up!": "Helemaal bij!",
    "Tips": "Tips",
    "Try adjusting your search or filters": "Pas uw zoekopdracht of filters aan",
    "Nothing here yet": "Nog niets hier",
    "Data will appear here once available": "Gegevens verschijnen hier zodra beschikbaar",
    "Good morning": "Goedemorgen",
    "Good afternoon": "Goedemiddag",
    "Good evening": "Goedenavond",
    "Welcome back": "Welkom terug",
    "Here's your personalized dashboard": "Hier is uw persoonlijk dashboard",
    "Scorecard": "Scorekaart",
    "Efficiency": "Efficiëntie",
    "Profitability": "Winstgevendheid",
    "Applied": "Gesolliciteerd",
    "Screen": "Screening",
    "Offer": "Aanbod",
    "Hired": "Aangenomen",
    "Hour Spent": "Bestede uur",
    "Course Topic": "Cursusonderwerp",
    "Design": "Ontwerp",
    "Certificate": "Certificaat",
    "Ongoing": "Lopend",
    "Screening": "Screening",
    "reviewed": "beoordeeld",
    "Pending Offer": "In afwachting van aanbod",
    "Achievement Hunter": "Prestatieja ger",
    "Daily Challenges": "Dagelijkse uitdagingen",
    "Weekly Challenges": "Wekelijkse uitdagingen",
    "No audit log entries": "Geen auditlogvermeldingen",
    "Recent invoices": "Recente facturen",
    "Integration status updated": "Integratiestatus bijgewerkt",
    "Sync initiated": "Synchronisatie gestart",
    "Sync frequency": "Synchronisatiefrequentie",
    "Microphone access denied": "Microfoontoegang geweigerd",
    "Integrations": "Integraties",
    "Support tickets": "Supporttickets",
    "Partner Hub": "Partner Hub",
    "Search tickets": "Tickets zoeken",
    "Waiting for you": "Wacht op u",
    "SLA breached": "SLA geschonden",
    "Low": "Laag",
    "Medium": "Gemiddeld",
    "High": "Hoog",
    "Urgent": "Urgent",
    "Critical": "Kritiek",
    "Healthy": "Gezond",
    "Needs Attention": "Aandacht nodig",
    "At Risk": "Risicovol",
    "Candidates": "Kandidaten",
    "Prospects": "Prospects",
    "Partners": "Partners",
    "Members": "Leden",
    "Employees": "Werknemers",
    "Freelancers": "Freelancers",
    "Clients": "Klanten",
    "Users": "Gebruikers",
    "Roles": "Rollen",
    "Permissions": "Rechten",
    "Access": "Toegang",
    "Audit": "Audit",
    "Logs": "Logboeken",
    "History": "Geschiedenis",
    "Timeline": "Tijdlijn",
    "Calendar": "Kalender",
    "Events": "Evenementen",
    "Reminders": "Herinneringen",
    "Alerts": "Meldingen",
    "Dashboard": "Dashboard",
    "Widget": "Widget",
    "Chart": "Grafiek",
    "Table": "Tabel",
    "List": "Lijst",
    "Grid": "Raster",
    "Map": "Kaart",
    "Graph": "Grafiek",
    "Diagram": "Diagram",
    "Flow": "Stroom",
    "Funnel": "Trechter",
    "Conversion": "Conversie",
    "Engagement": "Betrokkenheid",
    "Retention": "Retentie",
    "Growth": "Groei",
    "Performance": "Prestaties",
    "Impact": "Impact",
    "Influence": "Invloed",
    "Reach": "Bereik",
    "Visibility": "Zichtbaarheid",
    "Awareness": "Bekendheid",
    "Satisfaction": "Tevredenheid",
    "Experience": "Ervaring",
    "Quality": "Kwaliteit",
    "Quantity": "Hoeveelheid",
    "Accuracy": "Nauwkeurigheid",
    "Speed": "Snelheid",
    "Reliability": "Betrouwbaarheid",
    "Availability": "Beschikbaarheid",
    "Scalability": "Schaalbaarheid",
    "Flexibility": "Flexibiliteit",
    "Compliance": "Naleving",
    "Regulation": "Regulering",
    "Policy": "Beleid",
    "Rule": "Regel",
    "Standard": "Standaard",
    "Procedure": "Procedure",
    "Process": "Proces",
    "Workflow": "Workflow",
    "Automation": "Automatisering",
    "Integration": "Integratie",
    "Migration": "Migratie",
    "Deployment": "Implementatie",
    "Environment": "Omgeving",
    "Production": "Productie",
    "Staging": "Staging",
    "Development": "Ontwikkeling",
    "Testing": "Testen",
    "Monitoring": "Monitoring",
    "Logging": "Logging",
    "Debugging": "Debuggen",
    "Profiling": "Profileren",
    "Optimization": "Optimalisatie",
    "Caching": "Caching",
    "Token": "Token",
    "Endpoint": "Eindpunt",
    "Resource": "Bron",
    "Model": "Model",
    "Schema": "Schema",
    "Database": "Database",
    "Backup": "Back-up",
    "Snapshot": "Snapshot",
    "Cluster": "Cluster",
    "Node": "Node",
    "Instance": "Instantie",
    "Container": "Container",
    "Service": "Service",
    "Function": "Functie",
    "Module": "Module",
    "Package": "Pakket",
    "Library": "Bibliotheek",
    "Framework": "Framework",
    "Platform": "Platform",
    "Application": "Applicatie",
    "Software": "Software",
    "Hardware": "Hardware",
    "Device": "Apparaat",
    "Browser": "Browser",
    "Network": "Netwerk",
    "Server": "Server",
    "Domain": "Domein",
    "Certificate": "Certificaat",
    "Encryption": "Versleuteling",
    "Authentication": "Authenticatie",
    "Authorization": "Autorisatie",
    "Validation": "Validatie",
    "Verification": "Verificatie",
    "Confirmation": "Bevestiging",
    "Notification": "Melding",
    "subscription": "abonnement",
    "Welcome to Messages": "Welkom bij Berichten",
    "Start conversations with your network": "Start gesprekken met uw netwerk",
    "Select a conversation": "Selecteer een gesprek",
    "Choose from your existing conversations or start a new one": "Kies uit uw bestaande gesprekken of start een nieuw gesprek",
    "Search conversations and messages...": "Gesprekken en berichten zoeken...",
  },
  de: {
    "Home": "Startseite", "Jobs": "Stellenangebote", "Messages": "Nachrichten", "Applications": "Bewerbungen",
    "Profile": "Profil", "Settings": "Einstellungen", "Admin": "Verwaltung", "Academy": "Akademie",
    "Analytics": "Analysen", "Meetings": "Besprechungen", "Today": "Heute", "Yesterday": "Gestern",
    "Save": "Speichern", "Cancel": "Abbrechen", "Delete": "Löschen", "Edit": "Bearbeiten",
    "Search": "Suchen", "Filter": "Filtern", "Loading...": "Laden...", "Close": "Schließen",
    "Confirm": "Bestätigen", "Continue": "Fortfahren", "Back": "Zurück", "Next": "Weiter",
    "Previous": "Vorherige", "Submit": "Absenden", "Download": "Herunterladen", "Upload": "Hochladen",
    "View": "Anzeigen", "Start": "Starten", "Join": "Beitreten", "Refresh": "Aktualisieren",
    "Try Again": "Erneut versuchen", "Archive": "Archivieren", "Restore": "Wiederherstellen",
    "Pending": "Ausstehend", "Approved": "Genehmigt", "Declined": "Abgelehnt", "Active": "Aktiv",
    "Completed": "Abgeschlossen", "In Progress": "In Bearbeitung", "Success": "Erfolg", "Error": "Fehler",
    "Warning": "Warnung", "Info": "Info", "Loading": "Laden", "Good morning": "Guten Morgen",
    "Good afternoon": "Guten Tag", "Good evening": "Guten Abend", "Welcome back": "Willkommen zurück",
    "Dashboard": "Dashboard", "Overview": "Übersicht", "Details": "Details", "Total": "Gesamt",
    "Priority": "Priorität", "Status": "Status", "Date": "Datum", "Time": "Uhrzeit",
    "Name": "Name", "Email": "E-Mail", "Phone": "Telefon", "Description": "Beschreibung",
    "Low": "Niedrig", "Medium": "Mittel", "High": "Hoch", "Urgent": "Dringend", "Critical": "Kritisch",
    "Member": "Mitglied", "Team": "Team", "Create": "Erstellen", "Add": "Hinzufügen",
    "Remove": "Entfernen", "Select": "Auswählen", "Enable": "Aktivieren", "Disable": "Deaktivieren",
    "Show": "Anzeigen", "Hide": "Ausblenden", "Open": "Öffnen", "Send": "Senden",
    "Copy": "Kopieren", "Done": "Fertig", "Salary": "Gehalt", "Revenue": "Umsatz",
    "Budget": "Budget", "Invoice": "Rechnung", "Payment": "Zahlung", "Commission": "Provision",
    "Score": "Punktzahl", "Progress": "Fortschritt", "Goal": "Ziel", "Target": "Zielwert",
    "Notifications": "Benachrichtigungen", "Calendar": "Kalender", "Available": "Verfügbar",
    "Screening": "Vorauswahl", "Interview": "Vorstellungsgespräch", "Offer": "Angebot",
    "Hired": "Eingestellt", "Applied": "Beworben", "Candidates": "Kandidaten",
    "All": "Alle", "Yes": "Ja", "No": "Nein", "None": "Keine",
    "Something went wrong": "Etwas ist schiefgelaufen",
    "No results found": "Keine Ergebnisse gefunden",
    "This field is required": "Dieses Feld ist erforderlich",
  },
  fr: {
    "Home": "Accueil", "Jobs": "Offres d'emploi", "Messages": "Messages", "Applications": "Candidatures",
    "Profile": "Profil", "Settings": "Paramètres", "Admin": "Administration", "Academy": "Académie",
    "Analytics": "Analyses", "Meetings": "Réunions", "Today": "Aujourd'hui", "Yesterday": "Hier",
    "Save": "Enregistrer", "Cancel": "Annuler", "Delete": "Supprimer", "Edit": "Modifier",
    "Search": "Rechercher", "Filter": "Filtrer", "Loading...": "Chargement...", "Close": "Fermer",
    "Confirm": "Confirmer", "Continue": "Continuer", "Back": "Retour", "Next": "Suivant",
    "Previous": "Précédent", "Submit": "Soumettre", "Download": "Télécharger", "Upload": "Téléverser",
    "View": "Afficher", "Start": "Démarrer", "Join": "Rejoindre", "Refresh": "Actualiser",
    "Try Again": "Réessayer", "Archive": "Archiver", "Restore": "Restaurer",
    "Pending": "En attente", "Approved": "Approuvé", "Declined": "Refusé", "Active": "Actif",
    "Completed": "Terminé", "In Progress": "En cours", "Success": "Succès", "Error": "Erreur",
    "Warning": "Avertissement", "Info": "Info", "Loading": "Chargement", "Good morning": "Bonjour",
    "Good afternoon": "Bon après-midi", "Good evening": "Bonsoir", "Welcome back": "Bon retour",
    "Dashboard": "Tableau de bord", "Overview": "Aperçu", "Details": "Détails", "Total": "Total",
    "Priority": "Priorité", "Status": "Statut", "Date": "Date", "Time": "Heure",
    "Name": "Nom", "Email": "E-mail", "Phone": "Téléphone", "Description": "Description",
    "Low": "Faible", "Medium": "Moyen", "High": "Élevé", "Urgent": "Urgent", "Critical": "Critique",
    "Member": "Membre", "Team": "Équipe", "Create": "Créer", "Add": "Ajouter",
    "Remove": "Retirer", "Select": "Sélectionner", "Enable": "Activer", "Disable": "Désactiver",
    "Show": "Afficher", "Hide": "Masquer", "Open": "Ouvrir", "Send": "Envoyer",
    "Done": "Terminé", "Salary": "Salaire", "Revenue": "Chiffre d'affaires",
    "Invoice": "Facture", "Payment": "Paiement", "Commission": "Commission",
    "Score": "Score", "Progress": "Progression", "Goal": "Objectif", "Target": "Cible",
    "Notifications": "Notifications", "Calendar": "Calendrier", "Available": "Disponible",
    "Screening": "Présélection", "Interview": "Entretien", "Offer": "Offre",
    "Hired": "Embauché", "Applied": "Postulé", "Candidates": "Candidats",
    "All": "Tous", "Yes": "Oui", "No": "Non", "None": "Aucun",
    "Something went wrong": "Une erreur s'est produite",
    "No results found": "Aucun résultat trouvé",
    "This field is required": "Ce champ est obligatoire",
  },
  es: {
    "Home": "Inicio", "Jobs": "Empleos", "Messages": "Mensajes", "Applications": "Solicitudes",
    "Profile": "Perfil", "Settings": "Configuración", "Admin": "Administración", "Academy": "Academia",
    "Analytics": "Análisis", "Meetings": "Reuniones", "Today": "Hoy", "Yesterday": "Ayer",
    "Save": "Guardar", "Cancel": "Cancelar", "Delete": "Eliminar", "Edit": "Editar",
    "Search": "Buscar", "Filter": "Filtrar", "Loading...": "Cargando...", "Close": "Cerrar",
    "Confirm": "Confirmar", "Continue": "Continuar", "Back": "Atrás", "Next": "Siguiente",
    "Previous": "Anterior", "Submit": "Enviar", "Download": "Descargar", "Upload": "Subir",
    "View": "Ver", "Start": "Iniciar", "Join": "Unirse", "Refresh": "Actualizar",
    "Try Again": "Reintentar", "Archive": "Archivar", "Restore": "Restaurar",
    "Pending": "Pendiente", "Approved": "Aprobado", "Declined": "Rechazado", "Active": "Activo",
    "Completed": "Completado", "In Progress": "En progreso", "Success": "Éxito", "Error": "Error",
    "Warning": "Advertencia", "Info": "Información", "Loading": "Cargando",
    "Good morning": "Buenos días", "Good afternoon": "Buenas tardes", "Good evening": "Buenas noches",
    "Welcome back": "Bienvenido de nuevo", "Dashboard": "Panel de control", "Overview": "Resumen",
    "All": "Todos", "Yes": "Sí", "No": "No", "None": "Ninguno",
    "Something went wrong": "Algo salió mal",
    "No results found": "No se encontraron resultados",
    "This field is required": "Este campo es obligatorio",
  },
  zh: {
    "Home": "首页", "Jobs": "职位", "Messages": "消息", "Applications": "申请",
    "Profile": "个人资料", "Settings": "设置", "Admin": "管理", "Academy": "学院",
    "Analytics": "分析", "Meetings": "会议", "Today": "今天", "Yesterday": "昨天",
    "Save": "保存", "Cancel": "取消", "Delete": "删除", "Edit": "编辑",
    "Search": "搜索", "Filter": "筛选", "Loading...": "加载中...", "Close": "关闭",
    "Confirm": "确认", "Continue": "继续", "Back": "返回", "Next": "下一步",
    "Submit": "提交", "Download": "下载", "Upload": "上传", "View": "查看",
    "Pending": "待处理", "Approved": "已批准", "Active": "活跃", "Completed": "已完成",
    "Success": "成功", "Error": "错误", "Warning": "警告", "Loading": "加载中",
    "Good morning": "早上好", "Good afternoon": "下午好", "Good evening": "晚上好",
    "Welcome back": "欢迎回来", "Dashboard": "仪表盘", "Overview": "概览",
    "All": "全部", "Yes": "是", "No": "否", "None": "无",
    "Something went wrong": "出了些问题",
    "No results found": "未找到结果",
    "This field is required": "此字段为必填项",
  },
  ar: {
    "Home": "الرئيسية", "Jobs": "الوظائف", "Messages": "الرسائل", "Applications": "الطلبات",
    "Profile": "الملف الشخصي", "Settings": "الإعدادات", "Admin": "الإدارة", "Academy": "الأكاديمية",
    "Analytics": "التحليلات", "Meetings": "الاجتماعات", "Today": "اليوم", "Yesterday": "أمس",
    "Save": "حفظ", "Cancel": "إلغاء", "Delete": "حذف", "Edit": "تعديل",
    "Search": "بحث", "Filter": "تصفية", "Loading...": "جارٍ التحميل...", "Close": "إغلاق",
    "Confirm": "تأكيد", "Continue": "متابعة", "Back": "رجوع", "Next": "التالي",
    "Submit": "إرسال", "Download": "تنزيل", "Upload": "رفع", "View": "عرض",
    "Pending": "قيد الانتظار", "Approved": "موافق عليه", "Active": "نشط", "Completed": "مكتمل",
    "Success": "نجاح", "Error": "خطأ", "Warning": "تحذير", "Loading": "جارٍ التحميل",
    "Good morning": "صباح الخير", "Good afternoon": "مساء الخير", "Good evening": "مساء الخير",
    "Welcome back": "مرحباً بعودتك", "Dashboard": "لوحة التحكم", "Overview": "نظرة عامة",
    "All": "الكل", "Yes": "نعم", "No": "لا", "None": "لا شيء",
    "Something went wrong": "حدث خطأ ما",
    "No results found": "لم يتم العثور على نتائج",
    "This field is required": "هذا الحقل مطلوب",
  },
  ru: {
    "Home": "Главная", "Jobs": "Вакансии", "Messages": "Сообщения", "Applications": "Заявки",
    "Profile": "Профиль", "Settings": "Настройки", "Admin": "Администрирование", "Academy": "Академия",
    "Analytics": "Аналитика", "Meetings": "Встречи", "Today": "Сегодня", "Yesterday": "Вчера",
    "Save": "Сохранить", "Cancel": "Отмена", "Delete": "Удалить", "Edit": "Редактировать",
    "Search": "Поиск", "Filter": "Фильтр", "Loading...": "Загрузка...", "Close": "Закрыть",
    "Confirm": "Подтвердить", "Continue": "Продолжить", "Back": "Назад", "Next": "Далее",
    "Submit": "Отправить", "Download": "Скачать", "Upload": "Загрузить", "View": "Просмотр",
    "Pending": "Ожидание", "Approved": "Одобрено", "Active": "Активный", "Completed": "Завершено",
    "Success": "Успех", "Error": "Ошибка", "Warning": "Предупреждение", "Loading": "Загрузка",
    "Good morning": "Доброе утро", "Good afternoon": "Добрый день", "Good evening": "Добрый вечер",
    "Welcome back": "С возвращением", "Dashboard": "Панель управления", "Overview": "Обзор",
    "All": "Все", "Yes": "Да", "No": "Нет", "None": "Нет",
    "Something went wrong": "Что-то пошло не так",
    "No results found": "Результатов не найдено",
    "This field is required": "Это поле обязательно",
  }
};

// ============================================================
// TRANSLATION ENGINE
// ============================================================

/**
 * Check if a value should NOT be translated
 */
function shouldSkip(key, value) {
  if (typeof value !== 'string') return true;
  // Skip empty strings
  if (value.length === 0) return true;
  // Skip very short strings (1-2 chars) - abbreviations, symbols
  if (value.length <= 2) return true;
  // Skip numbers-only
  if (/^[\d\s.,;:!?%$€£¥#+\-*/=@()\[\]{}|\\<>]+$/.test(value)) return true;
  // Skip URLs, emails
  if (/^(https?:\/\/|mailto:|tel:)/.test(value)) return true;
  // Skip placeholder-only values like {{variable}}
  if (/^\{\{.+\}\}$/.test(value)) return true;
  // Skip Supabase column selectors (contain commas and identifiers like "id, full_name")
  if (/^[a-z_]+(\([a-z_]+\))?(,\s*[a-z_!]+(\([a-z_,\s:!]+\))?)+$/i.test(value)) return true;
  // Skip locale codes
  if (/^[a-z]{2}-[A-Z]{2}$/.test(value)) return true;
  // Skip values that are just branding
  const brandsOnly = ['Club OS', 'ClubOS', 'The Quantum Club', 'Club AI', 'Club Pilot',
    'Club Radio', 'Club Home', 'ClubSync', 'ClubHome', 'WhatsApp', 'LinkedIn',
    'Google', 'GitHub', 'Apple', 'Moneybird', 'Stripe', 'PDF', 'CSV', 'API',
    'MFA', 'AUC-ROC', 'NPS', 'ROI', 'KPI', 'SLA', 'DPA', 'BAA', 'SSL',
    'GDPR', 'GPT-5', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'WhatsApp Business',
    'TQC Team'];
  if (brandsOnly.includes(value.trim())) return true;
  // Skip key patterns that are Supabase query selectors
  if (/^[a-z_]+(,\s*[a-z_!:()]+)+$/.test(key)) return true;
  
  return false;
}

/**
 * Translate a single value using the dictionary  
 */
function translate(value, lang) {
  const dict = TRANSLATIONS[lang];
  if (!dict) return null;
  
  // Direct match
  if (dict[value]) return dict[value];
  
  return null; // No translation found in dictionary
}

/**
 * Deep process a JSON object, translating values that are still in English
 */
function processObject(enObj, langObj, lang, path = '') {
  let translated = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (const [key, enValue] of Object.entries(enObj)) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (enValue && typeof enValue === 'object' && !Array.isArray(enValue)) {
      if (!langObj[key] || typeof langObj[key] !== 'object') {
        langObj[key] = {};
      }
      const sub = processObject(enValue, langObj[key], lang, fullPath);
      translated += sub.translated;
      skipped += sub.skipped;
      notFound += sub.notFound;
    } else if (typeof enValue === 'string') {
      // Only translate if the current value is the same as English
      if (langObj[key] === enValue) {
        if (shouldSkip(fullPath, enValue)) {
          skipped++;
          continue;
        }
        
        const newValue = translate(enValue, lang);
        if (newValue) {
          langObj[key] = newValue;
          translated++;
        } else {
          notFound++;
        }
      }
    }
  }
  
  return { translated, skipped, notFound };
}

// ============================================================
// MAIN
// ============================================================

const NAMESPACES = [
  'admin', 'analytics', 'auth', 'candidates', 'common',
  'compliance', 'contracts', 'jobs', 'meetings', 'messages',
  'onboarding', 'partner', 'settings'
];

let grandTotal = { translated: 0, skipped: 0, notFound: 0 };

for (const lang of TARGET_LANGUAGES) {
  let langTotal = { translated: 0, skipped: 0, notFound: 0 };
  
  for (const ns of NAMESPACES) {
    const enFile = join(LOCALES_DIR, 'en', `${ns}.json`);
    const langFile = join(LOCALES_DIR, lang, `${ns}.json`);
    
    if (!existsSync(enFile) || !existsSync(langFile)) continue;
    
    const enData = JSON.parse(readFileSync(enFile, 'utf-8'));
    const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
    
    const result = processObject(enData, langData, lang);
    
    if (result.translated > 0) {
      writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n');
      console.log(`✅ ${lang}/${ns}.json — ${result.translated} translated, ${result.skipped} skipped, ${result.notFound} no-dict-match`);
    }
    
    langTotal.translated += result.translated;
    langTotal.skipped += result.skipped;
    langTotal.notFound += result.notFound;
  }
  
  console.log(`  📊 ${lang} total: ${langTotal.translated} translated, ${langTotal.notFound} need manual translation\n`);
  grandTotal.translated += langTotal.translated;
  grandTotal.skipped += langTotal.skipped;
  grandTotal.notFound += langTotal.notFound;
}

console.log(`\n${'='.repeat(60)}`);
console.log(`  GRAND TOTAL: ${grandTotal.translated} values translated`);
console.log(`  Still needing translation: ${grandTotal.notFound}`);
console.log(`  Skipped (technical/branding): ${grandTotal.skipped}`);
console.log(`${'='.repeat(60)}\n`);
