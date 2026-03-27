import json
import os

base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'i18n', 'locales')
namespaces = ['messages','jobs','settings','compliance','contracts','analytics','candidates','meetings','partner','admin','common']

def flatten(obj, prefix=''):
    keys = {}
    for k, v in obj.items():
        fk = prefix + '.' + k if prefix else k
        if isinstance(v, dict):
            keys.update(flatten(v, fk))
        else:
            keys[fk] = v
    return keys

def get_missing(en, fr):
    result = {}
    for k, v in en.items():
        if isinstance(v, dict):
            if k not in fr:
                result[k] = v
            else:
                nested = get_missing(v, fr.get(k, {}))
                if nested:
                    result[k] = nested
        else:
            if k not in fr:
                result[k] = v
    return result

for ns in namespaces:
    with open(os.path.join(base, 'en', ns + '.json')) as f:
        en = json.load(f)
    with open(os.path.join(base, 'fr', ns + '.json')) as f:
        fr = json.load(f)
    missing = get_missing(en, fr)
    count = len(flatten(missing))
    if count > 0:
        out_path = '/tmp/missing_' + ns + '.json'
        with open(out_path, 'w') as f:
            json.dump(missing, f, indent=2, ensure_ascii=False)
        print(ns + ': ' + str(count) + ' missing keys -> ' + out_path)
    else:
        print(ns + ': fully synced')
