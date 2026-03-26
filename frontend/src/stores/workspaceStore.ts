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
  setActiveWorkspace: (id: string | null) => void;
  setActiveGroup: (id: string | null) => void;
}

// Helper to extract unique tags from bookmarks
const extractTags = (bookmarks: Bookmark[]): string[] => {
  const tagSet = new Set<string>();
  bookmarks.forEach(b => {
    // 确保 tags 是数组
    const tags = Array.isArray(b.tags) ? b.tags : [];
    tags.forEach(t => tagSet.add(t));
  });
  return Array.from(tagSet).sort();
};

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
    const { bookmarks, frequentBookmarks } = get();
    
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
      tags: extractTags([...bookmarks, newBookmark])
    });
    
    if (data.is_frequent) {
      set({ frequentBookmarks: [...frequentBookmarks, newBookmark] });
    }
    
    try {
      // Send API request
      const { data: createdBookmark } = await bookmarkApi.create(data);
      
      // Replace temp bookmark with real one
      set({ 
        bookmarks: get().bookmarks.map(b => b.id === tempId ? createdBookmark : b),
        tags: extractTags(get().bookmarks.map(b => b.id === tempId ? createdBookmark : b))
      });
      
      if (data.is_frequent) {
        set({ 
          frequentBookmarks: get().frequentBookmarks.map(b => b.id === tempId ? createdBookmark : b)
        });
      }
    } catch (error) {
      // Revert on error
      set({ 
        bookmarks: get().bookmarks.filter(b => b.id !== tempId),
        tags: extractTags(get().bookmarks.filter(b => b.id !== tempId))
      });
      if (data.is_frequent) {
        set({ frequentBookmarks: get().frequentBookmarks.filter(b => b.id !== tempId) });
      }
      throw error;
    }
  },

  updateBookmark: async (id, data) => {
    const { bookmarks, frequentBookmarks } = get();
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;
    
    // Optimistic update
    const updatedBookmark = { ...bookmark, ...data, updated_at: new Date().toISOString() };
    set({ 
      bookmarks: bookmarks.map(b => b.id === id ? updatedBookmark : b),
      tags: extractTags(bookmarks.map(b => b.id === id ? updatedBookmark : b))
    });
    
    if (bookmark.is_frequent || data.is_frequent !== undefined) {
      set({ 
        frequentBookmarks: data.is_frequent === false 
          ? frequentBookmarks.filter(b => b.id !== id)
          : frequentBookmarks.map(b => b.id === id ? updatedBookmark : b)
      });
    }
    
    try {
      await bookmarkApi.update(id, data);
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
      frequentBookmarks: frequentBookmarks.filter(b => b.id !== id),
      tags: extractTags(bookmarks.filter(b => b.id !== id))
    });
    
    // Also remove from pinned cards
    const newPinnedCards: Record<string, PinnedCard[]> = {};
    Object.entries(pinnedCards).forEach(([key, cards]) => {
      newPinnedCards[key] = cards.filter(c => c.bookmark_id !== id);
    });
    set({ pinnedCards: newPinnedCards });
    
    try {
      await bookmarkApi.delete(id);
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

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id, activeGroupId: null });
  },

  setActiveGroup: (id) => {
    set({ activeGroupId: id });
  },
}));
