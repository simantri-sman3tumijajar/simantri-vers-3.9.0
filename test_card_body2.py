import re

with open('src/components/ProctorMonitorDashboard.tsx') as f:
    lines = f.readlines()

card_body = lines[713:880]

stack = []
for idx, line in enumerate(card_body, 714):
    l_str = re.sub(r'"[^"]*"|\'[^\']*\'|`[^`]*`', '""', line)
    l_str = re.sub(r'\{\/\*.*?\*\/\}', '', l_str)
    
    tags = re.findall(r'<(/?[A-Za-z0-9_.]+)(?:\s+[^>]*)?>', l_str)
    for tag in tags:
        if tag in ['Activity', 'ShieldCheck', 'Search', 'Laptop', 'Smartphone', 'Eye', 'Unlock', 'RotateCcw', 'Send', 'FileX', 'X', 'Volume2', 'Lock', 'ShieldAlert', 'AlertTriangle', 'Layers', 'Clock']:
            continue
        if tag.startswith('/'):
            t_name = tag[1:]
            if stack and stack[-1][0] == t_name:
                stack.pop()
            else:
                print(f"Error on line {idx}: found </{t_name}>, expected </{stack[-1][0] if stack else 'NONE'}>")
        else:
            stack.append((tag, idx))

print("\nStack at end of card body:")
for tag, idx in stack:
    print(f"  Line {idx}: <{tag}>")

