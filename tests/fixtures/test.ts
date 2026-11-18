import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.js';
import { TasksPage } from '../../pages/TasksPage.js';
import { WRITER_USER } from '../../test-data/users.js';
import { TaskApiClient } from '../support/api-client.js';

interface PortfolioFixtures {
  workspaceId: string;
  apiClient: TaskApiClient;
  authenticatedPage: Page;
  tasksPage: TasksPage;
}

export const test = base.extend<PortfolioFixtures>({
  workspaceId: async ({ request: _request }, use, testInfo) => {
    const project = testInfo.project.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    await use(`pw-${project}-${randomUUID()}`);
  },

  apiClient: async ({ request, workspaceId }, use) => {
    const client = new TaskApiClient(request, workspaceId);
    const loginResponse = await client.login();
    expect(loginResponse, 'writer demo login should succeed').toBeOK();
    const resetResponse = await client.reset();
    expect(resetResponse, 'workspace reset should succeed in TEST_MODE').toBeOK();

    await use(client);

    const cleanupResponse = await client.reset();
    expect(cleanupResponse, 'workspace cleanup should succeed').toBeOK();
  },

  authenticatedPage: async ({ page, workspaceId, apiClient }, use) => {
    // apiClient is intentionally a dependency: it resets this isolated workspace first.
    void apiClient;
    const loginPage = new LoginPage(page);
    await loginPage.goto(workspaceId);
    const response = await loginPage.login(WRITER_USER.email, WRITER_USER.password);
    expect(response.ok(), 'UI login request should succeed').toBe(true);

    const tasksPage = new TasksPage(page);
    await tasksPage.waitUntilLoaded();
    await use(page);
  },

  tasksPage: async ({ authenticatedPage }, use) => {
    await use(new TasksPage(authenticatedPage));
  },
});

export { expect };
