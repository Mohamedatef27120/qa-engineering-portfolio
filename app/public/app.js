(() => {
  const workspaceId = new URLSearchParams(window.location.search).get('workspace') || 'demo';
  const sessionKey = `taskflow-session-${workspaceId}`;
  const state = {
    token: '',
    user: null,
    tasks: [],
    editingTaskId: null,
    pendingDeleteId: null,
    taskRequestVersion: 0,
  };

  const elements = {
    loginView: document.querySelector('#login-view'),
    appView: document.querySelector('#app-view'),
    loginForm: document.querySelector('#login-form'),
    loginError: document.querySelector('#login-error'),
    email: document.querySelector('#email'),
    password: document.querySelector('#password'),
    userMenu: document.querySelector('#user-menu'),
    userName: document.querySelector('#user-name'),
    userRole: document.querySelector('#user-role'),
    userAvatar: document.querySelector('#user-avatar'),
    logoutButton: document.querySelector('#logout-button'),
    workspaceLabel: document.querySelector('#workspace-label'),
    readOnlyNotice: document.querySelector('#read-only-notice'),
    taskEditor: document.querySelector('#task-editor'),
    taskForm: document.querySelector('#task-form'),
    editorHeading: document.querySelector('#editor-heading'),
    cancelEdit: document.querySelector('#cancel-edit'),
    title: document.querySelector('#title'),
    titleCount: document.querySelector('#title-count'),
    titleError: document.querySelector('#title-error'),
    description: document.querySelector('#description'),
    descriptionCount: document.querySelector('#description-count'),
    descriptionError: document.querySelector('#description-error'),
    priority: document.querySelector('#priority'),
    status: document.querySelector('#status'),
    dueDate: document.querySelector('#due-date'),
    taskFormError: document.querySelector('#task-form-error'),
    taskSubmit: document.querySelector('#task-submit'),
    search: document.querySelector('#search'),
    statusFilter: document.querySelector('#status-filter'),
    priorityFilter: document.querySelector('#priority-filter'),
    clearFilters: document.querySelector('#clear-filters'),
    loadingState: document.querySelector('#loading-state'),
    emptyState: document.querySelector('#empty-state'),
    taskList: document.querySelector('#task-list'),
    resultCount: document.querySelector('#result-count'),
    countTotal: document.querySelector('#count-total'),
    countTodo: document.querySelector('#count-todo'),
    countProgress: document.querySelector('#count-progress'),
    countDone: document.querySelector('#count-done'),
    deleteDialog: document.querySelector('#delete-dialog'),
    deleteDialogCopy: document.querySelector('#delete-dialog-copy'),
    toast: document.querySelector('#toast'),
  };

  const accounts = {
    writer: { email: 'writer@example.test', password: 'Writer123!' },
    viewer: { email: 'viewer@example.test', password: 'Viewer123!' },
  };

  function setHidden(element, hidden) {
    element.classList.toggle('hidden', hidden);
  }

  function setError(element, message) {
    element.textContent = message;
    setHidden(element, !message);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    setHidden(elements.toast, false);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setHidden(elements.toast, true), 2600);
  }

  async function api(route, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('X-Workspace-Id', workspaceId);
    if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
    if (options.body) headers.set('Content-Type', 'application/json');

    const response = await fetch(route, { ...options, headers });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(
        body?.error?.message || `Request failed with status ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function saveSession() {
    window.localStorage.setItem(
      sessionKey,
      JSON.stringify({ token: state.token, user: state.user }),
    );
  }

  function clearSession() {
    state.token = '';
    state.user = null;
    window.localStorage.removeItem(sessionKey);
  }

  function showLogin() {
    setHidden(elements.loginView, false);
    setHidden(elements.appView, true);
    setHidden(elements.userMenu, true);
  }

  function showApplication() {
    setHidden(elements.loginView, true);
    setHidden(elements.appView, false);
    setHidden(elements.userMenu, false);
    elements.workspaceLabel.textContent = workspaceId;
    elements.userName.textContent = state.user.name;
    elements.userRole.textContent =
      state.user.role === 'writer' ? 'Writer access' : 'Read-only access';
    elements.userAvatar.textContent = state.user.name.charAt(0).toUpperCase();
    const readOnly = state.user.role === 'viewer';
    setHidden(elements.taskEditor, readOnly);
    setHidden(elements.readOnlyNotice, !readOnly);
  }

  function escapeHtml(value) {
    const node = document.createElement('div');
    node.textContent = value;
    return node.innerHTML;
  }

  function displayDate(date) {
    if (!date) return 'No due date';
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));
  }

  function statusLabel(status) {
    return { todo: 'To do', 'in-progress': 'In progress', done: 'Done' }[status];
  }

  function renderTasks() {
    elements.taskList.innerHTML = '';
    setHidden(elements.loadingState, true);
    setHidden(elements.emptyState, state.tasks.length > 0);
    elements.resultCount.textContent = `${state.tasks.length} ${state.tasks.length === 1 ? 'task' : 'tasks'}`;
    elements.countTotal.textContent = String(state.tasks.length);
    elements.countTodo.textContent = String(
      state.tasks.filter((task) => task.status === 'todo').length,
    );
    elements.countProgress.textContent = String(
      state.tasks.filter((task) => task.status === 'in-progress').length,
    );
    elements.countDone.textContent = String(
      state.tasks.filter((task) => task.status === 'done').length,
    );

    for (const task of state.tasks) {
      const card = document.createElement('article');
      card.className = `task-card task-card--${task.priority}`;
      card.dataset.testid = 'task-card';
      card.dataset.taskId = task.id;
      const actions =
        state.user.role === 'writer'
          ? `<div class="task-card__actions">
              <button class="icon-button" type="button" data-action="edit" aria-label="Edit ${escapeHtml(task.title)}" title="Edit task">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 16Z"></path><path d="m14.5 6.5 3 3"></path></svg>
              </button>
              <button class="icon-button icon-button--danger" type="button" data-action="delete" aria-label="Delete ${escapeHtml(task.title)}" title="Delete task">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="m7 7 1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>
              </button>
            </div>`
          : '';

      card.innerHTML = `
        <div class="task-card__topline">
          <span class="priority-pill priority-pill--${task.priority}">${escapeHtml(task.priority)} priority</span>
          <span class="status-pill status-pill--${task.status}"><i></i>${statusLabel(task.status)}</span>
        </div>
        <div class="task-card__body">
          <h3>${escapeHtml(task.title)}</h3>
          <p>${task.description ? escapeHtml(task.description) : '<span class="muted">No description</span>'}</p>
        </div>
        <div class="task-card__footer">
          <span class="due-date">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg>
            ${displayDate(task.dueDate)}
          </span>
          ${actions}
        </div>`;
      elements.taskList.append(card);
    }
  }

  async function loadTasks() {
    const requestVersion = ++state.taskRequestVersion;
    setHidden(elements.loadingState, false);
    setHidden(elements.emptyState, true);
    const params = new URLSearchParams();
    if (elements.search.value.trim()) params.set('q', elements.search.value.trim());
    if (elements.statusFilter.value) params.set('status', elements.statusFilter.value);
    if (elements.priorityFilter.value) params.set('priority', elements.priorityFilter.value);

    try {
      const result = await api(`/api/tasks${params.size ? `?${params}` : ''}`);
      if (requestVersion !== state.taskRequestVersion) return;
      state.tasks = result.data;
      renderTasks();
    } catch (error) {
      if (requestVersion !== state.taskRequestVersion) return;
      if (error.status === 401) {
        clearSession();
        showLogin();
        setError(elements.loginError, 'Your session ended. Please sign in again.');
        return;
      }
      elements.loadingState.textContent = 'Tasks could not be loaded. Please try again.';
    }
  }

  function resetTaskForm() {
    state.editingTaskId = null;
    elements.taskForm.reset();
    elements.priority.value = 'medium';
    elements.status.value = 'todo';
    elements.editorHeading.textContent = 'Create a task';
    elements.taskSubmit.textContent = 'Create task';
    setHidden(elements.cancelEdit, true);
    setError(elements.titleError, '');
    setError(elements.descriptionError, '');
    setError(elements.taskFormError, '');
    updateCharacterCounts();
  }

  function editTask(task) {
    state.editingTaskId = task.id;
    elements.title.value = task.title;
    elements.description.value = task.description;
    elements.priority.value = task.priority;
    elements.status.value = task.status;
    elements.dueDate.value = task.dueDate || '';
    elements.editorHeading.textContent = 'Edit task';
    elements.taskSubmit.textContent = 'Save changes';
    setHidden(elements.cancelEdit, false);
    updateCharacterCounts();
    elements.taskEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    elements.title.focus();
  }

  function validateTaskForm() {
    const title = elements.title.value.trim();
    const description = elements.description.value;
    let valid = true;
    if (title.length === 0) {
      setError(elements.titleError, 'Enter a title.');
      valid = false;
    } else if (title.length > 80) {
      setError(elements.titleError, 'Title must contain 1 to 80 characters.');
      valid = false;
    } else {
      setError(elements.titleError, '');
    }
    if (description.length > 500) {
      setError(elements.descriptionError, 'Description must contain at most 500 characters.');
      valid = false;
    } else {
      setError(elements.descriptionError, '');
    }
    return valid;
  }

  function updateCharacterCounts() {
    elements.titleCount.textContent = String(elements.title.value.length);
    elements.descriptionCount.textContent = String(elements.description.value.length);
  }

  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(elements.loginError, '');
    if (!elements.email.value.trim() || !elements.password.value) {
      setError(elements.loginError, 'Enter both email and password.');
      return;
    }
    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: elements.email.value.trim(),
          password: elements.password.value,
        }),
      });
      state.token = result.token;
      state.user = result.user;
      saveSession();
      showApplication();
      await loadTasks();
    } catch (error) {
      setError(elements.loginError, error.message);
    }
  });

  document.querySelectorAll('[data-account]').forEach((button) => {
    button.addEventListener('click', () => {
      const account = accounts[button.dataset.account];
      elements.email.value = account.email;
      elements.password.value = account.password;
      elements.email.focus();
    });
  });

  elements.logoutButton.addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
      state.tasks = [];
      resetTaskForm();
      elements.loginForm.reset();
      showLogin();
    }
  });

  elements.taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError(elements.taskFormError, '');
    if (!validateTaskForm()) return;
    const payload = {
      title: elements.title.value.trim(),
      description: elements.description.value.trim(),
      priority: elements.priority.value,
      status: elements.status.value,
      dueDate: elements.dueDate.value || null,
    };
    try {
      const editing = Boolean(state.editingTaskId);
      await api(editing ? `/api/tasks/${state.editingTaskId}` : '/api/tasks', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      resetTaskForm();
      await loadTasks();
      showToast(editing ? 'Task updated' : 'Task created');
    } catch (error) {
      setError(elements.taskFormError, error.message);
    }
  });

  elements.cancelEdit.addEventListener('click', resetTaskForm);
  elements.title.addEventListener('input', updateCharacterCounts);
  elements.description.addEventListener('input', updateCharacterCounts);

  elements.taskList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('[data-task-id]');
    const task = state.tasks.find((candidate) => candidate.id === card.dataset.taskId);
    if (!task) return;
    if (button.dataset.action === 'edit') {
      editTask(task);
      return;
    }
    state.pendingDeleteId = task.id;
    elements.deleteDialogCopy.textContent = `Delete “${task.title}”? This action cannot be undone.`;
    elements.deleteDialog.showModal();
  });

  elements.deleteDialog.addEventListener('close', async () => {
    const taskId = state.pendingDeleteId;
    state.pendingDeleteId = null;
    if (elements.deleteDialog.returnValue !== 'confirm' || !taskId) return;
    try {
      await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (state.editingTaskId === taskId) resetTaskForm();
      await loadTasks();
      showToast('Task deleted');
    } catch (error) {
      showToast(error.message);
    }
  });

  elements.search.addEventListener('input', loadTasks);
  elements.statusFilter.addEventListener('change', loadTasks);
  elements.priorityFilter.addEventListener('change', loadTasks);
  elements.clearFilters.addEventListener('click', () => {
    elements.search.value = '';
    elements.statusFilter.value = '';
    elements.priorityFilter.value = '';
    loadTasks();
  });

  async function initialize() {
    const savedSession = window.localStorage.getItem(sessionKey);
    if (!savedSession) {
      showLogin();
      return;
    }
    try {
      const session = JSON.parse(savedSession);
      state.token = session.token;
      state.user = session.user;
      showApplication();
      await loadTasks();
    } catch {
      clearSession();
      showLogin();
    }
  }

  initialize();
})();
