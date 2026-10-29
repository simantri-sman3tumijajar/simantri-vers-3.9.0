import re

with open('src/components/ProctorMonitorDashboard.tsx', 'r') as f:
    text = f.read()

# Strip comments
text = re.sub(r'\{\/\*.*?\*\/\}', '', text, flags=re.DOTALL)
# Strip string literals in JS
text_no_str = re.sub(r'"[^"]*"|\'[^\']*\'|`[^`]*`', '""', text)

# Find all <Tag ...> and </Tag>
tokens = re.findall(r'<([/A-Za-z0-9_.]+)(?:\s+[^>]*|\s*)>', text_no_str)

stack = []
for t in tokens:
    if t.startswith('/'):
        tag_name = t[1:]
        if stack and stack[-1] == tag_name:
            stack.pop()
        else:
            print(f"Mismatched closing tag </{tag_name}>, current top: {stack[-1] if stack else 'EMPTY'}")
    elif not t.endswith('/'): # not self-closing
        # check if self closing in original
        stack.append(t)

print("Remaining unclosed tags at end of file:")
print(stack)
