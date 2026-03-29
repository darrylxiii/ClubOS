import json
import os

translations = {
  'ar': 'بدعوة فقط',
  'de': 'NUR AUF EINLADUNG',
  'en': 'INVITE-ONLY',
  'es': 'SÓLO POR INVITACIÓN',
  'fr': 'SUR INVITATION UNIQUEMENT',
  'it': 'SOLO SU INVITO',
  'nl': 'UITSLUITEND OP UITNODIGING',
  'pt': 'APENAS CONVIDADOS',
  'ru': 'ТОЛЬКО ПО ПРИГЛАШЕНИЮ',
  'zh': '仅限邀请'
}

locales_dir = os.path.join('src', 'i18n', 'locales')

if os.path.exists(locales_dir):
  for lang in os.listdir(locales_dir):
    lang_dir = os.path.join(locales_dir, lang)
    if not os.path.isdir(lang_dir): continue
    target_text = translations.get(lang, translations['en'])

    for file in os.listdir(lang_dir):
      if not file.endswith('.json'): continue
      file_path = os.path.join(lang_dir, file)
      try:
        with open(file_path, 'r', encoding='utf-8') as f:
          data = json.load(f)
        
        modified = False
        if 'inviteOnly' in data:
          data['inviteOnly'] = target_text
          modified = True
          
        if 'signup' in data and 'inviteOnly' in data['signup']:
          data['signup']['inviteOnly'] = target_text
          modified = True
          
        if modified:
          with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
          print(f"Updated {lang}/{file} to '{target_text}'")
      except Exception as e:
        print(f"Error with {file_path}: {e}")
