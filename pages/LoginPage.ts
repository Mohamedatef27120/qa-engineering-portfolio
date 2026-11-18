import type { Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput;
  readonly passwordInput;
  readonly signInButton;
  readonly alert;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.alert = page.getByRole('alert');
  }

  async goto(workspaceId: string): Promise<void> {
    await this.page.goto(`/?workspace=${encodeURIComponent(workspaceId)}`);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    );
    await this.signInButton.click();
    return responsePromise;
  }
}
