import { create } from 'zustand';
import { Workspace, Bookmark, PinnedCard, Group } from '../types';
import { workspaceApi, bookmarkApi, groupApi } from '../utils/api';

interface WorkspaceState {
  workspaces: Workspace[];
  bookmarks: Bookmark[];
  frequentBookmarks: Bookmark[];
  tags: string[];
  groups: Record<string, Group[]>;
  pinnedCards: Record<string, PinnedCard[]>;
  activeWorkspaceId: string | null;
  activeGroupId: string | null;
  isLoading: boolean;
  fetchWorkspaces: () => Promise<void>;
  fetchBookmarks: () => Promise<void>;
  fetchFrequentBookmarks: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchGroups: (workspaceId: string) => Promise<void>;
  fetchPinnedCards: (workspaceId: string, groupId?: string | null) => Promise<void>;
  createWorkspace: (data: { name: string; description?: string; icon?: string }) => Promise<void>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  createBookmark: (data: { title: string; url: string; description?: string; icon?: string; tags: string[]; is_frequent?: boolean }) => Promise<void>;
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  toggleFrequent: (id: string, isFrequent: boolean) => Promise<void>;
  createGroup: (workspaceId: string, name: string, description?: string) => Promise<void>;
  updateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  pinBookmark: (workspaceId: string, bookmarkId: string, groupId?: string) => Promise<void>;
  moveCardToGroup: (workspaceId: string, cardId: string, groupId?: string) => Promise<void>;
  unpinCard: (workspaceId: string, cardId: string) => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  setActiveGroup: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  bookmarks: [],
  frequentBookmarks: [],
  tags: [],
  groups: {},
  pinnedCards: {},
  activeWorkspaceId: null,
  activeGroupId: null,
  isLoading: false,

  fetchWorkspaces: async () => {
    const { data } = await workspaceApi.getAll();
    set({ workspaces: data });
  },

  fetchBookmarks: async () => {
    const { data } = await bookmarkApi.getAll();
    set({ bookmarks: data });
  },

  fetchFrequentBookmarks: async () => {
    const { data } = await bookmarkApi.getFrequent();
    set({ frequentBookmarks: data });
  },

  fetchTags: async () => {
    const { data } = await bookmarkApi.getTags();
    set({ tags: data });
  },

  fetchGroups: async (workspaceId: string) => {
    const { data } = await groupApi.getByWorkspace(workspaceId);
    set((state) => ({
      groups: { ...state.groups, [workspaceId]: data },
    }));
  },

  fetchPinnedCards: async (workspaceId: string, groupId?: string | null) => {
    const { data } = await workspaceApi.getCards(workspaceId, groupId);
    set((state) => ({
      pinnedCards: { ...state.pinnedCards, [`${workspaceId}-${groupId || 'null'}`]: data },
    }));
  },

  createWorkspace: async (data) => {
    await workspaceApi.create(data);
    await get().fetchWorkspaces();
  },

  updateWorkspace: async (id, data) => {
    await workspaceApi.update(id, data);
    await get().fetchWorkspaces();
  },

  deleteWorkspace: async (id) => {
    await workspaceApi.delete(id);
    await get().fetchWorkspaces();
    set((state) => ({
      pinnedCards: { ...state.pinnedCards },
    }));
  },

  createBookmark: async (data) => {
    await bookmarkApi.create(data);
    await get().fetchBookmarks();
    if (data.is_frequent) {
      await get().fetchFrequentBookmarks();
    }
    await get().fetchTags();
  },

  updateBookmark: async (id, data) => {
    await bookmarkApi.update(id, data);
    await get().fetchBookmarks();
    await get().fetchFrequentBookmarks();
    await get().fetchTags();
  },

  deleteBookmark: async (id) => {
    await bookmarkApi.delete(id);
    await get().fetchBookmarks();
    await get().fetchFrequentBookmarks();
    await get().fetchTags();
  },

  toggleFrequent: async (id, isFrequent) => {
    await bookmarkApi.update(id, { is_frequent: isFrequent });
    await get().fetchBookmarks();
    await get().fetchFrequentBookmarks();
  },

  createGroup: async (workspaceId, name, description) => {
    await groupApi.create({ workspace_id: workspaceId, name, description });
    await get().fetchGroups(workspaceId);
  },

  updateGroup: async (id, data) => {
    await groupApi.update(id, data);
    const { activeWorkspaceId } = get();
    if (activeWorkspaceId) {
      await get().fetchGroups(activeWorkspaceId);
    }
  },

  deleteGroup: async (id) => {
    await groupApi.delete(id);
    const { activeWorkspaceId } = get();
    if (activeWorkspaceId) {
      await get().fetchGroups(activeWorkspaceId);
      await get().fetchPinnedCards(activeWorkspaceId);
    }
  },

  pinBookmark: async (workspaceId, bookmarkId, groupId) => {
    await workspaceApi.addCard(workspaceId, bookmarkId, groupId);
    await get().fetchPinnedCards(workspaceId, groupId);
  },

  moveCardToGroup: async (workspaceId, cardId, groupId) => {
    await workspaceApi.moveCard(workspaceId, cardId, groupId);
    await get().fetchPinnedCards(workspaceId, groupId);
    await get().fetchPinnedCards(workspaceId, get().activeGroupId);
  },

  unpinCard: async (workspaceId, cardId) => {
    await workspaceApi.removeCard(workspaceId, cardId);
    const { activeGroupId } = get();
    await get().fetchPinnedCards(workspaceId, activeGroupId);
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id, activeGroupId: null });
  },

  setActiveGroup: (id) => {
    set({ activeGroupId: id });
  },
}));
