import { randomUUID } from 'node:crypto';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface TaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
}

export interface Task extends Required<Omit<TaskPayload, 'dueDate'>> {
  id: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export function uniqueTitle(prefix = 'Portfolio task'): string {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}

export function validTask(overrides: Partial<TaskPayload> = {}): TaskPayload {
  return {
    title: uniqueTitle(),
    description: 'Created by an automated portfolio test.',
    priority: 'medium',
    dueDate: '2030-12-31',
    ...overrides,
  };
}
