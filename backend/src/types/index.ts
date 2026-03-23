export interface User {
  id: string;
  username: string;
  password: string;
  is_admin: number;
  created_at: string;
  updated_at: string;
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
  is_frequent: number;
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
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  device_name?: string;
  device_info?: string;
  tabs: TabInfo[];
  active_workspace_id?: string;
  last_active: string;
  created_at: string;
}

export interface TabInfo {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}
