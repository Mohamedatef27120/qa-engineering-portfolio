import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

const projectRoot = process.cwd();
const healthUrl = 'http://127.0.0.1:4180/health';
const playwrightArguments = process.argv.slice(2);

if (playwrightArguments.length === 0) {
  console.error('Usage: node scripts/run-tests.mjs [Playwright test arguments]');
  process.exit(2);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForHealth(serverProcess) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Test server exited early with code ${serverProcess.exitCode}.`);
    }

    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // The server may still be starting. Retry until the bounded deadline.
    }
    await delay(150);
  }

  throw new Error(`Test server did not become ready at ${healthUrl} within 30 seconds.`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;

  const exitPromise = once(child, 'exit').catch(() => undefined);
  child.kill('SIGTERM');
  await Promise.race([exitPromise, delay(3_000)]);

  if (child.exitCode !== null) return;

  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    child.kill('SIGKILL');
  }
  await Promise.race([exitPromise, delay(2_000)]);
}

const serverProcess = spawn(process.execPath, ['--import', 'tsx', 'app/src/server.ts'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: '4180',
    TEST_MODE: 'true',
  },
  stdio: 'inherit',
  windowsHide: true,
});

let testProcess;
let interrupted = false;

async function handleInterrupt() {
  if (interrupted) return;
  interrupted = true;
  await stopProcess(testProcess);
  await stopProcess(serverProcess);
  process.exit(130);
}

process.once('SIGINT', handleInterrupt);
process.once('SIGTERM', handleInterrupt);

try {
  await waitForHealth(serverProcess);

  const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
  testProcess = spawn(process.execPath, [playwrightCli, 'test', ...playwrightArguments], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });

  const [testExitCode] = await once(testProcess, 'exit');
  process.exitCode = typeof testExitCode === 'number' ? testExitCode : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await stopProcess(testProcess);
  await stopProcess(serverProcess);
}
