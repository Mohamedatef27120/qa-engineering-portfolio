import { LoginPage } from '../../pages/LoginPage.js';
import { TasksPage } from '../../pages/TasksPage.js';
import { INVALID_USER, VIEWER_USER, WRITER_USER } from '../../test-data/users.js';
import { test, expect } from '../fixtures/test.js';

test.describe('Sign-in experience', () => {
  test('unauthenticated visitor sees the sign-in form', async ({ page, workspaceId }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto(workspaceId);

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeEnabled();
  });

  test('writer can sign in and reach the task dashboard', async ({ page, workspaceId }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto(workspaceId);
    const response = await loginPage.login(WRITER_USER.email, WRITER_USER.password);

    expect(response.ok()).toBe(true);
    await new TasksPage(page).waitUntilLoaded();
    await expect(page.getByText(WRITER_USER.name)).toBeVisible();
  });

  test('invalid credentials show a useful error and remain on sign-in', async ({
    page,
    workspaceId,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto(workspaceId);
    const response = await loginPage.login(INVALID_USER.email, INVALID_USER.password);

    expect(response.status()).toBe(401);
    await expect(loginPage.alert).toContainText(
      /email or password is incorrect|invalid email or password/i,
    );
    await expect(loginPage.signInButton).toBeVisible();
  });

  test('sign out returns to login and invalidates the browser session', async ({ tasksPage }) => {
    const logoutResponse = tasksPage.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/logout') && response.request().method() === 'POST',
    );
    await tasksPage.page.getByRole('button', { name: /sign out/i }).click();
    expect((await logoutResponse).status()).toBe(204);
    await expect(tasksPage.page.getByLabel('Email')).toBeVisible();

    await tasksPage.page.reload();
    await expect(tasksPage.page.getByLabel('Email')).toBeVisible();
  });

  test('viewer sees tasks without mutation controls', async ({ page, workspaceId, apiClient }) => {
    void apiClient;
    const loginPage = new LoginPage(page);
    await loginPage.goto(workspaceId);
    const response = await loginPage.login(VIEWER_USER.email, VIEWER_USER.password);
    expect(response.ok()).toBe(true);

    await expect(page.locator('#read-only-notice')).toContainText('Read-only access');
    await expect(page.getByRole('button', { name: /create task/i })).toBeHidden();
  });
});
