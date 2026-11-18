import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import { chromium } from '@playwright/test';

const projectRoot = process.cwd();
const appUrl = 'http://127.0.0.1:4180';
const reportUrl = 'http://127.0.0.1:9323';

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForUrl(url, processToWatch) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (processToWatch.exitCode !== null) {
      throw new Error(`Process for ${url} exited early with code ${processToWatch.exitCode}.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Retry until the bounded deadline while the local process starts.
    }
    await delay(150);
  }
  throw new Error(`${url} did not become ready within 30 seconds.`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  const exitPromise = once(child, 'exit').catch(() => undefined);
  child.kill('SIGTERM');
  await Promise.race([exitPromise, delay(2_000)]);
  if (child.exitCode !== null) return;

  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    child.kill('SIGKILL');
  }
}

const appProcess = spawn(process.execPath, ['--import', 'tsx', 'app/src/server.ts'], {
  cwd: projectRoot,
  env: { ...process.env, PORT: '4180', TEST_MODE: 'true' },
  stdio: 'ignore',
  windowsHide: true,
});

const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');
let reportProcess;
let browser;

try {
  await waitForUrl(`${appUrl}/health`, appProcess);
  browser = await chromium.launch();

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${appUrl}/?workspace=evidence-capture`);
  await page.getByLabel('Email').fill('writer@example.test');
  await page.getByLabel('Password').fill('Writer123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Task board' }).waitFor();

  await page.getByLabel('Title', { exact: true }).fill('Complete release regression');
  await page
    .getByLabel('Description', { exact: true })
    .fill('Review critical paths, API boundaries, and failure evidence before release.');
  await page.getByLabel('Priority', { exact: true }).selectOption('high');
  await page.getByLabel('Status', { exact: true }).selectOption('in-progress');
  await page.getByLabel('Due date', { exact: true }).fill('2026-12-01');
  await page.getByRole('button', { name: 'Create task' }).click();
  await page.getByRole('heading', { name: 'Complete release regression' }).waitFor();
  await page.screenshot({ path: 'screenshots/taskflow-dashboard.png', fullPage: true });

  reportProcess = spawn(
    process.execPath,
    [
      playwrightCli,
      'show-report',
      'playwright-report/regression',
      '--host',
      '127.0.0.1',
      '--port',
      '9323',
    ],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  await waitForUrl(reportUrl, reportProcess);

  const reportPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await reportPage.goto(reportUrl, { waitUntil: 'networkidle' });
  await reportPage.locator('body').waitFor();
  await reportPage.screenshot({ path: 'screenshots/regression-report.png', fullPage: true });

  console.log('Captured genuine dashboard and regression report screenshots.');
} finally {
  await browser?.close();
  await stopProcess(reportProcess);
  await stopProcess(appProcess);
}
