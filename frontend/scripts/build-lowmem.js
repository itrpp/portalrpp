/**
 * Build โหมดประหยัด RAM (เครื่อง ~4GB)
 * ตั้ง NEXT_LOW_MEMORY แล้วเรียก next build
 */
process.env.NEXT_LOW_MEMORY = '1';

const { spawnSync } = require('child_process');
const path = require('path');

const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env: process.env,
  cwd: path.join(__dirname, '..'),
});

process.exit(result.status ?? 1);
