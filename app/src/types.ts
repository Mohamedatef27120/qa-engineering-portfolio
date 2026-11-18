export type Role = 'writer' | 'viewer';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
}

export type UpdateTaskData = Partial<CreateTaskData>;

export interface TaskFilters {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

export interface DemoUser extends SessionUser {
  password: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
