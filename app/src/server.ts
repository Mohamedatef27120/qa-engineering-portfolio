import { randomUUID } from 'node:crypto';
import path from 'node:path';

import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';

import {
  createTask,
  deleteTask,
  findTask,
  listTasks,
  resetWorkspace,
  updateTask,
} from './store.js';
import type { ApiErrorBody, DemoUser, SessionUser, TaskFilters } from './types.js';
import {
  parsePriority,
  parseStatus,
  validateCreateTask,
  validateUpdateTask,
  type ValidationIssue,
} from './validation.js';

const app = express();
const port = Number(process.env.PORT ?? 4180);
const testMode = process.env.TEST_MODE === 'true';
const publicDirectory = path.resolve(process.cwd(), 'app/public');

const demoUsers: DemoUser[] = [
  {
    email: 'writer@example.test',
    password: 'Writer123!',
    name: 'QA Writer',
    role: 'writer',
  },
  {
    email: 'viewer@example.test',
    password: 'Viewer123!',
    name: 'QA Viewer',
    role: 'viewer',
  },
];

interface SessionRecord {
  user: SessionUser;
  workspaceId: string;
}

const sessions = new Map<string, SessionRecord>();

interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  workspaceId?: string;
  sessionToken?: string;
}

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  response.status(status).json(body);
}

function workspaceIdFrom(request: Request): string {
  const header = request.header('X-Workspace-Id')?.trim();
  return header && header.length <= 100 ? header : 'default';
}

function routeParameter(request: Request, name: string): string {
  const value = request.params[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

const authenticate: RequestHandler = (request, response, next) => {
  const authorization = request.header('Authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    sendError(response, 401, 'AUTHENTICATION_REQUIRED', 'A valid bearer token is required');
    return;
  }

  const session = sessions.get(token);
  if (!session) {
    sendError(response, 401, 'INVALID_TOKEN', 'The bearer token is invalid or expired');
    return;
  }

  if (workspaceIdFrom(request) !== session.workspaceId) {
    sendError(response, 403, 'WORKSPACE_FORBIDDEN', 'The session cannot access this workspace');
    return;
  }

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = session.user;
  authenticatedRequest.workspaceId = session.workspaceId;
  authenticatedRequest.sessionToken = token;
  next();
};

const requireWriter: RequestHandler = (request, response, next) => {
  if ((request as AuthenticatedRequest).user?.role !== 'writer') {
    sendError(response, 403, 'FORBIDDEN', 'Writer role is required for this operation');
    return;
  }

  next();
};

function sendValidationError(response: Response, issues: ValidationIssue[]): void {
  sendError(response, 400, 'VALIDATION_ERROR', 'Request validation failed', { issues });
}

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(publicDirectory));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'taskflow-api' });
});

app.post('/api/auth/login', (request, response) => {
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) {
    sendValidationError(response, [
      { field: 'body', message: 'Request body must be a JSON object' },
    ]);
    return;
  }

  const { email, password } = request.body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    sendValidationError(response, [
      { field: 'credentials', message: 'Email and password are required' },
    ]);
    return;
  }

  const user = demoUsers.find(
    (candidate) => candidate.email === email && candidate.password === password,
  );

  if (!user) {
    sendError(response, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    return;
  }

  const token = randomUUID();
  const sessionUser: SessionUser = {
    email: user.email,
    name: user.name,
    role: user.role,
  };
  sessions.set(token, { user: sessionUser, workspaceId: workspaceIdFrom(request) });
  response.json({ token, user: sessionUser });
});

app.post('/api/auth/logout', authenticate, (request, response) => {
  const token = (request as AuthenticatedRequest).sessionToken;
  if (token) sessions.delete(token);
  response.status(204).send();
});

app.get('/api/tasks', authenticate, (request, response) => {
  const filters: TaskFilters = {};
  const query = typeof request.query.q === 'string' ? request.query.q : undefined;
  const status = parseStatus(request.query.status);
  const priority = parsePriority(request.query.priority);

  if (query !== undefined) filters.q = query;
  if (status !== undefined) filters.status = status;
  if (priority !== undefined) filters.priority = priority;

  if (request.query.status !== undefined && status === undefined) {
    sendValidationError(response, [
      { field: 'status', message: 'Status must be todo, in-progress, or done' },
    ]);
    return;
  }

  if (request.query.priority !== undefined && priority === undefined) {
    sendValidationError(response, [
      { field: 'priority', message: 'Priority must be low, medium, or high' },
    ]);
    return;
  }

  const tasks = listTasks(workspaceIdFrom(request), filters);
  response.json({ data: tasks, meta: { total: tasks.length } });
});

app.post('/api/tasks', authenticate, requireWriter, (request, response) => {
  const result = validateCreateTask(request.body);
  if (!result.ok) {
    sendValidationError(response, result.issues);
    return;
  }

  const task = createTask(workspaceIdFrom(request), result.value);
  response.status(201).json({ data: task });
});

app.get('/api/tasks/:taskId', authenticate, (request, response) => {
  const task = findTask(workspaceIdFrom(request), routeParameter(request, 'taskId'));
  if (!task) {
    sendError(response, 404, 'TASK_NOT_FOUND', 'Task was not found');
    return;
  }

  response.json({ data: task });
});

app.patch('/api/tasks/:taskId', authenticate, requireWriter, (request, response) => {
  const result = validateUpdateTask(request.body);
  if (!result.ok) {
    sendValidationError(response, result.issues);
    return;
  }

  const task = updateTask(
    workspaceIdFrom(request),
    routeParameter(request, 'taskId'),
    result.value,
  );
  if (!task) {
    sendError(response, 404, 'TASK_NOT_FOUND', 'Task was not found');
    return;
  }

  response.json({ data: task });
});

app.delete('/api/tasks/:taskId', authenticate, requireWriter, (request, response) => {
  const deleted = deleteTask(workspaceIdFrom(request), routeParameter(request, 'taskId'));
  if (!deleted) {
    sendError(response, 404, 'TASK_NOT_FOUND', 'Task was not found');
    return;
  }

  response.status(204).send();
});

app.post('/api/test-support/reset', authenticate, requireWriter, (request, response) => {
  if (!testMode) {
    sendError(response, 404, 'NOT_FOUND', 'Route was not found');
    return;
  }

  const workspaceId = workspaceIdFrom(request);
  const includeSeed = request.body?.includeSeed === true;
  resetWorkspace(workspaceId, includeSeed);
  response.json({ status: 'reset', workspaceId });
});

app.use('/api', (_request, response) => {
  sendError(response, 404, 'NOT_FOUND', 'Route was not found');
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError) {
    sendError(response, 400, 'INVALID_JSON', 'Request body contains invalid JSON');
    return;
  }

  console.error(error);
  sendError(response, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`TaskFlow QA is running at http://127.0.0.1:${port}`);
  console.log(`Test support routes are ${testMode ? 'enabled' : 'disabled'}.`);
});

function shutDown(): void {
  server.close(() => process.exit(0));
}

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);
