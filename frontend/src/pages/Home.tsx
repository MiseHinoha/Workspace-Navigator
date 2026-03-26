import { useEffect, useState } from 'react';
import { Menu, X, Settings, LogOut, Bookmark, ChevronLeft, Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { SearchBar } from '../components/SearchBar';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { WorkspaceCanvas } from '../components/WorkspaceCanvas';
import { FrequentBookmarksBar } from '../components/FrequentBookmarksBar';
import { BookmarkDrawer } from '../components/BookmarkDrawer';
import { QuickAddBookmark } from '../components/QuickAddBookmark';
import { sessionApi } from '../utils/api';

export function Home() {
  const { user, logout } = useAuthStore();
  const { workspaces, fetchWorkspaces, fetchBookmarks, fetchTags, fetchFrequentBookmarks, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [_sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      await fetchWorkspaces();
      await fetchBookmarks();
      await fetchFrequentBookmarks();
      await fetchTags();
      fetchSessions();
    };
    init();
    
    const interval = setInterval(syncSession, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace]);

  useEffect(() => {
    syncSession();
  }, [activeWorkspaceId]);

  const fetchSessions = async () => {
    try {
      const { data } = await sessionApi.getAll();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const syncSession = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      await sessionApi.create({
        session_id: sessionId || undefined,
        device_name: getDeviceName(),
        device_info: navigator.userAgent,
        tabs: [],
        active_workspace_id: activeWorkspaceId || undefined,
      });
    } catch (error) {
      console.error('Failed to sync session:', error);
    }
  };

  const getDeviceName = () => {
    const platform = navigator.platform;
    if (platform.includes('Mac')) return 'Mac';
    if (platform.includes('Win')) return 'Windows';
    if (platform.includes('Linux')) return 'Linux';
    return 'Unknown Device';
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200">
        {/* Main Header */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            {/* Left: Menu & Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <span className="font-semibold text-gray-900 hidden sm:inline">Workspace Navigator</span>
              </div>
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-2xl mx-4 hidden md:block">
              <SearchBar />
            </div>

            {/* Right: User & Settings */}
            <div className="flex items-center gap-2">
              {/* Quick Add Bookmark Button */}
              <button
                onClick={() => setShowQuickAdd(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                title="快速添加书签"
              >
                <Plus size={18} />
                <span>添加书签</span>
              </button>

              {/* Mobile Quick Add Button */}
              <button
                onClick={() => setShowQuickAdd(true)}
                className="sm:hidden p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="快速添加书签"
              >
                <Plus size={20} />
              </button>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <span className="text-sm text-gray-600 hidden sm:inline">{user?.username}</span>
              
              {user?.isAdmin && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="设置"
                >
                  <Settings size={20} />
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Frequent Bookmarks Bar */}
        <FrequentBookmarksBar />

        {/* Mobile Search */}
        <div className="px-4 py-2 md:hidden border-t border-gray-100">
          <SearchBar />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Only Workspace Selector */}
        <aside
          className={`bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex flex-col ${
            isSidebarOpen ? 'w-64' : 'w-0'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <WorkspaceSelector />
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 overflow-hidden">
          <WorkspaceCanvas />
        </main>

        {/* Bookmark Drawer Toggle Button - positioned lower to avoid overlap */}
        {!isDrawerOpen && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1 px-3 py-3 bg-blue-600 text-white rounded-l-xl shadow-lg hover:bg-blue-700 transition-all hover:pr-4 group"
            title="打开书签库"
          >
            <Bookmark size={20} />
            <ChevronLeft size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Bookmark Drawer */}
      <BookmarkDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Quick Add Bookmark Modal */}
      <QuickAddBookmark isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />

      {/* Settings Modal */}
      {showSettings && user?.isAdmin && (
        <AdminSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function AdminSettingsModal({ onClose }: { onClose: () => void }) {
  const { registrationEnabled, toggleRegistration } = useAuthStore();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">管理员设置</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">开放注册</p>
              <p className="text-sm text-gray-500">允许新用户注册账号</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={registrationEnabled}
                onChange={(e) => toggleRegistration(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
