import { validTask, uniqueTitle, type Task } from '../../test-data/tasks.js';
import { test, expect } from '../fixtures/test.js';

test.describe('Task management UI', () => {
  test('creates a task with meaningful business fields', async ({ tasksPage }) => {
    const title = uniqueTitle('Prepare regression run');
    const response = await tasksPage.createTask({
      title,
      description: 'Confirm the release candidate before handoff.',
      priority: 'high',
      dueDate: '2030-12-31',
    });

    expect(response.status()).toBe(201);
    const card = tasksPage.taskCard(title);
    await expect(card).toBeVisible();
    await expect(card).toContainText('high');
    await expect(card).toContainText('Confirm the release candidate before handoff.');
  });

  test('prevents creation when the required title is blank', async ({ tasksPage }) => {
    await tasksPage.titleInput.fill('   ');
    await tasksPage.createButton.click();

    await expect(tasksPage.alert).toContainText(/title is required|enter a title/i);
  });

  test('shows the title maximum boundary validation', async ({ tasksPage }) => {
    await tasksPage.titleInput.fill('T'.repeat(81));
    await tasksPage.createButton.click();

    await expect(tasksPage.alert).toContainText(/80 characters|1 to 80/i);
  });

  test('created task remains visible after a browser refresh', async ({ tasksPage }) => {
    const title = uniqueTitle('Persistence check');
    expect((await tasksPage.createTask({ title })).ok()).toBe(true);

    await tasksPage.page.reload();
    await tasksPage.waitUntilLoaded();
    await expect(tasksPage.taskCard(title)).toBeVisible();
  });

  test('edits title, priority, and workflow status', async ({ tasksPage, apiClient }) => {
    const originalTitle = uniqueTitle('Review draft');
    const create = await apiClient.createTask(validTask({ title: originalTitle }));
    expect(create).toBeOK();
    await tasksPage.page.reload();

    await tasksPage.openEdit(originalTitle);
    const updatedTitle = uniqueTitle('Review approved');
    const update = await tasksPage.saveEdit({
      title: updatedTitle,
      priority: 'high',
      status: 'done',
    });

    expect(update.ok()).toBe(true);
    const card = tasksPage.taskCard(updatedTitle);
    await expect(card).toBeVisible();
    await expect(card).toContainText('high');
    await expect(card).toContainText(/done/i);
  });

  test('search and filters reduce the visible task set', async ({ tasksPage, apiClient }) => {
    const releaseTitle = uniqueTitle('Release plan');
    const backlogTitle = uniqueTitle('Backlog note');
    await apiClient.createTask(
      validTask({ title: releaseTitle, status: 'done', priority: 'high' }),
    );
    await apiClient.createTask(validTask({ title: backlogTitle, priority: 'low' }));
    await tasksPage.page.reload();

    await tasksPage.searchInput.fill('Release plan');
    await expect(tasksPage.taskCard(releaseTitle)).toBeVisible();
    await expect(tasksPage.taskCard(backlogTitle)).toBeHidden();

    await tasksPage.searchInput.clear();
    await tasksPage.statusFilter.selectOption('done');
    await tasksPage.priorityFilter.selectOption('high');
    await expect(tasksPage.taskCard(releaseTitle)).toBeVisible();
    await expect(tasksPage.taskCard(backlogTitle)).toBeHidden();
  });

  test('delete confirmation supports cancel and confirm', async ({ tasksPage, apiClient }) => {
    const create = await apiClient.createTask(validTask({ title: uniqueTitle('Disposable task') }));
    const task = ((await create.json()) as { data: Task }).data;
    await tasksPage.page.reload();

    await tasksPage.requestDelete(task.title);
    await tasksPage.cancelDelete();
    await expect(tasksPage.taskCard(task.title)).toBeVisible();

    await tasksPage.requestDelete(task.title);
    const remove = await tasksPage.confirmDelete();
    expect(remove.status()).toBe(204);
    await expect(tasksPage.taskCard(task.title)).toBeHidden();
  });

  test('core workflow remains usable at a 375px mobile width', async ({ tasksPage }) => {
    await tasksPage.page.setViewportSize({ width: 375, height: 800 });
    await expect(tasksPage.titleInput).toBeVisible();
    await expect(tasksPage.createButton).toBeVisible();

    const hasHorizontalOverflow = await tasksPage.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
