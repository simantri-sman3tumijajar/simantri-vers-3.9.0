import re

with open('src/components/ProctorMonitorDashboard.tsx') as f:
    code = f.read()

# Focus on lines 700 to 880
lines = code.splitlines()
sub = "\n".join(lines[695:880])

# Strip comments
sub = re.sub(r'\{\/\*.*?\*\/\}', '', sub, flags=re.DOTALL)
# Strip strings
sub = re.sub(r'"[^"]*"|\'[^\']*\'|`[^`]*`', '""', sub)

# Find all JSX tags
# Opening tags: <TagName ... > or <TagName> or <Fragment>
# Self closing tags: <TagName ... />
# Closing tags: </TagName>

pattern = re.compile(r'<(/?[A-Za-z0-9_.]*)\s*([^>]*?)(/?)>')

stack = []
for m in pattern.finditer(sub):
    tag = m.group(1)
    is_self = m.group(3) == '/'
    
    if not tag: # <> fragment
        stack.append(('<>', m.start()))
    elif tag == '/': # </> fragment close
        if stack and stack[-1][0] == '<>':
            stack.pop()
        else:
            print("Fragment close mismatched!")
    elif tag.startswith('/'): # closing tag
        tag_name = tag[1:]
        if stack and stack[-1][0] == tag_name:
            stack.pop()
        else:
            print(f"Mismatched closing tag </{tag_name}>, expected </{stack[-1][0] if stack else 'NONE'}>")
    elif not is_self: # opening tag
        stack.append((tag, m.start()))

print("Unclosed tags in range 696-880:")
for t, pos in stack:
    print(f"  <{t}>")

