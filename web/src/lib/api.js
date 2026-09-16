import { clearAuth } from './auth';

const BASE = '/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),

  // Members
  getMembers: () => request('/members'),
  getMember: (id) => request(`/members/${id}`),
  createMember: (body) => request('/members', { method: 'POST', body }),
  updateMember: (id, body) => request(`/members/${id}`, { method: 'PUT', body }),
  deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (body) => request('/projects', { method: 'POST', body }),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PUT', body }),
  updateParticipants: (id, participant_ids) =>
    request(`/projects/${id}/participants`, { method: 'PUT', body: { participant_ids } }),
  changeProjectStatus: (id, status) =>
    request(`/projects/${id}/status`, { method: 'POST', body: { status } }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenseByProject: (projectId) => request(`/expenses/project/${projectId}`),
  createExpenseDoc: (projectId) =>
    request(`/expenses/project/${projectId}`, { method: 'POST' }),
  getExpense: (id) => request(`/expenses/${id}`),
  addExpenseItem: (id, body) =>
    request(`/expenses/${id}/items`, { method: 'POST', body }),
  updateExpenseItem: (id, itemId, body) =>
    request(`/expenses/${id}/items/${itemId}`, { method: 'PUT', body }),
  signUpload: (body) => request('/attachments/sign-upload', { method: 'POST', body }),
  signDownload: (path) => request(`/attachments/sign-download?path=${encodeURIComponent(path)}`),
  deleteExpenseItem: (id, itemId) =>
    request(`/expenses/${id}/items/${itemId}`, { method: 'DELETE' }),
  changeExpenseStatus: (id, status) =>
    request(`/expenses/${id}/status`, { method: 'PUT', body: { status } }),
  sendToMembers: (id) => request(`/expenses/${id}/send`, { method: 'POST' }),
  setRemainder: (id, memberId) =>
    request(`/expenses/${id}/remainder`, { method: 'PUT', body: { member_id: memberId || null } }),
  reopenExpense: (id) => request(`/expenses/${id}/reopen`, { method: 'POST' }),

  // Dashboard
  getDashboardOverview: () => request('/dashboard/overview'),
  getMemberDashboard: (memberId) => request(`/dashboard/member/${memberId}`),
  getMyDashboard: () => request('/dashboard/my'),
  getLeaderDashboard: () => request('/dashboard/leader'),
  getWelfareDashboard: () => request('/dashboard/welfare'),
};
