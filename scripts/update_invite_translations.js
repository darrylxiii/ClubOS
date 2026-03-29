const fs = require('fs');
const path = require('path');

const translations = {
  ar: 'بدعوة فقط',
  de: 'NUR AUF EINLADUNG',
  en: 'INVITE-ONLY',
  es: 'SÓLO POR INVITACIÓN',
  fr: 'SUR INVITATION UNIQUEMENT',
  it: 'SOLO SU INVITO',
  nl: 'UITSLUITEND OP UITNODIGING',
  pt: 'APENAS CONVIDADOS',
  ru: 'ТОЛЬКО ПО ПРИГЛАШЕНИЮ',
  zh: '仅限邀请'
};

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

if (fs.existsSync(localesDir)) {
  const langs = fs.readdirSync(localesDir);
  for (const lang of langs) {
    const langDir = path.join(localesDir, lang);
    if (!fs.statSync(langDir).isDirectory()) continue;
    
    const targetText = translations[lang] || translations.en;
    
    // update auth.json or common.json
    for (const file of fs.readdirSync(langDir)) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(langDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        let modified = false;
        
        // 1. Root level inviteOnly
        if (data.inviteOnly !== undefined) {
          data.inviteOnly = targetText;
          modified = true;
        }
        
        // 2. if signup.inviteOnly
        if (data.signup && data.signup.inviteOnly !== undefined) {
          data.signup.inviteOnly = targetText;
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
          console.log(`Updated ${lang}/${file} to "${targetText}"`);
        }
      } catch (err) {
        console.error(`Error in ${lang}/${file}: ${err.message}`);
      }
    }
  }
} else {
  console.error("Locales directory not found", localesDir);
}
