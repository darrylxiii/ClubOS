import { readFileSync, writeFileSync } from 'fs';

const en = JSON.parse(readFileSync('./src/i18n/locales/en/common.json', 'utf8'));
const fr = JSON.parse(readFileSync('./src/i18n/locales/fr/common.json', 'utf8'));

// French translations for all missing sections
const translations = {
  breadcrumbNav: {
    home: "Accueil",
    separator: "/"
  },
  carousel: {
    previous: "Précédent",
    next: "Suivant",
    slide: "Diapositive {{current}} sur {{total}}",
    goToSlide: "Aller à la diapositive {{number}}"
  },
  companyLogo: {
    alt: "Logo de l'entreprise",
    fallback: "Logo"
  },
  academyCreatorHub: {
    text1: "Hub créateur",
    text2: "Créer et gérer les cours de l'académie",
    text3: "Mes cours",
    text4: "Tous les cours",
    text5: "Créer un cours",
    text6: "Brouillons",
    text7: "Publiés",
    text8: "Archivés",
    text9: "Total des inscrits",
    text10: "Note moyenne",
    text11: "Taux d'achèvement",
    text12: "Revenus",
    text13: "Rechercher des cours..."
  },
  adminRejections: {
    text1: "Refusé",
    text2: "Annulé",
    text3: "Retiré",
    text4: "Date",
    text5: "Candidat",
    text6: "Poste",
    text7: "Motif",
    text8: "Actions",
    text9: "Postes refusés et annulés",
    text10: "Rechercher...",
    text11: "Toutes les raisons",
    text12: "Aucun refus trouvé",
    text13: "Aucun résultat ne correspond à vos filtres"
  },
  blogCategory: {
    text1: "Articles",
    text2: "Catégorie"
  },
  blogEngine: {
    text1: "Moteur de blog",
    text2: "Générer et gérer du contenu alimenté par l'IA",
    text3: "File d'attente",
    text4: "Articles",
    text5: "Apprentissages",
    text6: "Paramètres",
    text7: "Analytique",
    text8: "Total des articles",
    text9: "Score de qualité moyen"
  },
  blogPost: {
    text1: "Article non trouvé",
    text2: "Temps de lecture",
    text3: "Partager"
  },
  bookingManagement: {
    text1: "Gestion des réservations",
    text2: "Gérer les pages de réservation et les disponibilités",
    text3: "Mes pages de réservation",
    text4: "Créer une page de réservation",
    text5: "Aucune page de réservation",
    text6: "Créez votre première page de réservation",
    text7: "Nom de la page",
    text8: "Description",
    text9: "Durée (minutes)",
    text10: "Tampon entre les réservations (minutes)",
    text11: "Max réservations par jour",
    text12: "Lien de réservation",
    text13: "Copier le lien",
    text14: "Modifier",
    text15: "Supprimer",
    text16: "Disponibilité",
    text17: "Lundi",
    text18: "Mardi",
    text19: "Mercredi",
    text20: "Jeudi",
    text21: "Vendredi",
    text22: "Samedi",
    text23: "Dimanche",
    text24: "Heure de début",
    text25: "Heure de fin",
    text26: "Réservations à venir",
    text27: "Aucune réservation à venir",
    text28: "Historique des réservations",
    text29: "Confirmé",
    text30: "Annulé",
    text31: "Terminé"
  },
  bookingPage: {
    text1: "Réserver un créneau",
    text2: "Sélectionnez une date et une heure",
    text3: "Créneaux disponibles",
    text4: "Aucun créneau disponible",
    text5: "Votre nom",
    text6: "Votre e-mail",
    text7: "Notes (optionnel)",
    text8: "Confirmer la réservation",
    text9: "Réservation confirmée !"
  },
  careerPath: {
    text1: "Parcours de carrière",
    text2: "Planifiez et suivez votre progression de carrière",
    text3: "Poste actuel",
    text4: "Objectif de carrière",
    text5: "Compétences requises",
    text6: "Écart de compétences",
    text7: "Ressources recommandées",
    text8: "Jalons",
    text9: "Progression",
    text10: "Ajuster l'objectif",
    text11: "Ajouter un jalon",
    text12: "Chronologie",
    text13: "Commencer la planification"
  },
  certificateVerification: {
    text1: "Vérification du certificat",
    text2: "Vérifier un certificat d'achèvement",
    text3: "ID du certificat",
    text4: "Vérifier",
    text5: "Certificat valide",
    text6: "Certificat invalide",
    text7: "Détails du certificat"
  },
  clubAI: {
    text1: "Club AI",
    text2: "Assistant IA",
    text3: "Posez-moi n'importe quelle question...",
    text4: "Propulsé par Club AI"
  },
  clubDJ: {
    text1: "Club DJ",
    text2: "Musique d'ambiance de la plateforme",
    text3: "En cours de lecture",
    text4: "Stations"
  },
  companyApplications: {
    text1: "Candidatures de l'entreprise",
    text2: "Gérer les candidatures pour votre entreprise",
    text3: "Total des candidatures",
    text4: "En cours d'examen",
    text5: "Acceptées",
    text6: "Refusées"
  },
  companyIntelligence: {
    text1: "Intelligence d'entreprise",
    text2: "Insights et analytique alimentés par l'IA",
    text3: "Score de santé",
    text4: "Signaux de risque",
    text5: "Opportunités",
    text6: "Paysage concurrentiel",
    text7: "Tendances du marché",
    text8: "Insights financiers",
    text9: "Analyse de sentiment",
    text10: "Signaux récents",
    text11: "Score de sentiment",
    text12: "Historique des interactions",
    text13: "Contacts clés",
    text14: "Dernière mise à jour",
    text15: "Générer un rapport",
    text16: "Aucun rapport disponible",
    text17: "Exporter les données",
    text18: "Alertes actives",
    text19: "Tendances du secteur",
    text20: "Recommandations",
    text21: "Informations sur les parties prenantes"
  },
  companyPage: {
    text1: "Profil de l'entreprise",
    text2: "À propos",
    text3: "Postes ouverts",
    text4: "Membres de l'équipe",
    text5: "Avis",
    text6: "Avantages",
    text7: "Culture",
    text8: "Localisation",
    text9: "Taille",
    text10: "Fondée en",
    text11: "Site web",
    text12: "Secteur",
    text13: "Aucun poste ouvert",
    text14: "Postuler",
    text15: "Suivre",
    text16: "Partager",
    text17: "Signaler",
    text18: "En savoir plus",
    text19: "Entreprises similaires",
    text20: "Croissance de l'entreprise",
    text21: "Stack technologique",
    text22: "Galerie",
    text23: "Vidéo",
    text24: "Contact RH",
    text25: "Fourchette salariale",
    text26: "Évaluations"
  },
  courseDetail: {
    text1: "Aperçu du cours",
    text2: "Ce que vous apprendrez",
    text3: "Prérequis",
    text4: "Instructeur",
    text5: "Avis",
    text6: "S'inscrire",
    text7: "Reprendre le cours",
    text8: "Modules",
    text9: "Durée estimée",
    text10: "Niveau",
    text11: "Débutant",
    text12: "Intermédiaire",
    text13: "Avancé",
    text14: "Certificat inclus",
    text15: "Inscrits",
    text16: "Note",
    text17: "Dernière mise à jour",
    text18: "Cours terminé !",
    text19: "Télécharger le certificat"
  },
  courseEdit: {
    text1: "Modifier le cours",
    text2: "Titre du cours",
    text3: "Description",
    text4: "Catégorie",
    text5: "Niveau",
    text6: "Image de couverture",
    text7: "Modules",
    text8: "Ajouter un module",
    text9: "Titre du module",
    text10: "Contenu",
    text11: "Vidéo URL",
    text12: "Durée estimée (minutes)",
    text13: "Enregistrer le brouillon",
    text14: "Publier",
    text15: "Aperçu",
    text16: "Paramètres",
    text17: "Supprimer le cours",
    text18: "Langue",
    text19: "Tags",
    text20: "Prérequis",
    text21: "Objectifs d'apprentissage",
    text22: "Certificat"
  },
  coverLetterGenerator: {
    text1: "Générateur de lettre de motivation",
    text2: "Créez une lettre de motivation personnalisée",
    text3: "Titre du poste",
    text4: "Description du poste",
    text5: "Générer",
    text6: "Copier",
    text7: "Télécharger",
    text8: "Régénérer"
  },
  documentManagement: {
    text1: "Gestion des documents",
    text2: "Gérer vos documents et fichiers",
    text3: "Téléverser un document"
  },
  emailSequencingHub: {
    text1: "Hub de séquençage d'e-mails",
    text2: "Créer et gérer des séquences d'e-mails automatisées",
    text3: "Séquences actives",
    text4: "Taux d'ouverture moyen",
    text5: "Taux de réponse moyen",
    text6: "Créer une séquence"
  },
  enhancedProfile: {
    text1: "Profil amélioré",
    text2: "Complétude du profil",
    text3: "Compétences vérifiées",
    text4: "Recommandations",
    text5: "Portfolio",
    text6: "Certifications",
    text7: "Score de visibilité",
    text8: "Qui a vu votre profil",
    text9: "Suggestions",
    text10: "Ajouter une compétence",
    text11: "Mettre à jour le CV",
    text12: "Gérer la visibilité"
  },
  expertMarketplace: {
    text1: "Marketplace d'experts",
    text2: "Trouvez et engagez des experts qualifiés",
    text3: "Rechercher des experts...",
    text4: "Filtrer par compétence",
    text5: "Filtrer par disponibilité",
    text6: "Trier par",
    text7: "Note",
    text8: "Tarif",
    text9: "Expérience",
    text10: "Experts vedettes",
    text11: "Tous les experts",
    text12: "Par heure",
    text13: "Voir le profil",
    text14: "Contacter",
    text15: "Inviter au projet",
    text16: "Disponible",
    text17: "Partiellement disponible",
    text18: "Non disponible",
    text19: "Compétences",
    text20: "Projets terminés",
    text21: "Avis clients",
    text22: "Temps de réponse",
    text23: "Taux de réussite",
    text24: "Niveau de vérification",
    text25: "Aucun expert trouvé",
    text26: "Essayez d'ajuster vos filtres",
    text27: "Catégories populaires",
    text28: "Projets récents",
    text29: "Comment ça marche",
    text30: "Publiez votre projet",
    text31: "Recevez des propositions",
    text32: "Choisissez un expert",
    text33: "Collaborez",
    text34: "Publier un projet"
  },
  feedbackDatabase: {
    text1: "Base de données des retours",
    text2: "Tous les retours et évaluations",
    text3: "Filtrer par type",
    text4: "Filtrer par note",
    text5: "Rechercher...",
    text6: "Type",
    text7: "Note",
    text8: "Commentaire",
    text9: "Date",
    text10: "Source",
    text11: "Aucun retour trouvé",
    text12: "Exporter",
    text13: "Tendances",
    text14: "Note moyenne"
  },
  gigDetailPage: {
    text1: "Détails de la mission",
    text2: "Description",
    text3: "Budget",
    text4: "Durée",
    text5: "Compétences requises",
    text6: "Postuler",
    text7: "Partager",
    text8: "Missions similaires",
    text9: "Contact"
  },
  guestBookingPage: {
    text1: "Réservation invité",
    text2: "Sélectionnez un créneau horaire",
    text3: "Votre nom",
    text4: "Votre e-mail",
    text5: "Téléphone (optionnel)",
    text6: "Notes",
    text7: "Confirmer",
    text8: "Annuler",
    text9: "Créneau confirmé",
    text10: "Erreur de réservation",
    text11: "Chargement...",
    text12: "Aucun créneau disponible",
    text13: "Sélectionner la date",
    text14: "Fuseau horaire",
    text15: "Récapitulatif",
    text16: "Politique d'annulation"
  },
  guestBookingPortal: {
    text1: "Portail de réservation",
    text2: "Réserver une consultation",
    text3: "Choisissez un type de réunion",
    text4: "Sélectionnez une date",
    text5: "Créneaux disponibles",
    text6: "Vos coordonnées",
    text7: "Nom complet",
    text8: "E-mail",
    text9: "Téléphone",
    text10: "Message (optionnel)",
    text11: "Confirmer la réservation",
    text12: "Réservation confirmée",
    text13: "Un e-mail de confirmation a été envoyé",
    text14: "Ajouter au calendrier",
    text15: "Annuler la réservation",
    text16: "Reprogrammer"
  },
  install: {
    text1: "Installer l'application",
    text2: "Obtenez la meilleure expérience",
    text3: "Installer",
    text4: "Plus tard",
    text5: "Accès hors ligne",
    text6: "Notifications push",
    text7: "Expérience native",
    text8: "iOS",
    text9: "Android",
    text10: "Bureau",
    text11: "Étape 1",
    text12: "Étape 2",
    text13: "Étape 3",
    text14: "Fermer"
  },
  interactionsFeed: {
    text1: "Fil d'interactions",
    text2: "Toutes les interactions récentes",
    text3: "E-mail",
    text4: "Appel",
    text5: "Réunion",
    text6: "Note",
    text7: "WhatsApp",
    text8: "LinkedIn",
    text9: "Filtrer par type",
    text10: "Tous les types",
    text11: "Rechercher...",
    text12: "Aujourd'hui",
    text13: "Hier",
    text14: "Cette semaine",
    text15: "Ce mois",
    text16: "Aucune interaction trouvée",
    text17: "Ajouter une interaction",
    text18: "Type",
    text19: "Contact",
    text20: "Résumé",
    text21: "Date",
    text22: "Détails"
  },
  interviewComparison: {
    text1: "Comparaison des entretiens",
    text2: "Comparer les candidats côte à côte",
    text3: "Score global",
    text4: "Compétences techniques",
    text5: "Communication",
    text6: "Adéquation culturelle"
  },
  interviewPrep: {
    text1: "Préparation à l'entretien",
    text2: "Préparez-vous pour votre prochain entretien",
    text3: "Questions courantes",
    text4: "Questions techniques",
    text5: "Questions comportementales",
    text6: "Conseils",
    text7: "Simuler un entretien",
    text8: "Ressources",
    text9: "Guide de l'entreprise",
    text10: "Check-list",
    text11: "Notes",
    text12: "Score de préparation",
    text13: "Progresser",
    text14: "Commencer la préparation"
  },
  interviewPrepChat: {
    text1: "Coach d'entretien IA",
    text2: "Pratiquez avec l'IA",
    text3: "Posez une question...",
    text4: "Démarrer la simulation",
    text5: "Terminer la session",
    text6: "Retour",
    text7: "Score de la session"
  },
  investorPortal: {
    text1: "Portail investisseur",
    text2: "Métriques et rapports pour les investisseurs",
    text3: "Data Room"
  },
  inviteAcceptance: {
    text1: "Accepter l'invitation",
    text2: "Vous avez été invité à rejoindre",
    text3: "Accepter",
    text4: "Refuser",
    text5: "Invitation expirée"
  },
  joinWorkspacePage: {
    text1: "Rejoindre l'espace de travail"
  },
  knowledgeBase: {
    text1: "Base de connaissances",
    text2: "Rechercher dans la base de connaissances...",
    text3: "Articles",
    text4: "Catégories"
  },
  mfaSetup: {
    text1: "Configuration MFA",
    text2: "Sécurisez votre compte avec l'authentification multi-facteurs",
    text3: "Application d'authentification",
    text4: "Scannez le QR code",
    text5: "Code de vérification",
    text6: "Vérifier",
    text7: "Codes de récupération",
    text8: "Enregistrez ces codes en lieu sûr"
  },
  moduleDetail: {
    text1: "Détail du module",
    text2: "Objectifs",
    text3: "Contenu",
    text4: "Évaluations",
    text5: "Ressources",
    text6: "Discussions",
    text7: "Durée estimée",
    text8: "Progression",
    text9: "Marquer comme terminé",
    text10: "Module suivant",
    text11: "Module précédent",
    text12: "Retour au cours"
  },
  moduleEdit: {
    text1: "Modifier le module",
    text2: "Titre",
    text3: "Description",
    text4: "Contenu",
    text5: "Vidéo",
    text6: "Quiz",
    text7: "Ressources",
    text8: "Ajouter une question",
    text9: "Ajouter une ressource",
    text10: "Enregistrer",
    text11: "Annuler",
    text12: "Aperçu",
    text13: "Ordre",
    text14: "Durée estimée"
  },
  moduleManagement: {
    text1: "Gestion des modules",
    text2: "Organiser les modules du cours",
    text3: "Ajouter un module",
    text4: "Réorganiser",
    text5: "Supprimer"
  },
  mySkillsPage: {
    text1: "Mes compétences",
    text2: "Suivez et développez vos compétences",
    text3: "Ajouter une compétence",
    text4: "Évaluation des compétences",
    text5: "Recommandations"
  },
  objectiveWorkspace: {
    text1: "Espace de travail des objectifs",
    text2: "Définir et suivre vos objectifs",
    text3: "Ajouter un objectif",
    text4: "Objectifs actifs",
    text5: "Terminés",
    text6: "Archivés"
  },
  offerComparison: {
    text1: "Comparaison des offres",
    text2: "Comparez vos offres d'emploi",
    text3: "Salaire",
    text4: "Avantages",
    text5: "Localisation",
    text6: "Culture",
    text7: "Croissance",
    text8: "Score global",
    text9: "Ajouter une offre",
    text10: "Recommandation IA"
  },
  privacyPolicy: {
    text1: "Politique de confidentialité",
    text2: "Dernière mise à jour",
    text3: "Introduction",
    text4: "Données collectées",
    text5: "Utilisation des données",
    text6: "Partage des données",
    text7: "Conservation des données",
    text8: "Vos droits",
    text9: "Cookies",
    text10: "Sécurité",
    text11: "Modifications",
    text12: "Contact",
    text13: "DPO",
    text14: "Juridiction",
    text15: "Transferts internationaux",
    text16: "Sous-traitants"
  },
  projectApplyPage: {
    text1: "Postuler au projet",
    text2: "Votre proposition",
    text3: "Tarif proposé",
    text4: "Disponibilité",
    text5: "Lettre de motivation",
    text6: "Portfolio pertinent",
    text7: "Soumettre la candidature",
    text8: "Annuler"
  },
  projectDetailPage: {
    text1: "Détail du projet",
    text2: "Description",
    text3: "Budget",
    text4: "Durée",
    text5: "Compétences requises",
    text6: "Client",
    text7: "Propositions",
    text8: "Postuler",
    text9: "Partager",
    text10: "Jalons",
    text11: "Fichiers",
    text12: "Discussion",
    text13: "Projets similaires",
    text14: "Statut"
  },
  projectsPage: {
    text1: "Projets",
    text2: "Parcourir les projets disponibles",
    text3: "Rechercher des projets...",
    text4: "Filtrer par compétence",
    text5: "Filtrer par budget",
    text6: "Trier par",
    text7: "Aucun projet trouvé",
    text8: "Publier un projet"
  },
  radio: {
    text1: "Radio",
    text2: "Stations"
  },
  radioListen: {
    text1: "Écouter la radio",
    text2: "En cours de lecture",
    text3: "Volume",
    text4: "Stations",
    text5: "Favoris"
  },
  referralProgram: {
    text1: "Programme de parrainage",
    text2: "Parrainez et gagnez des récompenses",
    text3: "Votre lien de parrainage",
    text4: "Copier le lien",
    text5: "Partager",
    text6: "Parrainages envoyés",
    text7: "Parrainages actifs",
    text8: "Parrainages convertis",
    text9: "Récompenses gagnées",
    text10: "Total des gains",
    text11: "En attente",
    text12: "Versé",
    text13: "Comment ça marche",
    text14: "Partagez votre lien",
    text15: "Votre contact s'inscrit",
    text16: "Vous gagnez une récompense",
    text17: "Historique des parrainages",
    text18: "Nom",
    text19: "Statut",
    text20: "Récompense",
    text21: "Date",
    text22: "Conditions"
  },
  resetPasswordSuccess: {
    text1: "Mot de passe réinitialisé",
    text2: "Votre mot de passe a été réinitialisé avec succès",
    text3: "Vous pouvez maintenant vous connecter",
    text4: "Se connecter"
  },
  resetPasswordVerify: {
    text1: "Vérifier la réinitialisation",
    text2: "Saisissez le code envoyé à votre e-mail",
    text3: "Code de vérification",
    text4: "Vérifier",
    text5: "Renvoyer le code"
  },
  sharedProfile: {
    text1: "Profil partagé",
    text2: "Voir le profil complet"
  },
  subscriptionSuccess: {
    text1: "Abonnement réussi",
    text2: "Merci pour votre abonnement !",
    text3: "Vous avez maintenant accès à toutes les fonctionnalités",
    text4: "Commencer"
  },
  teamManagementPage: {
    text1: "Gestion de l'équipe",
    text2: "Gérer les membres et les rôles de votre équipe",
    text3: "Inviter un membre",
    text4: "Membres de l'équipe",
    text5: "Rôles",
    text6: "Invitations en attente",
    text7: "Nom",
    text8: "E-mail",
    text9: "Rôle",
    text10: "Statut",
    text11: "Dernière activité",
    text12: "Actions",
    text13: "Modifier le rôle",
    text14: "Supprimer le membre",
    text15: "Révoquer l'invitation",
    text16: "Aucun membre trouvé",
    text17: "Créer un rôle",
    text18: "Permissions",
    text19: "Rechercher des membres...",
    text20: "Capacité de l'équipe"
  },
  termsOfService: {
    text1: "Conditions d'utilisation",
    text2: "Dernière mise à jour",
    text3: "Acceptation des conditions",
    text4: "Description du service",
    text5: "Comptes utilisateur",
    text6: "Utilisation acceptable",
    text7: "Propriété intellectuelle",
    text8: "Limitation de responsabilité",
    text9: "Résiliation",
    text10: "Modifications",
    text11: "Droit applicable",
    text12: "Contact",
    text13: "Confidentialité",
    text14: "Paiement",
    text15: "Remboursement",
    text16: "Données",
    text17: "Sécurité",
    text18: "Règlement des litiges"
  },
  timeTrackingPage: {
    text1: "Suivi du temps"
  },
  whatsAppImport: {
    text1: "Import WhatsApp",
    text2: "Importer des contacts depuis WhatsApp",
    text3: "Téléverser un export",
    text4: "Sélectionner un fichier",
    text5: "Format pris en charge : .txt, .csv",
    text6: "Aperçu de l'import",
    text7: "Contacts détectés",
    text8: "Doublons",
    text9: "Nouveaux contacts",
    text10: "Commencer l'import",
    text11: "Annuler",
    text12: "Import en cours...",
    text13: "Import terminé",
    text14: "Contacts importés",
    text15: "Erreurs",
    text16: "Réessayer les erreurs",
    text17: "Historique des imports",
    text18: "Date",
    text19: "Contacts",
    text20: "Statut",
    text21: "Actions",
    text22: "Mapper les champs",
    text23: "Nom",
    text24: "Téléphone",
    text25: "Tags",
    text26: "Notes"
  },
  workspaceList: {
    text1: "Espaces de travail",
    text2: "Gérer vos espaces de travail",
    text3: "Créer un espace",
    text4: "Nom",
    text5: "Membres",
    text6: "Créé le",
    text7: "Statut",
    text8: "Actions",
    text9: "Aucun espace de travail",
    text10: "Créez votre premier espace de travail",
    text11: "Modifier",
    text12: "Supprimer",
    text13: "Inviter des membres",
    text14: "Paramètres"
  },
  cRMAnalytics: {
    text1: "Analytique CRM",
    text2: "Métriques de performance du pipeline",
    text3: "Taux de conversion",
    text4: "Valeur du pipeline"
  },
  cRMAutomations: {
    text1: "Automatisations CRM"
  },
  cRMIntegrations: {
    text1: "Intégrations CRM"
  },
  cRMIntelligence: {
    text1: "Intelligence CRM",
    text2: "Insights alimentés par l'IA pour vos deals",
    text3: "Deals à risque",
    text4: "Opportunités",
    text5: "Prochaines actions",
    text6: "Analyse de sentiment",
    text7: "Prédictions",
    text8: "Score du pipeline",
    text9: "Recommandations",
    text10: "Signaux",
    text11: "Tendances"
  },
  cRMSettings: {
    text1: "Paramètres CRM"
  },
  campaignDashboard: {
    text1: "Tableau de bord des campagnes",
    text2: "Gérer et suivre vos campagnes d'outreach",
    text3: "Campagnes actives",
    text4: "E-mails envoyés",
    text5: "Taux d'ouverture",
    text6: "Taux de réponse",
    text7: "Créer une campagne",
    text8: "Toutes les campagnes",
    text9: "Analytique"
  },
  focusView: {
    text1: "Vue focus",
    text2: "Concentrez-vous sur l'essentiel",
    text3: "Tâches prioritaires",
    text4: "Aujourd'hui",
    text5: "Cette semaine"
  },
  importHistory: {
    text1: "Historique des imports",
    text2: "Tous les imports précédents"
  },
  leadScoringConfig: {
    text1: "Configuration du scoring des leads"
  },
  prospectAuditTrail: {
    text1: "Piste d'audit du prospect",
    text2: "Historique complet des actions",
    text3: "Action",
    text4: "Utilisateur",
    text5: "Date",
    text6: "Détails",
    text7: "Filtrer par action",
    text8: "Toutes les actions",
    text9: "Exporter",
    text10: "Aucune activité trouvée"
  },
  prospectDetail: {
    text1: "Détail du prospect",
    text2: "Informations de contact",
    text3: "Entreprise",
    text4: "Score",
    text5: "Statut",
    text6: "Dernière interaction",
    text7: "Historique",
    text8: "Notes",
    text9: "E-mails",
    text10: "Appels",
    text11: "Tâches",
    text12: "Documents",
    text13: "Modifier",
    text14: "Supprimer",
    text15: "Convertir en client",
    text16: "Ajouter une note",
    text17: "Planifier un suivi"
  },
  suppressionList: {
    text1: "Liste de suppression",
    text2: "Gérer les adresses e-mail supprimées",
    text3: "Ajouter une adresse",
    text4: "Importer",
    text5: "Exporter",
    text6: "E-mail",
    text7: "Motif",
    text8: "Ajouté le",
    text9: "Ajouté par",
    text10: "Actions",
    text11: "Supprimer",
    text12: "Aucune adresse dans la liste",
    text13: "Rebond",
    text14: "Désabonnement",
    text15: "Plainte spam",
    text16: "Manuel",
    text17: "Domaine",
    text18: "Rechercher...",
    text19: "Total des adresses",
    text20: "Confirmez la suppression"
  }
};

// Widget translations (small sections)
const widgetTranslations = {
  activeMeetingsWidget: { desc: "Réunions actives en ce moment" },
  agentActivityWidget: { desc: "Activité récente des agents IA" },
  careerProgressWidget: { text1: "Progression de carrière", text2: "Suivez votre avancement" },
  clubPilotTasksWidget: { text1: "Tâches Club Pilot", text2: "Tâches à compléter" },
  dailyBriefingBanner: { text1: "Briefing quotidien" },
  partnerHome: { text1: "Accueil partenaire", text2: "Bienvenue", text3: "Vos métriques clés", text4: "Actions récentes" },
  skillDemandWidget: { text1: "Demande de compétences", text2: "Compétences les plus recherchées" },
  partnerStrategistStrip: { text1: "Votre stratégiste", text2: "Contacter" },
  adminReferralWidget: { text1: "Parrainages", text2: "Ce mois", text3: "Total", text4: "En attente" },
  auditLogSummaryWidget: { text1: "Résumé du journal d'audit", text2: "Événements récents", text3: "Événements aujourd'hui", text4: "Avertissements", text5: "Erreurs" },
  cRMProspectsWidget: { text1: "Prospects CRM", text2: "Prospects actifs", text3: "Nécessitent un suivi" },
  clubAIAnalyticsWidget: { text1: "Analytique Club AI", text2: "Requêtes aujourd'hui", text3: "Taux de satisfaction", text4: "Temps de réponse moyen", text5: "Sessions actives" },
  dealPipelineSummaryWidget: { text1: "Pipeline de deals", text2: "Deals actifs", text3: "Valeur totale", text4: "Taux de conversion", text5: "Fermés ce mois" },
  edgeFunctionHealthWidget: { text1: "Santé des Edge Functions", text2: "Toutes opérationnelles" },
  hiringPipelineOverview: { text1: "Pipeline de recrutement", text2: "Candidats actifs" },
  interviewCommandWidget: { text1: "Centre de commande des entretiens", text2: "Entretiens aujourd'hui" },
  interviewCountdownWidget: { text1: "Prochain entretien" },
  kPISummaryWidget: { text1: "Résumé des KPI", text2: "Sur la cible", text3: "Avertissements", text4: "Critiques", text5: "Total des KPI", text6: "Score de santé", text7: "Dernière mise à jour" },
  liveOperationsWidget: { text1: "Opérations en direct", text2: "Activité en temps réel" },
  messagesPreviewWidget: { text1: "Messages récents" },
  nPSPulseWidget: { text1: "Pouls NPS", text2: "Score NPS actuel", text3: "Réponses" },
  partnerActivityFeed: { text1: "Activité partenaire", text2: "Actions récentes" },
  partnerEngagementWidget: { text1: "Engagement partenaire", text2: "Score d'engagement", text3: "Interactions ce mois", text4: "Postes actifs", text5: "Dernière activité" },
  pendingMemberApprovalsWidget: { text1: "Approbations en attente", text2: "Demandes de membres", text3: "Nouvelles cette semaine", text4: "En attente", text5: "Voir tout" },
  recentApplicationsList: { text1: "Candidatures récentes", text2: "Dernières candidatures", text3: "Voir tout" },
  recruiterTeamWidget: { text1: "Équipe de recrutement", text2: "Membres actifs", text3: "Entretiens aujourd'hui", text4: "Placements ce mois", text5: "Capacité" },
  referralStatsWidget: { text1: "Statistiques de parrainage", text2: "Ce mois", text3: "Total" },
  revenueGrowthWidget: { text1: "Croissance des revenus", text2: "Ce mois", text3: "Croissance", text4: "vs. mois précédent" },
  revenueSparkline: { text1: "Tendance des revenus", text2: "12 derniers mois" },
  salaryInsightsWidget: { text1: "Insights salariaux" },
  savedJobsWidget: { text1: "Postes sauvegardés" },
  securityAlertsWidget: { text1: "Alertes de sécurité" },
  strategistContactCard: { text1: "Votre stratégiste", text2: "Contacter" },
  systemErrorsWidget: { text1: "Erreurs système", text2: "Dernières 24h", text3: "Critiques" },
  talentRecommendations: { text1: "Recommandations de talents", text2: "Candidats suggérés", text3: "Voir tout" },
  taskQueueWidget: { text1: "File de tâches", text2: "Tâches en attente", text3: "Priorité haute", text4: "Voir tout" },
  teamCapacityWidget: { text1: "Capacité de l'équipe" },
  topClientsWidget: { text1: "Meilleurs clients" },
  partnerActivityFeedUnified: { text1: "Activité partenaire" },
  upcomingScheduleWidget: { text1: "Agenda à venir" }
};

// Game/assessment sections
const gameSections = {
  blindSpot: {
    text1: "Angle mort",
    text2: "Découvrez vos biais cognitifs",
    text3: "Commencer",
    text4: "Score",
    text5: "Résultats",
    text6: "Question",
    text7: "Suivant",
    text8: "Précédent",
    text9: "Soumettre",
    text10: "Terminé !",
    text11: "Votre score",
    text12: "Points forts",
    text13: "Axes d'amélioration",
    text14: "Recommandations",
    text15: "Rejouer",
    text16: "Partager",
    text17: "Classement",
    text18: "Temps restant",
    text19: "Progression",
    text20: "Analyse détaillée"
  },
  clubPilot: {
    text1: "Club Pilot",
    text2: "Votre copilote IA pour la productivité",
    text3: "Tâches suggérées",
    text4: "Priorité haute",
    text5: "En cours",
    text6: "Terminé",
    text7: "Ajouter une tâche",
    text8: "Focus du jour",
    text9: "Objectifs de la semaine",
    text10: "Insights IA",
    text11: "Optimiser mon planning",
    text12: "Énergie",
    text13: "Productivité",
    text14: "Score de focus",
    text15: "Blocages",
    text16: "Rappels",
    text17: "Habitudes",
    text18: "Streaks",
    text19: "Rapport hebdomadaire",
    text20: "Paramètres",
    text21: "Notifications"
  },
  clubTasks: {
    text1: "Tâches",
    text2: "Gérer vos tâches",
    text3: "Ajouter une tâche",
    text4: "Titre",
    text5: "Description",
    text6: "Priorité",
    text7: "Date d'échéance",
    text8: "Assigné à",
    text9: "Statut",
    text10: "À faire",
    text11: "En cours",
    text12: "Terminé",
    text13: "Archivé",
    text14: "Filtrer",
    text15: "Trier",
    text16: "Rechercher...",
    text17: "Aucune tâche trouvée",
    text18: "Haute",
    text19: "Moyenne",
    text20: "Basse",
    text21: "Urgente",
    text22: "Modifier",
    text23: "Supprimer",
    text24: "Dupliquer",
    text25: "Sous-tâches",
    text26: "Commentaires",
    text27: "Pièces jointes",
    text28: "Historique",
    text29: "Tags",
    text30: "Vue en liste"
  },
  imageEditor: {
    text1: "Éditeur d'images",
    text2: "Rogner",
    text3: "Pivoter",
    text4: "Filtres",
    text5: "Ajuster",
    text6: "Enregistrer",
    text7: "Annuler"
  },
  landing: {
    text1: "The Quantum Club",
    text2: "Recrutement intelligent propulsé par l'IA",
    text3: "Commencer",
    text4: "En savoir plus",
    text5: "Fonctionnalités",
    text6: "Tarifs",
    text7: "À propos",
    text8: "Contact",
    text9: "Connexion",
    text10: "Inscription",
    text11: "Matching IA",
    text12: "Pipeline intelligent",
    text13: "Analytique avancée",
    text14: "Automatisation",
    text15: "Collaboration",
    text16: "Conformité",
    text17: "Témoignages",
    text18: "FAQ",
    text19: "Blog",
    text20: "Carrières",
    text21: "Partenaires",
    text22: "Investisseurs",
    text23: "Presse",
    text24: "Conditions d'utilisation",
    text25: "Politique de confidentialité",
    text26: "Cookies",
    text27: "Support",
    text28: "Documentation",
    text29: "API",
    text30: "Statut",
    text31: "Newsletter",
    text32: "Votre e-mail",
    text33: "S'abonner",
    text34: "Suivez-nous",
    text35: "Essai gratuit",
    text36: "Démo",
    text37: "Entreprise",
    text38: "Starter",
    text39: "Pro",
    text40: "Par mois",
    text41: "Par an",
    text42: "Contact commercial",
    text43: "Tous droits réservés"
  },
  objectives: {
    text1: "Objectifs",
    text2: "Définissez et suivez vos objectifs",
    text3: "Ajouter un objectif",
    text4: "Titre",
    text5: "Description",
    text6: "Date cible",
    text7: "Priorité",
    text8: "Catégorie",
    text9: "Résultats clés",
    text10: "Ajouter un résultat clé",
    text11: "Progression",
    text12: "En bonne voie",
    text13: "À risque",
    text14: "En retard",
    text15: "Terminé",
    text16: "Archivé",
    text17: "Filtrer par statut",
    text18: "Filtrer par catégorie",
    text19: "Ce trimestre",
    text20: "Ce mois",
    text21: "Cette année",
    text22: "Score global",
    text23: "Modifier",
    text24: "Supprimer",
    text25: "Dupliquer",
    text26: "Partager",
    text27: "Exporter",
    text28: "Check-in",
    text29: "Historique",
    text30: "Vue chronologie",
    text31: "Vue arbre"
  },
  partnerSetup: {
    text1: "Configuration partenaire",
    text2: "Configurez votre espace partenaire",
    text3: "Étape 1 : Profil de l'entreprise",
    text4: "Étape 2 : Préférences",
    text5: "Étape 3 : Équipe"
  },
  pressureCooker: {
    text1: "Cocotte minute",
    text2: "Testez vos compétences sous pression",
    text3: "Commencer",
    text4: "Temps restant",
    text5: "Score",
    text6: "Question",
    text7: "Répondre",
    text8: "Passer",
    text9: "Résultats",
    text10: "Score final",
    text11: "Temps total",
    text12: "Précision",
    text13: "Rejouer"
  },
  swipeGame: {
    text1: "Jeu de swipe",
    text2: "Swipez pour évaluer les candidats",
    text3: "Accepter",
    text4: "Refuser",
    text5: "Peut-être",
    text6: "Détails",
    text7: "Compétences",
    text8: "Expérience",
    text9: "Formation",
    text10: "Score de compatibilité",
    text11: "Aucun candidat restant",
    text12: "Résultats de la session",
    text13: "Acceptés",
    text14: "Refusés",
    text15: "En attente",
    text16: "Recommencer",
    text17: "Voir les détails",
    text18: "Filtres"
  },
  valuesPoker: {
    text1: "Poker des valeurs",
    text2: "Classez vos valeurs professionnelles",
    text3: "Commencer",
    text4: "Choisissez la plus importante",
    text5: "Progression",
    text6: "Résultats",
    text7: "Votre top 5",
    text8: "Explication",
    text9: "Partager",
    text10: "Rejouer",
    text11: "Comparaison avec les pairs",
    text12: "Score de compatibilité",
    text13: "Postes recommandés",
    text14: "Insights",
    text15: "Historique",
    text16: "Tendances"
  },
  voice: {
    text1: "Commandes vocales",
    text2: "Parlez pour naviguer",
    text3: "Écoute en cours...",
    text4: "Non reconnu",
    text5: "Réessayez",
    text6: "Désactiver"
  },
  timeTracking: {
    text1: "Suivi du temps"
  },
  legalPages: {
    text1: "Pages juridiques",
    text2: "Conditions d'utilisation",
    text3: "Politique de confidentialité",
    text4: "Politique de cookies",
    text5: "RGPD",
    text6: "DPA",
    text7: "SLA",
    text8: "Dernière mise à jour",
    text9: "Version",
    text10: "Télécharger en PDF",
    text11: "Contact juridique"
  },
  booking: {
    text1: "Réservation",
    text2: "Réserver un créneau",
    text3: "Sélectionnez une date",
    text4: "Créneaux disponibles",
    text5: "Confirmer",
    text6: "Annuler",
    text7: "Reprogrammer",
    text8: "Votre réservation",
    text9: "Confirmation"
  },
  presence: {
    text1: "Présence",
    text2: "En ligne",
    text3: "Hors ligne"
  }
};

// Simple leaf keys
const leafKeys = {
  clearAll: "Tout effacer",
  gotIt: "Compris",
  "Live Now": "En direct",
  remove: "Supprimer",
  saveChanges: "Enregistrer les modifications",
  tryAgain: "Réessayer",
  viewAll: "Voir tout",
  viewDetails: "Voir les détails",
  youreFullyActivated: "Vous êtes entièrement activé",
  yourHiringSetup: "Votre configuration de recrutement",
  // Keep technical ones as-is
  application_status: "Application_status",
  assigned_strategist_id: "Assigned_strategist_id",
  conversation_id: "Conversation_id",
  resume_url: "Resume_url",
  scheduled_start: "Scheduled_start",
  task_id: "Task_id",
  updated_at: "Updated_at",
  user_id: "User_id",
  " ": " "
};

// Apply all translations
for (const [key, value] of Object.entries(translations)) {
  fr[key] = value;
}
for (const [key, value] of Object.entries(widgetTranslations)) {
  fr[key] = value;
}
for (const [key, value] of Object.entries(gameSections)) {
  fr[key] = value;
}
for (const [key, value] of Object.entries(leafKeys)) {
  fr[key] = value;
}

// Now handle missing keys within existing sections
function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const withinTranslations = {
  "actions.retrySidebar": "Réessayer le chargement de la barre latérale",
  "actions.quickActions": "Actions rapides",
  "errors.retrying": "Nouvelle tentative...",
  "empty.tips": "Conseils",
  "empty.tryAdjusting": "Essayez d'ajuster votre recherche ou vos filtres",
  "empty.tipDifferentKeywords": "Essayez d'utiliser des mots-clés différents",
  "empty.tipCheckSpelling": "Vérifiez votre orthographe",
  "empty.tipRemoveFilters": "Supprimez certains filtres pour voir plus de résultats",
  "empty.nothingHereYet": "Rien ici pour le moment",
  "empty.dataWillAppear": "Les données apparaîtront ici une fois disponibles",
  "empty.noItemsFound": "Aucun élément trouvé",
  "empty.getStartedAdding": "Commencez par ajouter votre premier élément",
  "empty.noMatchingItems": "Aucun élément correspondant",
  "empty.tryChangingFilters": "Essayez de modifier vos filtres pour voir plus de résultats",
  "pagination.label": "pagination",
  "models.gpt5": "GPT-5",
  "models.gpt5Desc": "Modèle phare d'OpenAI",
  "password.medium": "Moyen",
  "notifications.dismiss": "Ignorer",
  "notifications.stayInTheLoop": "Restez informé",
  "notifications.getNotifiedAboutInterviewInvitesJobMatch": "Recevez des notifications pour les invitations à des entretiens, les offres correspondantes et les messages des recruteurs.",
  "notifications.maybeLater": "Peut-être plus tard",
  "applicationDetail.text1": "Candidature introuvable",
  "applicationDetail.text2": "Pipeline de candidature et préparation",
  "applicationDetail.text3": "Votre stratégiste talents",
  "applicationDetail.text4": "Cliquez pour voir le profil",
  "applicationDetail.text5": "Ressources :",
  "applicationDetail.text6": "Planifié",
  "applicationDetail.text7": "À propos du poste",
  "applicationDetail.text8": "Exigences",
  "applicationDetail.text9": "Avantages",
  "applicationDetail.text10": "Prochaine étape",
  "applicationDetail.text11": "Insights de la candidature",
  "applicationDetail.text12": "Votre stratégiste talents",
  "applicationDetail.text13": "Cliquez pour voir le profil",
  "admin.title": "Panneau de contrôle administrateur",
  "admin.desc": "Gérer les entreprises, les utilisateurs et la configuration du système",
  "admin.desc2": "La gestion des utilisateurs a été déplacée vers son propre hub dédié.",
  "admin.desc3": "Accédez au tableau de bord complet de fusion pour lier manuellement les candidats aux comptes utilisateurs",
  "admin.desc4": "Examiner et approuver les nouvelles demandes de membres des candidats et partenaires",
  "admin.tabCompanies": "Entreprises",
  "admin.tabRevenue": "Revenus",
  "admin.tabActivity": "Activité",
  "admin.tabMerge": "Fusion",
  "admin.tabMemberrequests": "Demandes de membres",
  "admin.tabApplications": "Candidatures",
  "admin.tabAchievements": "Réalisations",
  "admin.tabAssessments": "Évaluations",
  "admin.tabSecurity": "Sécurité",
  "admin.tabSystemhealth": "Santé du système",
  "admin.tabCompliance": "Conformité",
  "admin.tabSupport": "Support",
  "academy.text1": "Chargement de l'académie...",
  "academy.text2": "Académie introuvable",
  "academy.text3": "Retour à l'accueil",
  "academy.text4": "Tableau de bord",
  "academy.text5": "Mes cours",
  "academy.text6": "Explorer",
  "academy.text7": "Cours en vedette",
  "academy.text8": "Continuer l'apprentissage",
  "academy.text9": "Tendances",
  "academy.text10": "Nouveautés",
  "academy.text11": "Tous les supports",
  "academy.text12": "Tous les statuts",
  "academy.text13": "Non commencé",
  "academy.text14": "En cours",
  "academy.text15": "Terminé",
  "academy.text16": "Rechercher...",
  "academy.text17": "Aucun cours pour le moment",
  "academy.text18": "Rechercher des cours...",
  "academy.text19": "Aucun cours pour le moment",
  "academy.exploreOurAcademyCourses": "Explorez nos cours d'académie",
  "academy.masterTheSkillsThatMatter": "Maîtrisez les compétences qui comptent.",
  "academy.noImage": "Pas d'image",
  "academy.startLearning ": "Commencer l'apprentissage →",
  "academy.filters": "Filtres",
  "academy.sortBy": "Trier par",
  "academy.shareYourThoughtsAboutThisCourse": "Partagez votre avis sur ce cours...",
  "academy.yourReviewOptional": "Votre avis (optionnel)",
  "academy.wouldYouRecommendThisCourse": "Recommanderiez-vous ce cours ?",
  "academy.whatWillStudentsLearnInThisModule": "Qu'apprendront les étudiants dans ce module ?",
  "academy.moduleTitle ": "Titre du module *",
  "academy.description ": "Description *",
  "academy.estimatedTimeMinutes": "Durée estimée (minutes)",
  "academy.featuredCourseOfTheWeek": "Cours en vedette de la semaine",
  "academy.jobsMatchingYourSkills": "Postes correspondant à vos compétences",
  "academy.completeMoreCoursesToUnlockJobMatches": "Terminez plus de cours pour débloquer les correspondances de postes",
  "academy.view": "Voir",
  "academy.topLearnersInTheQuantumClubAcademy": "Meilleurs apprenants de l'académie The Quantum Club",
  "academy.finishedWatchingMarkThisModuleAsComplete": "Vous avez terminé ? Marquez ce module comme terminé",
  "academy.takeNotesWhileYouLearnAutosavesEvery2S": "Prenez des notes pendant votre apprentissage... Sauvegarde automatique toutes les 2 secondes",
  "academy.keepLearningDailyToMaintainYourStreak": "Continuez à apprendre quotidiennement pour maintenir votre série !",
  "academy.completeCoursesToUnlockAchievements": "Terminez des cours pour débloquer des réalisations !",
  "academy.courseCount": "{{count}} cours",
  "academy.courseCount_other": "{{count}} cours",
  "academy.resultCount": "{{count}} résultat",
  "academy.resultCount_other": "{{count}} résultats",
  "academy.lessonCount": "{{count}} leçons",
  "incubator.askForHelpWithCalculationsStrategyOrSpec": "Demandez de l'aide pour les calculs, la stratégie ou des sections spécifiques...",
  "incubator.analyzingYourQuestion": "Analyse de votre question...",
  "incubator.pressEnterToSendShiftEnterForNewLine": "Appuyez sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne",
  "incubator.aIAssistantIsInitializingPleaseWaitAMome": "L'assistant IA s'initialise. Veuillez patienter un instant et réessayer.",
  "incubator.rateLimitReachedPleaseWaitAMoment": "Limite de débit atteinte. Veuillez patienter un instant.",
  "incubator.aICreditsDepletedPleaseAddFunds": "Crédits IA épuisés. Veuillez ajouter des fonds.",
  "incubator.readCarefullyYouHave45Seconds": "Lisez attentivement. Vous avez 45 secondes.",
  "incubator.budget12Weeks": "Budget (12 semaines)",
  "incubator.autoadvancingIn": "Avancement automatique dans",
  "incubator.imReadyStartNow": "Je suis prêt — Commencer maintenant",
  "incubator.askQuestionsRunCalculationsAndGetStrateg": "Posez des questions, effectuez des calculs et obtenez des retours stratégiques",
  "incubator.need300450WordsTotalToProceed": "300 à 450 mots au total nécessaires pour continuer",
  "incubator.reviewYourOnepagerAndOptionallyAddA30sec": "Examinez votre one-pager et ajoutez optionnellement une justification vocale de 30 secondes.",
  "incubator.voiceRationaleOptional": "Justification vocale (optionnel)",
  "incubator.recordA30secondExplanationOfYourStrategy": "Enregistrez une explication de 30 secondes de votre stratégie. Cela nous aide à comprendre votre réflexion.",
  "incubator.lockInYourNorthStarTheseAnswersWillGuide": "Verrouillez votre étoile polaire. Ces réponses guideront votre plan et nous aideront à mesurer",
  "incubator.answerEachQuestionIn12SentencesBeSpecifi": "Répondez à chaque question en 1 à 2 phrases. Soyez précis et concis.",
  "incubator.lockInFrameworkContinue": "Verrouiller le cadre et continuer",
  "incubator.fillOutAllFieldsToContinue": "Remplissez tous les champs pour continuer",
  "assessments.title": "Centre d'évaluation",
  "assessments.desc": "Découvrez vos forces et débloquez des opportunités grâce à nos évaluations complètes",
  "achievements.title": "Chronologie de l'ascension",
  "achievements.desc": "Votre parcours quantique à travers les réalisations",
  "achievements.desc2": "Créez et gérez des réalisations personnalisées pour votre entreprise",
  "achievements.desc3": "Votre parcours quantique à travers les réalisations",
  "achievements.tabAchievementgallery": "Galerie des réalisations",
  "achievements.tabCommunityfeed": "Fil de la communauté",
  "achievements.tabLeaderboard": "Classement",
  "achievements.tabAchievementpaths": "Parcours de réalisations",
  "achievements.tabCustomcompanyachievements": "Réalisations personnalisées de l'entreprise",
  "achievements.completeChallengeForXP": "Complétez le défi pour gagner des XP bonus !",
  "achievements.progress": "Progression",
  "achievements.reactionRemoved": "Réaction supprimée",
  "achievements.applauseSent": "Applaudissements quantiques envoyés !",
  "achievements.failedToReact": "Échec de la réaction",
  "achievements.achievements": "réalisations",
  "achievements.thisMonth": "Ce mois",
  "achievements.unlockInSequence": "Débloquez les réalisations dans l'ordre pour progresser dans les arbres de compétences",
  "achievements.lastProgress": "Dernière progression",
  "achievements.completeChallengeToUnlock": "Complétez le défi pour débloquer cette réalisation",
  "achievements.youDiscoveredSecret": "Vous avez découvert ce secret !",
  "achievements.sharedToFeed": "Réalisation partagée dans votre fil !",
  "achievements.searchPlaceholder": "Rechercher des réalisations..."
};

// Handle nested keys within existing sections using the EN values for sub-objects
const enAcademyNav = en.academy?.nav;
if (enAcademyNav && typeof enAcademyNav === 'object') {
  setNested(fr, 'academy.nav', {
    home: "Accueil",
    courses: "Cours",
    progress: "Progression",
    certificates: "Certificats"
  });
}

const enAchievementsCategories = en.achievements?.categories;
if (enAchievementsCategories) {
  setNested(fr, 'achievements.categories', {
    all: "Toutes",
    career: "Carrière",
    learning: "Apprentissage",
    community: "Communauté",
    platform: "Plateforme",
    networking: "Réseau",
    milestone: "Jalon",
    secret: "Secret"
  });
}

const enAchievementsRarities = en.achievements?.rarities;
if (enAchievementsRarities) {
  setNested(fr, 'achievements.rarities', {
    common: "Commun",
    uncommon: "Peu commun",
    rare: "Rare",
    epic: "Épique",
    legendary: "Légendaire"
  });
}

const enAchievementsActions = en.achievements?.actions;
if (enAchievementsActions) {
  setNested(fr, 'achievements.actions', {
    share: "Partager",
    celebrate: "Célébrer",
    viewDetails: "Voir les détails",
    claimReward: "Réclamer la récompense",
    startChallenge: "Commencer le défi",
    trackProgress: "Suivre la progression",
    viewPath: "Voir le parcours",
    compareWithPeers: "Comparer avec les pairs"
  });
}

const enAchievementsEstimates = en.achievements?.estimates;
if (enAchievementsEstimates) {
  setNested(fr, 'achievements.estimates', {
    minutes: "minutes",
    hours: "heures",
    days: "jours",
    weeks: "semaines",
    estimated: "Estimation"
  });
}

// Apply within-section translations
for (const [path, value] of Object.entries(withinTranslations)) {
  setNested(fr, path, value);
}

// Check the careerProgressWidget has right number of keys
if (en.careerProgressWidget) {
  const enKeys = Object.keys(en.careerProgressWidget);
  const frKeys = Object.keys(fr.careerProgressWidget || {});
  for (const k of enKeys) {
    if (!frKeys.includes(k) && !(k in (fr.careerProgressWidget || {}))) {
      console.log('Missing in careerProgressWidget:', k);
    }
  }
}

// Check skillDemandWidget
if (en.skillDemandWidget) {
  const enKeys = Object.keys(en.skillDemandWidget);
  for (const k of enKeys) {
    if (!(k in (fr.skillDemandWidget || {}))) {
      console.log('Missing in skillDemandWidget:', k, '=', en.skillDemandWidget[k]);
    }
  }
}

writeFileSync('./src/i18n/locales/fr/common.json', JSON.stringify(fr, null, 2) + '\n');

// Final verification
function countKeys(obj) {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}

function findMissing(enObj, frObj, prefix) {
  const missing = [];
  for (const key of Object.keys(enObj)) {
    if (!(key in frObj)) {
      missing.push(prefix + key);
    } else if (typeof enObj[key] === 'object' && enObj[key] !== null && typeof frObj[key] === 'object' && frObj[key] !== null) {
      missing.push(...findMissing(enObj[key], frObj[key], prefix + key + '.'));
    }
  }
  return missing;
}

const frNew = JSON.parse(readFileSync('./src/i18n/locales/fr/common.json', 'utf8'));
const stillMissing = findMissing(en, frNew, '');
console.log('\nEN keys:', countKeys(en));
console.log('FR keys:', countKeys(frNew));
console.log('Still missing:', stillMissing.length);
if (stillMissing.length > 0 && stillMissing.length <= 30) {
  stillMissing.forEach(m => console.log('-', m));
}
