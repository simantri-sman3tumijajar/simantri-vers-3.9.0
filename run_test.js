const fs = require('fs');
const vite = require('vite');

async function test() {
  const code = fs.readFileSync('src/components/ProctorMonitorDashboard.tsx', 'utf8');
  try {
    const res = await vite.transformWithEsbuild(code, 'src/components/ProctorMonitorDashboard.tsx', {
      loader: 'tsx',
      jsx: 'automatic'
    });
    console.log('SUCCESS! Transpiled WITHOUT ANY SYNTAX ERRORS! Output length:', res.code.length);
  } catch (err) {
    console.error('TRANSPILE ERROR:', err.message);
  }
}
test();
