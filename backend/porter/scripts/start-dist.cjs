const path = require('path');
const { spawn } = require('child_process');

const entry = path.join(__dirname, '..', 'dist', 'backend', 'porter', 'src', 'server.js');

const child = spawn(
  process.execPath,
  ['--import', 'tsx', '-r', 'tsconfig-paths/register', entry],
  { stdio: 'inherit' },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
