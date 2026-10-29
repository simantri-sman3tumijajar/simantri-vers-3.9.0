with open('src/components/ProctorMonitorDashboard.tsx', 'r') as f:
    lines = f.readlines()

for idx, line in enumerate(lines[745:885], 746):
    print(f"{idx}: {line}", end='')
