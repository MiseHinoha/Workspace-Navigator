import axios, { AxiosError } from 'axios';
import { Bookmark } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),
  getMe: () => api.get('/auth/me'),
  getRegistrationStatus: () => api.get('/auth/registration-status'),
  toggleRegistration: (enabled: boolean) =>
    api.post('/auth/toggle-registration', { enabled }),
};

// Workspace API
export const workspaceApi = {
  getAll: () => api.get('/workspaces'),
  create: (data: { name: string; description?: string; icon?: string }) =>
    api.post('/workspaces', data),
  update: (id: string, data: Partial<{ name: string; description?: string; icon?: string; sort_order: number }>) =>
    api.put(`/workspaces/${id}`, data),
  delete: (id: string) => api.delete(`/workspaces/${id}`),
  getCards: (id: string, groupId?: string | null) => api.get(`/workspaces/${id}/cards`, { 
    params: { group_id: groupId } 
  }),
  addCard: (id: string, bookmarkId: string, groupId?: string) =>
    api.post(`/workspaces/${id}/cards`, { 
      bookmark_id: bookmarkId, 
      group_id: groupId 
    }),
  moveCard: (workspaceId: string, cardId: string, groupId?: string) =>
    api.put(`/workspaces/${workspaceId}/cards/${cardId}`, { group_id: groupId }),
  removeCard: (workspaceId: string, cardId: string) =>
    api.delete(`/workspaces/${workspaceId}/cards/${cardId}`),
};

// Bookmark API
export interface BookmarkPageResponse {
  items: Bookmark[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export const bookmarkApi = {
  getAll: (tag?: string) => api.get('/bookmarks', { params: { tag } }),
  getPage: (params?: { tag?: string; limit?: number; offset?: number }) =>
    api.get<BookmarkPageResponse>('/bookmarks', { params }),
  getTags: () => api.get('/bookmarks/tags'),
  getFrequent: () => api.get('/bookmarks/frequent'),
  fetchMetadata: (url: string) => api.get('/bookmarks/fetch-metadata', { params: { url } }),
  create: (data: { title?: string; url: string; description?: string; icon?: string; tags: string[]; is_frequent?: boolean }) =>
    api.post('/bookmarks', data),
  update: (id: string, data: Partial<{ title: string; url: string; description?: string; icon?: string; tags: string[]; is_frequent?: boolean; frequent_order?: number }>) =>
    api.put(`/bookmarks/${id}`, data),
  delete: (id: string) => api.delete(`/bookmarks/${id}`),
};

// Group API
export const groupApi = {
  getByWorkspace: (workspaceId: string) => api.get(`/groups/workspace/${workspaceId}`),
  create: (data: { workspace_id: string; name: string; description?: string }) =>
    api.post('/groups', data),
  update: (id: string, data: Partial<{ name: string; description?: string; sort_order: number }>) =>
    api.put(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
};

// Session API
export const sessionApi = {
  getAll: () => api.get('/sessions'),
  create: (data: { device_name?: string; device_info?: string; tabs: any[]; active_workspace_id?: string; session_id?: string }) =>
    api.post('/sessions', data),
  delete: (id: string) => api.delete(`/sessions/${id}`),
};

export default api;
