import type { Page } from '@playwright/test';

function escaped(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export interface UiTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export class TasksPage {
  readonly page: Page;
  readonly heading;
  readonly titleInput;
  readonly descriptionInput;
  readonly prioritySelect;
  readonly dueDateInput;
  readonly createButton;
  readonly searchInput;
  readonly statusFilter;
  readonly priorityFilter;
  readonly alert;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /task dashboard|my tasks|task board/i });
    this.titleInput = page.getByLabel('Title', { exact: true });
    this.descriptionInput = page.getByLabel('Description', { exact: true });
    this.prioritySelect = page.getByLabel('Priority', { exact: true });
    this.dueDateInput = page.getByLabel('Due date', { exact: true });
    this.createButton = page.getByRole('button', { name: /create task|add task/i });
    this.searchInput = page.getByLabel('Search', { exact: true });
    this.statusFilter = page.getByLabel('Status filter', { exact: true });
    this.priorityFilter = page.getByLabel('Priority filter', { exact: true });
    this.alert = page.getByRole('alert');
  }

  async waitUntilLoaded(): Promise<void> {
    await this.heading.waitFor();
  }

  taskCard(title: string) {
    return this.page.getByRole('article').filter({ hasText: escaped(title) });
  }

  async createTask(input: UiTaskInput) {
    await this.titleInput.fill(input.title);
    if (input.description !== undefined) {
      await this.descriptionInput.fill(input.description);
    }
    if (input.priority !== undefined) {
      await this.prioritySelect.selectOption(input.priority);
    }
    if (input.dueDate !== undefined) {
      await this.dueDateInput.fill(input.dueDate);
    }

    const responsePromise = this.page.waitForResponse(
      (response) => response.url().endsWith('/api/tasks') && response.request().method() === 'POST',
    );
    await this.createButton.click();
    return responsePromise;
  }

  async openEdit(title: string): Promise<void> {
    await this.taskCard(title).getByRole('button', { name: /edit/i }).click();
  }

  async saveEdit(values: {
    title?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    status?: 'todo' | 'in-progress' | 'done';
    dueDate?: string;
  }) {
    if (values.title !== undefined) {
      await this.titleInput.fill(values.title);
    }
    if (values.description !== undefined) {
      await this.descriptionInput.fill(values.description);
    }
    if (values.priority !== undefined) {
      await this.prioritySelect.selectOption(values.priority);
    }
    if (values.status !== undefined) {
      await this.page.getByLabel('Status', { exact: true }).selectOption(values.status);
    }
    if (values.dueDate !== undefined) {
      await this.dueDateInput.fill(values.dueDate);
    }

    const responsePromise = this.page.waitForResponse(
      (response) =>
        /\/api\/tasks\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'PATCH',
    );
    await this.page.getByRole('button', { name: /save changes|save/i }).click();
    return responsePromise;
  }

  async requestDelete(title: string): Promise<void> {
    await this.taskCard(title)
      .getByRole('button', { name: /delete/i })
      .click();
  }

  async cancelDelete(): Promise<void> {
    await this.page
      .getByRole('dialog', { name: /delete task/i })
      .getByRole('button', { name: /cancel/i })
      .click();
  }

  async confirmDelete() {
    const dialog = this.page.getByRole('dialog', { name: /delete task/i });
    const responsePromise = this.page.waitForResponse(
      (response) =>
        /\/api\/tasks\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === 'DELETE',
    );
    await dialog.getByRole('button', { name: /^delete$/i }).click();
    return responsePromise;
  }
}
