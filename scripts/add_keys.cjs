const fs = require('fs');

// Update EN partner.json
const en = JSON.parse(fs.readFileSync('src/i18n/locales/en/partner.json','utf-8'));
if (!en.jobsCompactHeader.menu.applicationsHub) en.jobsCompactHeader.menu.applicationsHub = 'Applications Hub';
if (!en.jobsCompactHeader.menu.companySettings) en.jobsCompactHeader.menu.companySettings = 'Company Settings';
if (!en.jobsCompactHeader.menu.companyManagement) en.jobsCompactHeader.menu.companyManagement = 'Company Management';
if (!en.jobsCompactHeader.menu.aiConfiguration) en.jobsCompactHeader.menu.aiConfiguration = 'AI Configuration';
if (!en.jobsCompactHeader.menu.clubSyncRequests) en.jobsCompactHeader.menu.clubSyncRequests = 'Club Sync Requests';
if (!en.jobsCompactHeader.menu.globalAnalytics) en.jobsCompactHeader.menu.globalAnalytics = 'Global Analytics';
if (!en.jobsCompactHeader.menu.refreshData) en.jobsCompactHeader.menu.refreshData = 'Refresh Data';
if (!en.jobsCompactHeader.tooltip) en.jobsCompactHeader.tooltip = {};
if (!en.jobsCompactHeader.tooltip.search) en.jobsCompactHeader.tooltip.search = 'Search (/ key)';
fs.writeFileSync('src/i18n/locales/en/partner.json', JSON.stringify(en, null, 2) + '\n');
console.log('EN partner.json updated');

// Update FR partner.json
const fr = JSON.parse(fs.readFileSync('src/i18n/locales/fr/partner.json','utf-8'));
if (!fr.jobsCompactHeader.menu.applicationsHub) fr.jobsCompactHeader.menu.applicationsHub = 'Centre des candidatures';
if (!fr.jobsCompactHeader.menu.companySettings) fr.jobsCompactHeader.menu.companySettings = 'Paramètres entreprise';
if (!fr.jobsCompactHeader.menu.companyManagement) fr.jobsCompactHeader.menu.companyManagement = 'Gestion des entreprises';
if (!fr.jobsCompactHeader.menu.aiConfiguration) fr.jobsCompactHeader.menu.aiConfiguration = 'Configuration IA';
if (!fr.jobsCompactHeader.menu.clubSyncRequests) fr.jobsCompactHeader.menu.clubSyncRequests = 'Demandes Club Sync';
if (!fr.jobsCompactHeader.menu.globalAnalytics) fr.jobsCompactHeader.menu.globalAnalytics = 'Analytique globale';
if (!fr.jobsCompactHeader.menu.refreshData) fr.jobsCompactHeader.menu.refreshData = 'Actualiser';
if (!fr.jobsCompactHeader.tooltip) fr.jobsCompactHeader.tooltip = {};
if (!fr.jobsCompactHeader.tooltip.search) fr.jobsCompactHeader.tooltip.search = 'Rechercher (touche /)';
fs.writeFileSync('src/i18n/locales/fr/partner.json', JSON.stringify(fr, null, 2) + '\n');
console.log('FR partner.json updated');

// Update NL partner.json
const nl = JSON.parse(fs.readFileSync('src/i18n/locales/nl/partner.json','utf-8'));
if (!nl.jobsCompactHeader) nl.jobsCompactHeader = { menu: {}, tooltip: {} };
if (!nl.jobsCompactHeader.menu) nl.jobsCompactHeader.menu = {};
if (!nl.jobsCompactHeader.tooltip) nl.jobsCompactHeader.tooltip = {};
nl.jobsCompactHeader.menu.applicationsHub = 'Sollicitatie Hub';
nl.jobsCompactHeader.menu.companySettings = 'Bedrijfsinstellingen';
nl.jobsCompactHeader.menu.companyManagement = 'Bedrijfsbeheer';
nl.jobsCompactHeader.menu.aiConfiguration = 'AI Configuratie';
nl.jobsCompactHeader.menu.clubSyncRequests = 'Club Sync Verzoeken';
nl.jobsCompactHeader.menu.globalAnalytics = 'Globale Analyse';
nl.jobsCompactHeader.menu.refreshData = 'Vernieuwen';
nl.jobsCompactHeader.tooltip.search = 'Zoeken (/ toets)';
fs.writeFileSync('src/i18n/locales/nl/partner.json', JSON.stringify(nl, null, 2) + '\n');
console.log('NL partner.json updated');

// Update DE partner.json
const de = JSON.parse(fs.readFileSync('src/i18n/locales/de/partner.json','utf-8'));
if (!de.jobsCompactHeader) de.jobsCompactHeader = { menu: {}, tooltip: {} };
if (!de.jobsCompactHeader.menu) de.jobsCompactHeader.menu = {};
if (!de.jobsCompactHeader.tooltip) de.jobsCompactHeader.tooltip = {};
de.jobsCompactHeader.menu.applicationsHub = 'Bewerbungszentrale';
de.jobsCompactHeader.menu.companySettings = 'Unternehmenseinstellungen';
de.jobsCompactHeader.menu.companyManagement = 'Unternehmensverwaltung';
de.jobsCompactHeader.menu.aiConfiguration = 'KI-Konfiguration';
de.jobsCompactHeader.menu.clubSyncRequests = 'Club Sync Anfragen';
de.jobsCompactHeader.menu.globalAnalytics = 'Globale Analysen';
de.jobsCompactHeader.menu.refreshData = 'Aktualisieren';
de.jobsCompactHeader.tooltip.search = 'Suchen (/ Taste)';
fs.writeFileSync('src/i18n/locales/de/partner.json', JSON.stringify(de, null, 2) + '\n');
console.log('DE partner.json updated');

console.log('Done adding keys to EN, FR, NL, DE');
