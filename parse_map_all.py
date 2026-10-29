import re

with open('src/components/ProctorMonitorDashboard.tsx') as f:
    lines = f.readlines()

map_lines = lines[712:880]

stack = []
for idx, line in enumerate(map_lines, 713):
    # Strip comments
    line_clean = re.sub(r'\{\/\*.*?\*\/\}', '', line)
    # Strip string literals
    line_clean = re.sub(r'"[^"]*"|\'[^\']*\'|`[^`]*`', '""', line_clean)
    
    # Find tags
    tags = re.findall(r'<(/?([A-Za-z0-9_.]+))(?:\s+[^>]*)?>', line_clean)
    for tag_str, name in tags:
        # Check if self-closing in raw line
        # Match exact tag in raw line to see if it ends with />
        if tag_str.startswith('/'): # closing
            tag_name = tag_str[1:]
            if stack and stack[-1][0] == tag_name:
                stack.pop()
            else:
                print(f"Mismatched </{tag_name}> on line {idx}, expected </{stack[-1][0] if stack else 'NONE'}>")
        else: # opening
            # check self closing
            # Simple check if icon or standard self-closing
            if name in ['Activity', 'ShieldCheck', 'Search', 'Laptop', 'Smartphone', 'Eye', 'Unlock', 'RotateCcw', 'Send', 'FileX', 'X', 'Volume2', 'Lock', 'ShieldAlert', 'AlertTriangle', 'Layers', 'Clock']:
                continue
            stack.append((name, idx, line.strip()))

print(f"\nUnclosed tags count: {len(stack)}")
for name, idx, src in stack:
    print(f"Line {idx}: <{name}> {src}")

