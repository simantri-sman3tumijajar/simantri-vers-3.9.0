import re

with open('src/components/ProctorMonitorDashboard.tsx') as f:
    lines = f.readlines()

# Check lines 708 to 880
card_lines = lines[707:880]

stack = []
for idx, line in enumerate(card_lines, 708):
    # Find all JSX tags <TagName ...> or </TagName> or <TagName ... />
    # Remove self closing tags
    cleaned = re.sub(r'<[A-Za-z0-9_.]+\s*[^>]*/>', '', line)
    # Find opening tags
    open_tags = re.findall(r'<([A-Za-z0-9_.]+)(?:\s+[^>]*)?>', cleaned)
    # Find closing tags
    close_tags = re.findall(r'</([A-Za-z0-9_.]+)>', cleaned)

    for t in open_tags:
        if not t.startswith('!') and not t.startswith('?'):
            stack.append((t, idx))
    for t in close_tags:
        if stack and stack[-1][0] == t:
            stack.pop()
        else:
            print(f"Unmatched closing tag </{t}> on line {idx}")

print("Unclosed tags remaining on stack:")
for t, idx in stack:
    print(f"  <{t}> opened on line {idx}")

