import { randomUUID } from 'node:crypto';

import type { CreateTaskData, Task, TaskFilters, UpdateTaskData } from './types.js';

const workspaces = new Map<string, Map<string, Task>>();

const demoSeed: CreateTaskData[] = [
  {
    title: 'Review checkout acceptance criteria',
    description: 'Confirm happy-path and negative scenarios with the product owner.',
    priority: 'high',
    status: 'in-progress',
    dueDate: '2026-12-01',
  },
  {
    title: 'Automate API boundary checks',
    description: 'Add title-length and invalid-enum coverage to the regression suite.',
    priority: 'medium',
    status: 'todo',
    dueDate: null,
  },
  {
    title: 'Publish sprint test summary',
    description: 'Share the executed scope, risks, and open defects.',
    priority: 'low',
    status: 'done',
    dueDate: null,
  },
];

function createTaskRecord(data: CreateTaskData): Task {
  const timestamp = new Date().toISOString();

  return {
    id: randomUUID(),
    ...data,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function seedWorkspace(): Map<string, Task> {
  return new Map(
    demoSeed.map((task) => {
      const record = createTaskRecord(task);
      return [record.id, record];
    }),
  );
}

function getWorkspace(workspaceId: string): Map<string, Task> {
  const existing = workspaces.get(workspaceId);
  if (existing) {
    return existing;
  }

  const created = workspaceId === 'demo' ? seedWorkspace() : new Map<string, Task>();
  workspaces.set(workspaceId, created);
  return created;
}

export function resetWorkspace(workspaceId: string, includeSeed = false): void {
  workspaces.set(workspaceId, includeSeed ? seedWorkspace() : new Map<string, Task>());
}

export function listTasks(workspaceId: string, filters: TaskFilters): Task[] {
  const query = filters.q?.trim().toLocaleLowerCase();

  return [...getWorkspace(workspaceId).values()]
    .filter((task) => {
      const matchesQuery =
        !query ||
        task.title.toLocaleLowerCase().includes(query) ||
        task.description.toLocaleLowerCase().includes(query);
      const matchesStatus = !filters.status || task.status === filters.status;
      const matchesPriority = !filters.priority || task.priority === filters.priority;

      return matchesQuery && matchesStatus && matchesPriority;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function findTask(workspaceId: string, taskId: string): Task | undefined {
  return getWorkspace(workspaceId).get(taskId);
}

export function createTask(workspaceId: string, data: CreateTaskData): Task {
  const task = createTaskRecord(data);
  getWorkspace(workspaceId).set(task.id, task);
  return task;
}

export function updateTask(
  workspaceId: string,
  taskId: string,
  changes: UpdateTaskData,
): Task | undefined {
  const workspace = getWorkspace(workspaceId);
  const existing = workspace.get(taskId);
  if (!existing) {
    return undefined;
  }

  const updated: Task = {
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  workspace.set(taskId, updated);
  return updated;
}

export function deleteTask(workspaceId: string, taskId: string): boolean {
  return getWorkspace(workspaceId).delete(taskId);
}
