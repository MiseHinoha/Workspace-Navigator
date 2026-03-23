export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  tags: string[];
  is_frequent: boolean;
  frequent_order: number;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PinnedCard {
  id: string;
  workspace_id: string;
  bookmark_id: string;
  user_id: string;
  group_id?: string;
  sort_order: number;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  tags: string[];
  created_at: string;
}

export interface Session {
  id: string;
  device_name?: string;
  last_active: string;
  active_workspace_id?: string;
}

export interface TabInfo {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export type SearchEngine = {
  name: string;
  url: string;
  icon: string;
};

export const SEARCH_ENGINES: SearchEngine[] = [
  { name: '百度', url: 'https://www.baidu.com/s?wd=', icon: '🔍' },
  { name: 'Google', url: 'https://www.google.com/search?q=', icon: '🔎' },
  { name: '必应', url: 'https://www.bing.com/search?q=', icon: '🔎' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: '🦆' },
];
