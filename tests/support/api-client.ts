import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { DemoUser } from '../../test-data/users.js';
import { WRITER_USER } from '../../test-data/users.js';
import type { TaskPayload } from '../../test-data/tasks.js';

export class TaskApiClient {
  private token?: string;

  constructor(
    private readonly request: APIRequestContext,
    readonly workspaceId: string,
  ) {}

  private workspaceHeaders(): Record<string, string> {
    return { 'X-Workspace-Id': this.workspaceId };
  }

  private authenticatedHeaders(): Record<string, string> {
    if (!this.token) {
      throw new Error('Call login() before making an authenticated API request.');
    }
    return {
      ...this.workspaceHeaders(),
      Authorization: `Bearer ${this.token}`,
    };
  }

  async login(user: DemoUser = WRITER_USER): Promise<APIResponse> {
    const response = await this.request.post('/api/auth/login', {
      headers: this.workspaceHeaders(),
      data: { email: user.email, password: user.password },
    });
    if (response.ok()) {
      const body = (await response.json()) as { token: string };
      this.token = body.token;
    }
    return response;
  }

  async reset(): Promise<APIResponse> {
    return this.request.post('/api/test-support/reset', {
      headers: this.authenticatedHeaders(),
    });
  }

  async listTasks(
    filters: {
      search?: string;
      status?: string;
      priority?: string;
    } = {},
  ): Promise<APIResponse> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) searchParams.set(key === 'search' ? 'q' : key, value);
    }
    const query = searchParams.toString();
    return this.request.get(`/api/tasks${query ? `?${query}` : ''}`, {
      headers: this.authenticatedHeaders(),
    });
  }

  async createTask(payload: TaskPayload | Record<string, unknown>): Promise<APIResponse> {
    return this.request.post('/api/tasks', {
      headers: this.authenticatedHeaders(),
      data: payload,
    });
  }

  async getTask(id: string): Promise<APIResponse> {
    return this.request.get(`/api/tasks/${encodeURIComponent(id)}`, {
      headers: this.authenticatedHeaders(),
    });
  }

  async updateTask(
    id: string,
    payload: Partial<TaskPayload> | Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.request.patch(`/api/tasks/${encodeURIComponent(id)}`, {
      headers: this.authenticatedHeaders(),
      data: payload,
    });
  }

  async deleteTask(id: string): Promise<APIResponse> {
    return this.request.delete(`/api/tasks/${encodeURIComponent(id)}`, {
      headers: this.authenticatedHeaders(),
    });
  }
}
