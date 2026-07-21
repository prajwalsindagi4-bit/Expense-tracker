import re

with open(r'c:\Academics\Website\Expense tracker\frontend\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all section tags with page-section class
sections = re.findall(r'<section\s+id="([^"]+)"[^>]*class="[^"]*page-section[^"]*"', content)
print('Sections with page-section class:', sections)

# Find all nav data-target values
targets = re.findall(r'data-target="([^"]+)"', content)
print('Nav targets:', targets)

# Check which targets have no matching section
for t in targets:
    if t not in sections:
        print(f'  WARNING: nav target "{t}" has NO matching page-section!')

# Also find any id that matches targets but doesn't have page-section class
for t in targets:
    pattern = f'id="{t}"'
    matches = [(i+1, line.strip()) for i, line in enumerate(content.split('\n')) if pattern in line]
    for ln, line in matches:
        print(f'  Line {ln}: {line[:120]}')
