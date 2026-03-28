import os
import re

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
                # If file contains t( as a function call
                if re.search(r'\bt\(', content):
                    # And lacks useTranslation assignment
                    if 'const { t' not in content and 'const t =' not in content and 'const { t,' not in content:
                        print(f'MISSING IN: {path}')
