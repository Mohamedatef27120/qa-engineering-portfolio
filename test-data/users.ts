export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: 'writer' | 'viewer';
}

// These are documented local-demo credentials, not production secrets.
export const WRITER_USER: DemoUser = {
  email: 'writer@example.test',
  password: 'Writer123!',
  name: 'QA Writer',
  role: 'writer',
};

export const VIEWER_USER: DemoUser = {
  email: 'viewer@example.test',
  password: 'Viewer123!',
  name: 'QA Viewer',
  role: 'viewer',
};

export const INVALID_USER = {
  email: 'unknown@example.test',
  password: 'incorrect-password',
};
