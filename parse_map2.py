import re

with open('src/components/ProctorMonitorDashboard.tsx') as f:
    lines = f.readlines()

map_lines = lines[712:880]

stack = []
for idx, line in enumerate(map_lines, 713):
    tags = re.findall(r'<(/?div)(?:\s+[^>]*)?>', line)
    for t in tags:
        if t == 'div':
            stack.append((idx, line.strip()))
        elif t == '/div':
            if stack:
                stack.pop()
            else:
                print(f"Extra </div> on line {idx}: {line.strip()}")

print(f"\nUnclosed <div> count: {len(stack)}")
for idx, src in stack:
    print(f"Line {idx}: {src}")

