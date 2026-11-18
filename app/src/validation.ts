import type { CreateTaskData, TaskPriority, TaskStatus, UpdateTaskData } from './types.js';

export interface ValidationIssue {
  field: string;
  message: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

const priorities: TaskPriority[] = ['low', 'medium', 'high'];
const statuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
const taskFields = new Set(['title', 'description', 'priority', 'status', 'dueDate']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && priorities.includes(value as TaskPriority);
}

function isStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && statuses.includes(value as TaskStatus);
}

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function validateKnownFields(body: Record<string, unknown>, issues: ValidationIssue[]): void {
  for (const field of Object.keys(body)) {
    if (!taskFields.has(field)) {
      issues.push({ field, message: 'Unknown field' });
    }
  }
}

function validateTitle(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string') {
    issues.push({ field: 'title', message: 'Title must be a string' });
    return undefined;
  }

  const title = value.trim();
  if (title.length < 1 || title.length > 80) {
    issues.push({ field: 'title', message: 'Title must contain 1 to 80 characters' });
    return undefined;
  }

  return title;
}

function validateDescription(value: unknown, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== 'string') {
    issues.push({ field: 'description', message: 'Description must be a string' });
    return undefined;
  }

  if (value.length > 500) {
    issues.push({
      field: 'description',
      message: 'Description must contain at most 500 characters',
    });
    return undefined;
  }

  return value.trim();
}

function validateDueDate(value: unknown, issues: ValidationIssue[]): string | null | undefined {
  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !isRealIsoDate(value)) {
    issues.push({ field: 'dueDate', message: 'Due date must be a real date in YYYY-MM-DD format' });
    return undefined;
  }

  return value;
}

export function validateCreateTask(body: unknown): ValidationResult<CreateTaskData> {
  if (!isRecord(body)) {
    return {
      ok: false,
      issues: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const issues: ValidationIssue[] = [];
  validateKnownFields(body, issues);

  const title = validateTitle(body.title, issues);
  const description =
    body.description === undefined ? '' : validateDescription(body.description, issues);
  const dueDate = body.dueDate === undefined ? null : validateDueDate(body.dueDate, issues);

  let priority: TaskPriority | undefined;
  if (isPriority(body.priority)) {
    priority = body.priority;
  } else {
    issues.push({ field: 'priority', message: 'Priority must be low, medium, or high' });
  }

  let status: TaskStatus = 'todo';
  if (body.status !== undefined) {
    if (isStatus(body.status)) {
      status = body.status;
    } else {
      issues.push({ field: 'status', message: 'Status must be todo, in-progress, or done' });
    }
  }

  if (
    issues.length > 0 ||
    title === undefined ||
    description === undefined ||
    priority === undefined ||
    dueDate === undefined
  ) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: { title, description, priority, status, dueDate },
  };
}

export function validateUpdateTask(body: unknown): ValidationResult<UpdateTaskData> {
  if (!isRecord(body)) {
    return {
      ok: false,
      issues: [{ field: 'body', message: 'Request body must be a JSON object' }],
    };
  }

  const issues: ValidationIssue[] = [];
  validateKnownFields(body, issues);

  if (Object.keys(body).length === 0) {
    issues.push({ field: 'body', message: 'At least one task field is required' });
  }

  const changes: UpdateTaskData = {};

  if ('title' in body) {
    const title = validateTitle(body.title, issues);
    if (title !== undefined) changes.title = title;
  }

  if ('description' in body) {
    const description = validateDescription(body.description, issues);
    if (description !== undefined) changes.description = description;
  }

  if ('priority' in body) {
    if (isPriority(body.priority)) {
      changes.priority = body.priority;
    } else {
      issues.push({ field: 'priority', message: 'Priority must be low, medium, or high' });
    }
  }

  if ('status' in body) {
    if (isStatus(body.status)) {
      changes.status = body.status;
    } else {
      issues.push({ field: 'status', message: 'Status must be todo, in-progress, or done' });
    }
  }

  if ('dueDate' in body) {
    const dueDate = validateDueDate(body.dueDate, issues);
    if (dueDate !== undefined) changes.dueDate = dueDate;
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: changes };
}

export function parseStatus(value: unknown): TaskStatus | undefined {
  return isStatus(value) ? value : undefined;
}

export function parsePriority(value: unknown): TaskPriority | undefined {
  return isPriority(value) ? value : undefined;
}
