import re

with open('src/components/ProctorMonitorDashboard.tsx') as f:
    lines = f.readlines()

map_lines = lines[712:880]

stack = []
for idx, line in enumerate(map_lines, 713):
    # Find all <div> and </div> in line
    for m in re.finditer(r'<(div)[^>]*?(/?)>|</(div)>', line):
        if m.group(3) == '/': # self-closing
            continue
        elif m.group(1) == 'div':
            stack.append(('div', idx, line.strip()))
        elif m.group(4) == 'div':
            if stack:
                stack.pop()
            else:
                print(f"Extra closing </div> on line {idx}")

print(f"Unclosed <div> count: {len(stack)}")
for tag, idx, src in stack:
    print(f"Line {idx}: {src}")

