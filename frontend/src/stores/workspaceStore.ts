import { create } from 'zustand';
import { Workspace, Bookmark, PinnedCard, Group } from '../types';
import { workspaceApi, bookmarkApi, groupApi } from '../utils/api';

const ACTIVE_WORKSPACE_STORAGE_KEY = 'active_workspace_id';

function getSavedActiveWorkspaceId() {
  return localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

function saveActiveWorkspaceId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  }
}

interface WorkspaceState {
  workspaces: Workspace[];
  bookmarks: Bookmark[];
  bookmarksTotal: number;
  bookmarksHasMore: boolean;
  bookmarksOffset: number;
  frequentBookmarks: Bookmark[];
  tags: string[];
  groups: Record<string, Group[]>;
  pinnedCards: Record<string, PinnedCard[]>;
  activeWorkspaceId: string | null;
  activeGroupId: string | null;
  isLoading: boolean;
  fetchWorkspaces: () => Promise<void>;
  fetchBookmarks: () => Promise<void>;
  fetchBookmarksPage: (options?: { reset?: boolean; limit?: number; tag?: string; q?: string }) => Promise<void>;
  fetchFrequentBookmarks: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchGroups: (workspaceId: string) => Promise<void>;
  fetchPinnedCards: (workspaceId: string, groupId?: string | null) => Promise<void>;
  createWorkspace: (data: { name: string; description?: string; icon?: string }) => Promise<void>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  createBookmark: (data: { title?: string; url: string; description?: string; icon?: string; tags: string[]; is_frequent?: boolean }) => Promise<void>;
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  toggleFrequent: (id: string, isFrequent: boolean) => Promise<void>;
  createGroup: (workspaceId: string, name: string, description?: string) => Promise<void>;
  updateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  pinBookmark: (workspaceId: string, bookmarkId: string, groupId?: string) => Promise<void>;
  moveCardToGroup: (workspaceId: string, cardId: string, groupId?: string) => Promise<void>;
  unpinCard: (workspaceId: string, cardId: string) => Promise<void>;
  reorderCards: (workspaceId: string, groupId: string | null, cards: PinnedCard[]) => void;
  moveFrequentBookmark: (id: string, direction: 'up' | 'down') => Promise<void>;
  moveWorkspace: (id: string, direction: 'up' | 'down') => Promise<void>;
  setActiveWorkspace: (id: string | null) => void;
  setActiveGroup: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  bookmarks: [],
  bookmarksTotal: 0,
  bookmarksHasMore: true,
  bookmarksOffset: 0,
  frequentBookmarks: [],
  tags: [],
  groups: {},
  pinnedCards: {},
  activeWorkspaceId: null,
  activeGroupId: null,
  isLoading: false,

  fetchWorkspaces: async () => {
    const { data } = await workspaceApi.getAll();
    const savedActiveWorkspaceId = getSavedActiveWorkspaceId();
    const currentActiveWorkspaceId = get().activeWorkspaceId;
    const activeWorkspaceId =
      data.some((workspace: Workspace) => workspace.id === currentActiveWorkspaceId)
        ? currentActiveWorkspaceId
        : data.some((workspace: Workspace) => workspace.id === savedActiveWorkspaceId)
          ? savedActiveWorkspaceId
          : data[0]?.id || null;

    saveActiveWorkspaceId(activeWorkspaceId);
    set({
      workspaces: data,
      activeWorkspaceId,
      activeGroupId: activeWorkspaceId && activeWorkspaceId === currentActiveWorkspaceId ? get().activeGroupId : null,
    });
  },

  fetchBookmarks: async () => {
    const { data } = await bookmarkApi.getAll();
    set({ bookmarks: data, bookmarksTotal: data.length, bookmarksHasMore: false, bookmarksOffset: data.length });
  },

  fetchBookmarksPage: async (options) => {
    const limit = options?.limit ?? 50;
    const reset = options?.reset ?? false;
    const tag = options?.tag;
    const q = options?.q;
    const offset = reset ? 0 : get().bookmarksOffset;

    const { data } = await bookmarkApi.getPage({ limit, offset, tag, q });
    set((state) => ({
      bookmarks: reset ? data.items : [...state.bookmarks, ...data.items],
      bookmarksTotal: data.total,
      bookmarksHasMore: data.has_more,
      bookmarksOffset: data.offset + data.items.length,
    }));
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
    const { activeWorkspaceId } = get();
    await workspaceApi.delete(id);
    await get().fetchWorkspaces();
    set((state) => ({
      pinnedCards: { ...state.pinnedCards },
    }));
    if (activeWorkspaceId === id) {
      const nextWorkspaceId = get().activeWorkspaceId;
      saveActiveWorkspaceId(nextWorkspaceId);
    }
  },

  createBookmark: async (data) => {
    const { bookmarks, frequentBookmarks, tags } = get();
    
    // Optimistic update: generate temp ID and add to state immediately
    const tempId = `temp-${Date.now()}`;
    const newBookmark: Bookmark = {
      id: tempId,
      user_id: 'current-user',
      title: data.title || data.url,
      url: data.url,
      description: data.description || '',
      icon: data.icon || '',
      tags: data.tags || [],
      is_frequent: data.is_frequent || false,
      frequent_order: data.is_frequent ? frequentBookmarks.length + 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    set({ 
      bookmarks: [...bookmarks, newBookmark],
      tags: Array.from(new Set([...tags, ...newBookmark.tags])).sort(),
    });
    
    if (data.is_frequent) {
      set({ frequentBookmarks: [...frequentBookmarks, newBookmark] });
    }
    
    try {
      // Send API request
      const response = await bookmarkApi.create(data);
      const createdBookmark = response.data;
      
      // Ensure created bookmark has correct format
      const normalizedBookmark: Bookmark = {
        ...createdBookmark,
        tags: Array.isArray(createdBookmark.tags) ? createdBookmark.tags : [],
        is_frequent: !!createdBookmark.is_frequent,
        frequent_order: createdBookmark.frequent_order || 0
      };
      
      // Replace temp bookmark with real one
      const updatedBookmarks = get().bookmarks.map(b => b.id === tempId ? normalizedBookmark : b);
      set({ 
        bookmarks: updatedBookmarks
      });
      
      if (data.is_frequent) {
        set({ 
          frequentBookmarks: get().frequentBookmarks.map(b => b.id === tempId ? normalizedBookmark : b)
        });
      }
    } catch (error) {
      // Revert on error
      set({ 
        bookmarks: get().bookmarks.filter(b => b.id !== tempId)
      });
      if (data.is_frequent) {
        set({ frequentBookmarks: get().frequentBookmarks.filter(b => b.id !== tempId) });
      }
      throw error;
    }
    await get().fetchTags();
  },

  updateBookmark: async (id, data) => {
    const { bookmarks, frequentBookmarks, pinnedCards } = get();
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;
    
    // Optimistic update
    const updatedBookmark = { ...bookmark, ...data, updated_at: new Date().toISOString() };
    set({ 
      bookmarks: bookmarks.map(b => b.id === id ? updatedBookmark : b)
    });
    
    if (bookmark.is_frequent || data.is_frequent !== undefined) {
      set({ 
        frequentBookmarks: data.is_frequent === false 
          ? frequentBookmarks.filter(b => b.id !== id)
          : frequentBookmarks.map(b => b.id === id ? updatedBookmark : b)
      });
    }
    
    // Sync pinned cards that reference this bookmark
    const updatedPinnedCards: Record<string, PinnedCard[]> = {};
    Object.entries(pinnedCards).forEach(([key, cards]) => {
      updatedPinnedCards[key] = cards.map(card => {
        if (card.bookmark_id === id) {
          return {
            ...card,
            title: data.title ?? card.title,
            url: data.url ?? card.url,
            description: data.description !== undefined ? data.description : card.description,
            icon: data.icon !== undefined ? data.icon : card.icon,
            tags: data.tags ?? card.tags,
          };
        }
        return card;
      });
    });
    set({ pinnedCards: updatedPinnedCards });
    
    try {
      await bookmarkApi.update(id, data);
      await get().fetchTags();
    } catch (error) {
      // Revert on error
      await get().fetchBookmarks();
      await get().fetchFrequentBookmarks();
      await get().fetchTags();
      throw error;
    }
  },

  deleteBookmark: async (id) => {
    const { bookmarks, frequentBookmarks, pinnedCards } = get();
    
    // Optimistic update
    set({ 
      bookmarks: bookmarks.filter(b => b.id !== id),
      frequentBookmarks: frequentBookmarks.filter(b => b.id !== id)
    });
    
    // Also remove from pinned cards
    const newPinnedCards: Record<string, PinnedCard[]> = {};
    Object.entries(pinnedCards).forEach(([key, cards]) => {
      newPinnedCards[key] = cards.filter(c => c.bookmark_id !== id);
    });
    set({ pinnedCards: newPinnedCards });
    
    try {
      await bookmarkApi.delete(id);
      await get().fetchTags();
    } catch (error) {
      // Revert on error
      await get().fetchBookmarks();
      await get().fetchFrequentBookmarks();
      await get().fetchTags();
      throw error;
    }
  },

  toggleFrequent: async (id, isFrequent) => {
    const { bookmarks, frequentBookmarks } = get();
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;
    
    // Optimistic update
    const updatedBookmark = { 
      ...bookmark, 
      is_frequent: isFrequent,
      frequent_order: isFrequent ? frequentBookmarks.length + 1 : 0
    };
    
    set({ 
      bookmarks: bookmarks.map(b => b.id === id ? updatedBookmark : b),
      frequentBookmarks: isFrequent 
        ? [...frequentBookmarks, updatedBookmark]
        : frequentBookmarks.filter(b => b.id !== id)
    });
    
    try {
      await bookmarkApi.update(id, { is_frequent: isFrequent });
    } catch (error) {
      // Revert on error
      await get().fetchBookmarks();
      await get().fetchFrequentBookmarks();
      throw error;
    }
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
    const { pinnedCards, bookmarks } = get();
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;
    
    const key = `${workspaceId}-${groupId || 'null'}`;
    const cards = pinnedCards[key] || [];
    
    // Optimistic update
    const tempCard: PinnedCard = {
      id: `temp-${Date.now()}`,
      workspace_id: workspaceId,
      bookmark_id: bookmarkId,
      user_id: 'current-user',
      group_id: groupId || undefined,
      sort_order: cards.length + 1,
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      icon: bookmark.icon,
      tags: bookmark.tags,
      created_at: new Date().toISOString(),
    };
    
    set((state) => ({
      pinnedCards: { 
        ...state.pinnedCards, 
        [key]: [...(state.pinnedCards[key] || []), tempCard] 
      },
    }));
    
    try {
      await workspaceApi.addCard(workspaceId, bookmarkId, groupId);
      await get().fetchPinnedCards(workspaceId, groupId);
    } catch (error) {
      // Revert on error
      await get().fetchPinnedCards(workspaceId, groupId);
      throw error;
    }
  },

  moveCardToGroup: async (workspaceId, cardId, groupId) => {
    await workspaceApi.moveCard(workspaceId, cardId, groupId);
    await get().fetchPinnedCards(workspaceId, groupId);
    await get().fetchPinnedCards(workspaceId, get().activeGroupId);
  },

  unpinCard: async (workspaceId, cardId) => {
    const { activeGroupId } = get();
    const key = `${workspaceId}-${activeGroupId || 'null'}`;
    
    // Optimistic update
    set((state) => ({
      pinnedCards: { 
        ...state.pinnedCards, 
        [key]: (state.pinnedCards[key] || []).filter(c => c.id !== cardId)
      },
    }));
    
    try {
      await workspaceApi.removeCard(workspaceId, cardId);
    } catch (error) {
      // Revert on error
      await get().fetchPinnedCards(workspaceId, activeGroupId);
      throw error;
    }
  },

  reorderCards: (workspaceId, groupId, newCards) => {
    const key = `${workspaceId}-${groupId || 'null'}`;
    set((state) => ({
      pinnedCards: {
        ...state.pinnedCards,
        [key]: newCards,
      },
    }));
  },

  moveFrequentBookmark: async (id, direction) => {
    const frequentBookmarks = [...get().frequentBookmarks].sort((a, b) => a.frequent_order - b.frequent_order);
    const index = frequentBookmarks.findIndex((bookmark) => bookmark.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= frequentBookmarks.length) return;

    const reordered = [...frequentBookmarks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalized = reordered.map((bookmark, orderIndex) => ({
      ...bookmark,
      frequent_order: orderIndex + 1,
    }));

    set((state) => ({
      frequentBookmarks: normalized,
      bookmarks: state.bookmarks.map((bookmark) => {
        const updated = normalized.find((item) => item.id === bookmark.id);
        return updated ? { ...bookmark, frequent_order: updated.frequent_order } : bookmark;
      }),
    }));

    try {
      await Promise.all(
        normalized.map((bookmark) =>
          bookmarkApi.update(bookmark.id, {
            is_frequent: true,
            frequent_order: bookmark.frequent_order,
          })
        )
      );
    } catch (error) {
      await get().fetchBookmarks();
      await get().fetchFrequentBookmarks();
      throw error;
    }
  },

  moveWorkspace: async (id, direction) => {
    const workspaces = [...get().workspaces].sort((a, b) => a.sort_order - b.sort_order);
    const index = workspaces.findIndex((workspace) => workspace.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workspaces.length) return;

    const reordered = [...workspaces];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalized = reordered.map((workspace, orderIndex) => ({
      ...workspace,
      sort_order: orderIndex + 1,
    }));

    set({ workspaces: normalized });

    try {
      await Promise.all(
        normalized.map((workspace) =>
          workspaceApi.update(workspace.id, {
            sort_order: workspace.sort_order,
          })
        )
      );
    } catch (error) {
      await get().fetchWorkspaces();
      throw error;
    }
  },

  setActiveWorkspace: (id) => {
    saveActiveWorkspaceId(id);
    set({ activeWorkspaceId: id, activeGroupId: null });
  },

  setActiveGroup: (id) => {
    set({ activeGroupId: id });
  },
}));
