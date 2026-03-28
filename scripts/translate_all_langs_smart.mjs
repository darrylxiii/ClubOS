#!/usr/bin/env node
/**
 * Multi-Language Smart Translator
 * Applies the same value-matching approach to ALL target languages
 * Using comprehensive EN→target dictionaries for DE, FR, ES, ZH, AR, RU
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const LOCALES = resolve(import.meta.dirname, '../src/i18n/locales');
const NAMESPACES = ['admin','analytics','auth','candidates','common','compliance','contracts','jobs','meetings','messages','onboarding','partner','settings'];

const DICTS = {
  de: {
    "Strong Growth": "Starkes Wachstum", "Active Users": "Aktive Benutzer", "New Users": "Neue Benutzer",
    "Total Users": "Gesamt Benutzer", "Engagement Rate": "Engagement-Rate", "Suspended": "Gesperrt",
    "Search Candidates": "Kandidaten suchen", "Filter by Status": "Nach Status filtern",
    "Sort by": "Sortieren nach", "Sort By": "Sortieren nach", "Last Active": "Zuletzt aktiv",
    "Active Partners": "Aktive Partner", "Partner Revenue": "Partnerumsatz", "New Partners": "Neue Partner",
    "Performance Score": "Leistungswert", "Response Time": "Antwortzeit",
    "Google Calendar": "Google Kalender", "Join Meeting": "Besprechung beitreten",
    "Start Meeting": "Besprechung starten", "Schedule Meeting": "Besprechung planen",
    "Meeting Details": "Besprechungsdetails", "Participants": "Teilnehmer", "No Meetings": "Keine Besprechungen",
    "Camera": "Kamera", "Microphone": "Mikrofon", "Screen Share": "Bildschirmfreigabe",
    "Mute": "Stummschalten", "Unmute": "Stummschaltung aufheben", "End Call": "Anruf beenden",
    "Post Job": "Stelle veröffentlichen", "Job Title": "Stellenbezeichnung", "Job Description": "Stellenbeschreibung",
    "Full-time": "Vollzeit", "Part-time": "Teilzeit", "Remote": "Remote", "On-site": "Vor Ort", "Hybrid": "Hybrid",
    "Entry Level": "Einstiegsniveau", "Senior Level": "Senior-Niveau", "Apply Now": "Jetzt bewerben",
    "Salary Range": "Gehaltsrahmen", "Skills Required": "Erforderliche Fähigkeiten",
    "Account Settings": "Kontoeinstellungen", "Privacy Settings": "Datenschutzeinstellungen",
    "Security Settings": "Sicherheitseinstellungen", "Change Password": "Passwort ändern",
    "Two-Factor Authentication": "Zwei-Faktor-Authentifizierung", "Connected Accounts": "Verbundene Konten",
    "Sign In": "Anmelden", "Sign Up": "Registrieren", "Sign Out": "Abmelden",
    "Forgot password?": "Passwort vergessen?", "Email address": "E-Mail-Adresse",
    "Continue with Google": "Mit Google fortfahren", "Check your email": "Überprüfen Sie Ihre E-Mail",
    "Something went wrong. Please try again.": "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    "Changes saved successfully": "Änderungen erfolgreich gespeichert",
    "Are you sure?": "Sind Sie sicher?", "Load more": "Mehr laden",
    "Search...": "Suchen...", "Clear filters": "Filter zurücksetzen",
    "No items found": "Keine Elemente gefunden", "per page": "pro Seite",
    "New Message": "Neue Nachricht", "Send Message": "Nachricht senden",
    "All Candidates": "Alle Kandidaten", "Candidate Profile": "Kandidatenprofil",
    "Total Applications": "Gesamtbewerbungen", "Conversion Rate": "Konversionsrate",
    "Partner Dashboard": "Partner-Dashboard", "Active Jobs": "Aktive Stellen",
    "Feed": "Feed", "Achievements": "Erfolge", "Pipeline": "Pipeline", "Tasks": "Aufgaben",
    "Templates": "Vorlagen", "Documents": "Dokumente", "Contracts": "Verträge",
    "Campaigns": "Kampagnen", "Developer": "Entwickler", "Career": "Karriere",
    "Communication": "Kommunikation", "Learning": "Lernen", "Support": "Unterstützung",
    "GDPR Compliance": "DSGVO-Konformität", "Data Protection": "Datenschutz",
  },
  fr: {
    "Strong Growth": "Forte croissance", "Active Users": "Utilisateurs actifs", "New Users": "Nouveaux utilisateurs",
    "Total Users": "Total utilisateurs", "Engagement Rate": "Taux d'engagement", "Suspended": "Suspendu",
    "Search Candidates": "Rechercher des candidats", "Filter by Status": "Filtrer par statut",
    "Sort by": "Trier par", "Sort By": "Trier par", "Last Active": "Dernière activité",
    "Active Partners": "Partenaires actifs", "Partner Revenue": "Chiffre d'affaires partenaires",
    "Performance Score": "Score de performance", "Response Time": "Temps de réponse",
    "Google Calendar": "Google Agenda", "Join Meeting": "Rejoindre la réunion",
    "Start Meeting": "Démarrer la réunion", "Schedule Meeting": "Planifier une réunion",
    "Meeting Details": "Détails de la réunion", "Participants": "Participants",
    "Camera": "Caméra", "Microphone": "Microphone", "Mute": "Couper le son",
    "Post Job": "Publier une offre", "Job Title": "Intitulé du poste", "Job Description": "Description du poste",
    "Full-time": "Temps plein", "Part-time": "Temps partiel", "Remote": "À distance",
    "Apply Now": "Postuler maintenant", "Salary Range": "Fourchette salariale",
    "Account Settings": "Paramètres du compte", "Privacy Settings": "Paramètres de confidentialité",
    "Security Settings": "Paramètres de sécurité", "Change Password": "Changer le mot de passe",
    "Two-Factor Authentication": "Authentification à deux facteurs",
    "Sign In": "Se connecter", "Sign Up": "S'inscrire", "Sign Out": "Se déconnecter",
    "Forgot password?": "Mot de passe oublié ?", "Email address": "Adresse e-mail",
    "Continue with Google": "Continuer avec Google",
    "Something went wrong. Please try again.": "Une erreur s'est produite. Veuillez réessayer.",
    "Changes saved successfully": "Modifications enregistrées avec succès",
    "Are you sure?": "Êtes-vous sûr ?", "Load more": "Charger plus",
    "Search...": "Rechercher...", "Clear filters": "Effacer les filtres",
    "New Message": "Nouveau message", "Send Message": "Envoyer un message",
    "All Candidates": "Tous les candidats", "Total Applications": "Total des candidatures",
    "Feed": "Fil d'actualité", "Achievements": "Réalisations", "Pipeline": "Pipeline",
    "Tasks": "Tâches", "Templates": "Modèles", "Documents": "Documents",
    "Contracts": "Contrats", "Career": "Carrière", "Communication": "Communication",
    "GDPR Compliance": "Conformité RGPD", "Data Protection": "Protection des données",
  },
  es: {
    "Strong Growth": "Crecimiento fuerte", "Active Users": "Usuarios activos", "New Users": "Nuevos usuarios",
    "Total Users": "Total usuarios", "Engagement Rate": "Tasa de interacción", "Suspended": "Suspendido",
    "Search Candidates": "Buscar candidatos", "Filter by Status": "Filtrar por estado",
    "Sort by": "Ordenar por", "Sort By": "Ordenar por", "Last Active": "Última actividad",
    "Google Calendar": "Google Calendar", "Join Meeting": "Unirse a la reunión",
    "Start Meeting": "Iniciar reunión", "Schedule Meeting": "Programar reunión",
    "Participants": "Participantes", "Camera": "Cámara", "Microphone": "Micrófono",
    "Post Job": "Publicar empleo", "Job Title": "Título del puesto", "Job Description": "Descripción del puesto",
    "Full-time": "Tiempo completo", "Part-time": "Medio tiempo", "Remote": "Remoto",
    "Apply Now": "Aplicar ahora", "Salary Range": "Rango salarial",
    "Account Settings": "Configuración de cuenta", "Change Password": "Cambiar contraseña",
    "Sign In": "Iniciar sesión", "Sign Up": "Registrarse", "Sign Out": "Cerrar sesión",
    "Forgot password?": "¿Olvidó su contraseña?", "Email address": "Dirección de correo",
    "Continue with Google": "Continuar con Google",
    "Something went wrong. Please try again.": "Algo salió mal. Por favor intente de nuevo.",
    "Changes saved successfully": "Cambios guardados exitosamente",
    "Are you sure?": "¿Está seguro?", "Load more": "Cargar más",
    "Search...": "Buscar...", "New Message": "Nuevo mensaje", "Send Message": "Enviar mensaje",
    "All Candidates": "Todos los candidatos", "Feed": "Noticias", "Achievements": "Logros",
    "Tasks": "Tareas", "Templates": "Plantillas", "Documents": "Documentos",
    "Contracts": "Contratos", "Career": "Carrera", "Communication": "Comunicación",
  },
  zh: {
    "Strong Growth": "强劲增长", "Active Users": "活跃用户", "New Users": "新用户",
    "Total Users": "总用户", "Engagement Rate": "参与率", "Suspended": "已暂停",
    "Search Candidates": "搜索候选人", "Filter by Status": "按状态筛选",
    "Sort by": "排序", "Sort By": "排序", "Last Active": "最后活跃",
    "Google Calendar": "Google 日历", "Join Meeting": "加入会议",
    "Start Meeting": "开始会议", "Schedule Meeting": "安排会议",
    "Participants": "参与者", "Camera": "摄像头", "Microphone": "麦克风",
    "Post Job": "发布职位", "Job Title": "职位名称", "Job Description": "职位描述",
    "Full-time": "全职", "Part-time": "兼职", "Remote": "远程",
    "Apply Now": "立即申请", "Salary Range": "薪资范围",
    "Account Settings": "账户设置", "Change Password": "修改密码",
    "Sign In": "登录", "Sign Up": "注册", "Sign Out": "退出",
    "Continue with Google": "使用 Google 继续",
    "Something went wrong. Please try again.": "出了些问题，请重试。",
    "Changes saved successfully": "更改已成功保存",
    "Are you sure?": "您确定吗？", "Load more": "加载更多",
    "Search...": "搜索...", "New Message": "新消息", "Send Message": "发送消息",
    "All Candidates": "所有候选人", "Feed": "动态", "Achievements": "成就",
    "Tasks": "任务", "Documents": "文档", "Contracts": "合同", "Career": "职业",
  },
  ar: {
    "Strong Growth": "نمو قوي", "Active Users": "المستخدمون النشطون", "New Users": "المستخدمون الجدد",
    "Total Users": "إجمالي المستخدمين", "Engagement Rate": "معدل التفاعل", "Suspended": "معلق",
    "Search Candidates": "البحث عن مرشحين", "Filter by Status": "تصفية حسب الحالة",
    "Sort by": "ترتيب حسب", "Sort By": "ترتيب حسب",
    "Google Calendar": "تقويم جوجل", "Join Meeting": "الانضمام للاجتماع",
    "Start Meeting": "بدء الاجتماع", "Schedule Meeting": "جدولة اجتماع",
    "Participants": "المشاركون", "Camera": "الكاميرا", "Microphone": "الميكروفون",
    "Post Job": "نشر وظيفة", "Job Title": "المسمى الوظيفي", "Job Description": "الوصف الوظيفي",
    "Full-time": "دوام كامل", "Part-time": "دوام جزئي", "Remote": "عن بُعد",
    "Apply Now": "تقدم الآن", "Salary Range": "نطاق الراتب",
    "Account Settings": "إعدادات الحساب", "Change Password": "تغيير كلمة المرور",
    "Sign In": "تسجيل الدخول", "Sign Up": "إنشاء حساب", "Sign Out": "تسجيل الخروج",
    "Continue with Google": "المتابعة مع جوجل",
    "Something went wrong. Please try again.": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    "Changes saved successfully": "تم حفظ التغييرات بنجاح",
    "Are you sure?": "هل أنت متأكد؟", "Load more": "تحميل المزيد",
    "Search...": "بحث...", "New Message": "رسالة جديدة", "Send Message": "إرسال رسالة",
    "Feed": "آخر الأخبار", "Achievements": "الإنجازات", "Tasks": "المهام",
    "Documents": "المستندات", "Contracts": "العقود", "Career": "المسيرة المهنية",
  },
  ru: {
    "Strong Growth": "Сильный рост", "Active Users": "Активные пользователи", "New Users": "Новые пользователи",
    "Total Users": "Всего пользователей", "Engagement Rate": "Вовлечённость", "Suspended": "Приостановлен",
    "Search Candidates": "Поиск кандидатов", "Filter by Status": "Фильтр по статусу",
    "Sort by": "Сортировать по", "Sort By": "Сортировать по", "Last Active": "Последняя активность",
    "Google Calendar": "Google Календарь", "Join Meeting": "Присоединиться к встрече",
    "Start Meeting": "Начать встречу", "Schedule Meeting": "Запланировать встречу",
    "Participants": "Участники", "Camera": "Камера", "Microphone": "Микрофон",
    "Post Job": "Опубликовать вакансию", "Job Title": "Название должности",
    "Job Description": "Описание вакансии",
    "Full-time": "Полная занятость", "Part-time": "Частичная занятость", "Remote": "Удалённо",
    "Apply Now": "Откликнуться", "Salary Range": "Диапазон зарплаты",
    "Account Settings": "Настройки аккаунта", "Change Password": "Сменить пароль",
    "Sign In": "Войти", "Sign Up": "Зарегистрироваться", "Sign Out": "Выйти",
    "Continue with Google": "Продолжить через Google",
    "Something went wrong. Please try again.": "Что-то пошло не так. Попробуйте ещё раз.",
    "Changes saved successfully": "Изменения успешно сохранены",
    "Are you sure?": "Вы уверены?", "Load more": "Загрузить ещё",
    "Search...": "Поиск...", "New Message": "Новое сообщение", "Send Message": "Отправить сообщение",
    "Feed": "Лента", "Achievements": "Достижения", "Tasks": "Задачи",
    "Documents": "Документы", "Contracts": "Контракты", "Career": "Карьера",
  },
};

function processObj(enObj, langObj, dict) {
  let count = 0;
  for (const [key, enVal] of Object.entries(enObj)) {
    if (enVal && typeof enVal === 'object' && !Array.isArray(enVal)) {
      if (!langObj[key] || typeof langObj[key] !== 'object') langObj[key] = {};
      count += processObj(enVal, langObj[key], dict);
    } else if (typeof enVal === 'string' && langObj[key] === enVal) {
      if (enVal.length <= 2 || /^[\d\s.,;:!?%$€£¥#+\-*/=@()\[\]{}|\\<>]+$/.test(enVal)) continue;
      if (/^(https?:\/\/|mailto:|tel:)/.test(enVal) || /^\{\{.+\}\}$/.test(enVal)) continue;
      if (dict[enVal]) { langObj[key] = dict[enVal]; count++; }
    }
  }
  return count;
}

let grandTotal = 0;

for (const [lang, dict] of Object.entries(DICTS)) {
  let langTotal = 0;
  for (const ns of NAMESPACES) {
    const enFile = join(LOCALES, 'en', `${ns}.json`);
    const langFile = join(LOCALES, lang, `${ns}.json`);
    if (!existsSync(enFile) || !existsSync(langFile)) continue;
    const enData = JSON.parse(readFileSync(enFile, 'utf-8'));
    const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
    const count = processObj(enData, langData, dict);
    if (count > 0) {
      writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n');
      langTotal += count;
    }
  }
  console.log(`🌐 ${lang}: ${langTotal} translations applied`);
  grandTotal += langTotal;
}

console.log(`\n🌍 GRAND TOTAL: ${grandTotal} translations applied across all languages\n`);
