import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures/test.js';
import { INVALID_USER, VIEWER_USER, WRITER_USER } from '../../test-data/users.js';
import { validTask } from '../../test-data/tasks.js';

test.describe('Authentication and authorization API', () => {
  test('GET /health reports that the application is ready', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'taskflow-api' });
  });

  test('valid writer credentials return a documented user and bearer token', async ({
    request,
    workspaceId,
  }) => {
    const response = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: { email: WRITER_USER.email, password: WRITER_USER.password },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      token: expect.any(String),
      user: {
        email: WRITER_USER.email,
        name: WRITER_USER.name,
        role: WRITER_USER.role,
      },
    });
    expect(body.token.length).toBeGreaterThan(10);
  });

  test('invalid credentials return a structured 401 error', async ({ request, workspaceId }) => {
    const response = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: INVALID_USER,
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: expect.any(String),
      },
    });
  });

  test('non-object login payload returns a controlled validation error', async ({
    request,
    workspaceId,
  }) => {
    const response = await request.post('/api/auth/login', {
      headers: {
        'X-Workspace-Id': workspaceId,
        'Content-Type': 'application/json',
      },
      data: [],
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  test('missing bearer token returns 401', async ({ request, workspaceId }) => {
    const response = await request.get('/api/tasks', {
      headers: { 'X-Workspace-Id': workspaceId },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      error: {
        code: expect.stringMatching(/AUTHENTICATION_REQUIRED|UNAUTHENTICATED/),
        message: expect.any(String),
      },
    });
  });

  test('invalid bearer token returns 401', async ({ request, workspaceId }) => {
    const response = await request.get('/api/tasks', {
      headers: {
        'X-Workspace-Id': workspaceId,
        Authorization: 'Bearer invalid-demo-token',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('viewer can read tasks but cannot create them', async ({ request }) => {
    const workspaceId = `viewer-${randomUUID()}`;
    const login = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: { email: VIEWER_USER.email, password: VIEWER_USER.password },
    });
    expect(login).toBeOK();
    const { token } = (await login.json()) as { token: string };
    const headers = {
      'X-Workspace-Id': workspaceId,
      Authorization: `Bearer ${token}`,
    };

    const list = await request.get('/api/tasks', { headers });
    expect(list.status()).toBe(200);

    const create = await request.post('/api/tasks', { headers, data: validTask() });
    expect(create.status()).toBe(403);
    expect(await create.json()).toMatchObject({
      error: { code: 'FORBIDDEN', message: expect.any(String) },
    });
  });

  test('viewer cannot update or delete an existing task', async ({ request }) => {
    const workspaceId = `viewer-mutations-${randomUUID()}`;
    const writerLogin = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: { email: WRITER_USER.email, password: WRITER_USER.password },
    });
    const { token: writerToken } = (await writerLogin.json()) as { token: string };
    const writerHeaders = {
      'X-Workspace-Id': workspaceId,
      Authorization: `Bearer ${writerToken}`,
    };
    const created = await request.post('/api/tasks', {
      headers: writerHeaders,
      data: validTask({ title: 'Viewer must not change this task' }),
    });
    const { data: task } = (await created.json()) as { data: { id: string; title: string } };

    const viewerLogin = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: { email: VIEWER_USER.email, password: VIEWER_USER.password },
    });
    const { token: viewerToken } = (await viewerLogin.json()) as { token: string };
    const viewerHeaders = {
      'X-Workspace-Id': workspaceId,
      Authorization: `Bearer ${viewerToken}`,
    };

    const update = await request.patch(`/api/tasks/${task.id}`, {
      headers: viewerHeaders,
      data: { title: 'Unauthorized change' },
    });
    const remove = await request.delete(`/api/tasks/${task.id}`, { headers: viewerHeaders });
    expect(update.status()).toBe(403);
    expect(remove.status()).toBe(403);

    const unchanged = await request.get(`/api/tasks/${task.id}`, { headers: writerHeaders });
    expect(await unchanged.json()).toMatchObject({ data: { title: task.title } });
  });

  test('bearer token cannot be reused for another workspace', async ({ request }) => {
    const workspaceId = `workspace-a-${randomUUID()}`;
    const login = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: { email: WRITER_USER.email, password: WRITER_USER.password },
    });
    const { token } = (await login.json()) as { token: string };

    const response = await request.get('/api/tasks', {
      headers: {
        'X-Workspace-Id': `workspace-b-${randomUUID()}`,
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: 'WORKSPACE_FORBIDDEN', message: expect.any(String) },
    });
  });

  test('logout invalidates the bearer token', async ({ request, workspaceId }) => {
    const login = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: { email: WRITER_USER.email, password: WRITER_USER.password },
    });
    const { token } = (await login.json()) as { token: string };
    const headers = {
      'X-Workspace-Id': workspaceId,
      Authorization: `Bearer ${token}`,
    };

    const logout = await request.post('/api/auth/logout', { headers });
    expect(logout.status()).toBe(204);

    const afterLogout = await request.get('/api/tasks', { headers });
    expect(afterLogout.status()).toBe(401);
  });

  test('test reset rejects anonymous and viewer requests', async ({ request }) => {
    const workspaceId = `reset-auth-${randomUUID()}`;
    const anonymous = await request.post('/api/test-support/reset', {
      headers: { 'X-Workspace-Id': workspaceId },
    });
    expect(anonymous.status()).toBe(401);

    const viewerLogin = await request.post('/api/auth/login', {
      headers: { 'X-Workspace-Id': workspaceId },
      data: { email: VIEWER_USER.email, password: VIEWER_USER.password },
    });
    const { token } = (await viewerLogin.json()) as { token: string };
    const viewer = await request.post('/api/test-support/reset', {
      headers: {
        'X-Workspace-Id': workspaceId,
        Authorization: `Bearer ${token}`,
      },
    });
    expect(viewer.status()).toBe(403);
  });
});
