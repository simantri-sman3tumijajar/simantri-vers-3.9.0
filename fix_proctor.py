with open('src/components/ProctorMonitorDashboard.tsx', 'r') as f:
    lines = f.readlines()

print('Total lines:', len(lines))
for i, l in enumerate(lines[870:890], 871):
    print(f"{i}: {l}", end='')

