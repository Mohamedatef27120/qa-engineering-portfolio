import { validTask, uniqueTitle, type Task } from '../../test-data/tasks.js';
import { test, expect } from '../fixtures/test.js';

test('API-created task can be completed in the UI and verified through the API', async ({
  apiClient,
  tasksPage,
}) => {
  const title = uniqueTitle('Cross-layer lifecycle');
  const create = await apiClient.createTask(validTask({ title, priority: 'medium' }));
  expect(create.status()).toBe(201);
  const createdTask = ((await create.json()) as { data: Task }).data;

  await tasksPage.page.reload();
  await expect(tasksPage.taskCard(title)).toBeVisible();
  await tasksPage.openEdit(title);
  const update = await tasksPage.saveEdit({ status: 'done', priority: 'high' });
  expect(update.status()).toBe(200);

  const get = await apiClient.getTask(createdTask.id);
  expect(get.status()).toBe(200);
  expect(await get.json()).toEqual({
    data: expect.objectContaining({
      id: createdTask.id,
      title,
      status: 'done',
      priority: 'high',
    }),
  });
});
