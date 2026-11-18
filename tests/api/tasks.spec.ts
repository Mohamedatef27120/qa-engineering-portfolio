import { test, expect } from '../fixtures/test.js';
import { uniqueTitle, validTask, type Task } from '../../test-data/tasks.js';

test.describe('Tasks API', () => {
  test('new workspace starts with an empty task collection', async ({ apiClient }) => {
    const response = await apiClient.listTasks();

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ data: [], meta: { total: 0 } });
  });

  test('creates a task and applies the default todo status', async ({ apiClient }) => {
    const payload = validTask();
    const response = await apiClient.createTask(payload);

    expect(response.status()).toBe(201);
    const { data: task } = (await response.json()) as { data: Task };
    expect(task).toMatchObject({ ...payload, status: 'todo' });
    expect(task.id).toEqual(expect.any(String));
    expect(Date.parse(task.createdAt)).not.toBeNaN();
    expect(Date.parse(task.updatedAt)).not.toBeNaN();
  });

  test('accepts the minimum one-character title boundary', async ({ apiClient }) => {
    const response = await apiClient.createTask(validTask({ title: 'A' }));
    expect(response.status()).toBe(201);
  });

  test('accepts the maximum 80-character title boundary', async ({ apiClient }) => {
    const response = await apiClient.createTask(validTask({ title: 'T'.repeat(80) }));
    expect(response.status()).toBe(201);
  });

  test('rejects a title above the 80-character boundary', async ({ apiClient }) => {
    const response = await apiClient.createTask(validTask({ title: 'T'.repeat(81) }));

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  for (const example of [
    { name: 'missing', payload: {} },
    { name: 'empty', payload: { title: '   ' } },
  ]) {
    test(`rejects a ${example.name} title`, async ({ apiClient }) => {
      const response = await apiClient.createTask(example.payload);
      expect(response.status()).toBe(400);
    });
  }

  test('rejects a description above 500 characters', async ({ apiClient }) => {
    const response = await apiClient.createTask(validTask({ description: 'D'.repeat(501) }));
    expect(response.status()).toBe(400);
  });

  test('accepts omitted, empty, and 500-character descriptions', async ({ apiClient }) => {
    for (const description of [undefined, '', 'D'.repeat(500)]) {
      const payload = validTask();
      if (description === undefined) delete payload.description;
      else payload.description = description;

      const response = await apiClient.createTask(payload);
      expect(response.status()).toBe(201);
      const { data } = (await response.json()) as { data: Task };
      expect(data.description).toBe(description ?? '');
    }
  });

  for (const example of [
    { field: 'priority', value: 'urgent' },
    { field: 'status', value: 'archived' },
    { field: 'dueDate', value: '2030-02-30' },
  ]) {
    test(`rejects invalid ${example.field}`, async ({ apiClient }) => {
      const response = await apiClient.createTask({
        ...validTask(),
        [example.field]: example.value,
      });
      expect(response.status()).toBe(400);
    });
  }

  test('supports the complete get, patch, and delete lifecycle', async ({ apiClient }) => {
    const create = await apiClient.createTask(validTask());
    const created = ((await create.json()) as { data: Task }).data;

    const get = await apiClient.getTask(created.id);
    expect(get.status()).toBe(200);
    expect(await get.json()).toEqual({ data: expect.objectContaining({ id: created.id }) });

    const update = await apiClient.updateTask(created.id, {
      title: 'Updated through API',
      status: 'done',
      priority: 'high',
    });
    expect(update.status()).toBe(200);
    expect(await update.json()).toEqual({
      data: expect.objectContaining({
        id: created.id,
        title: 'Updated through API',
        status: 'done',
        priority: 'high',
      }),
    });

    const remove = await apiClient.deleteTask(created.id);
    expect(remove.status()).toBe(204);

    const missing = await apiClient.getTask(created.id);
    expect(missing.status()).toBe(404);
  });

  test('invalid update is atomic and preserves the prior task', async ({ apiClient }) => {
    const create = await apiClient.createTask(
      validTask({ title: 'Atomic original', status: 'todo' }),
    );
    const created = ((await create.json()) as { data: Task }).data;

    const update = await apiClient.updateTask(created.id, {
      title: 'Must not persist',
      status: 'blocked',
    });
    expect(update.status()).toBe(400);

    const unchanged = await apiClient.getTask(created.id);
    expect(await unchanged.json()).toMatchObject({
      data: { title: 'Atomic original', status: 'todo' },
    });
  });

  test('filters by search text, status, and priority', async ({ apiClient }) => {
    const matchingTitle = uniqueTitle('Release checklist');
    await apiClient.createTask(
      validTask({ title: matchingTitle, status: 'done', priority: 'high' }),
    );
    await apiClient.createTask(validTask({ title: uniqueTitle('Backlog'), priority: 'low' }));

    const response = await apiClient.listTasks({
      search: 'Release checklist',
      status: 'done',
      priority: 'high',
    });

    expect(response.status()).toBe(200);
    const { data: tasks } = (await response.json()) as { data: Task[] };
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.title).toBe(matchingTitle);
  });

  test('search is case-insensitive and includes descriptions', async ({ apiClient }) => {
    const title = uniqueTitle('Searchable');
    await apiClient.createTask(
      validTask({ title, description: 'Contains a UNIQUE Evidence Marker' }),
    );

    const response = await apiClient.listTasks({ search: 'unique evidence marker' });
    expect(response.status()).toBe(200);
    const { data } = (await response.json()) as { data: Task[] };
    expect(data.map((task) => task.title)).toContain(title);
  });

  for (const filters of [{ status: 'blocked' }, { priority: 'urgent' }]) {
    test(`rejects unsupported ${Object.keys(filters)[0]} filter`, async ({ apiClient }) => {
      const response = await apiClient.listTasks(filters);
      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    });
  }

  test('rejects client-controlled identity and workspace fields', async ({ apiClient }) => {
    const response = await apiClient.createTask({
      ...validTask(),
      id: 'client-selected-id',
      workspaceId: 'foreign-workspace',
    });
    expect(response.status()).toBe(400);
  });

  for (const operation of ['get', 'patch', 'delete'] as const) {
    test(`${operation.toUpperCase()} returns 404 for an unknown identifier`, async ({
      apiClient,
    }) => {
      const unknownId = '00000000-0000-4000-8000-000000000000';
      const response =
        operation === 'get'
          ? await apiClient.getTask(unknownId)
          : operation === 'patch'
            ? await apiClient.updateTask(unknownId, { title: 'Still missing' })
            : await apiClient.deleteTask(unknownId);

      expect(response.status()).toBe(404);
      expect(await response.json()).toMatchObject({
        error: { code: 'TASK_NOT_FOUND', message: expect.any(String) },
      });
    });
  }
});
