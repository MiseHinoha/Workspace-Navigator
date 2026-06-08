import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Search, Star, StarOff, ExternalLink, Tag, Filter, X, Link2 } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Bookmark } from '../types';
import { QuickAddBookmark } from '../components/QuickAddBookmark';
import { TagInput } from '../components/TagInput';
import { AutoScrollTitle } from '../components/AutoScrollTitle';
import { ThemeToggle } from '../components/ThemeToggle';
import { SiteIcon } from '../components/SiteIcon';

interface BookmarkFormData {
  title: string;
  url: string;
  description: string;
  icon: string;
  tags: string[];
  is_frequent: boolean;
}

const BOOKMARKS_PAGE_SIZE = 15;

export function BookmarksPage() {
  const navigate = useNavigate();
  const {
    bookmarks,
    frequentBookmarks,
    tags,
    bookmarksHasMore,
    fetchBookmarksPage,
    fetchFrequentBookmarks,
    fetchTags,
    updateBookmark,
    deleteBookmark,
    toggleFrequent,
  } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);
  const [formData, setFormData] = useState<BookmarkFormData>({ 
    title: '', url: '', description: '', icon: '', tags: [], is_frequent: false 
  });
  const loadBookmarksPage = async (reset: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (reset) {
      setIsInitialLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      await fetchBookmarksPage({
        reset,
        limit: BOOKMARKS_PAGE_SIZE,
        tag: selectedTag || undefined,
        q: debouncedSearchQuery || undefined,
      });
    } finally {
      if (reset) {
        setIsInitialLoading(false);
      } else {
        setIsLoadingMore(false);
      }
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchTags();
    fetchFrequentBookmarks();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadBookmarksPage(true);
  }, [selectedTag, debouncedSearchQuery]);

  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;
    if (!bookmarksHasMore || isInitialLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || isLoadingMore || isFetchingRef.current) return;

        loadBookmarksPage(false);
      },
      {
        root: null,
        rootMargin: '0px 0px 200px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [bookmarksHasMore, isLoadingMore, isInitialLoading, selectedTag, debouncedSearchQuery]);

  const filteredBookmarks = useMemo(() => bookmarks, [bookmarks]);

  // Auto-fetch metadata when URL changes (for edit mode)
  useEffect(() => {
    if (!formData.url.trim() || !editingBookmark) return;

    const timer = setTimeout(async () => {
      let targetUrl = formData.url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      try {
        new URL(targetUrl);
      } catch {
        return;
      }

      // In edit mode, we don't auto-fetch, just validate URL format
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.url, editingBookmark]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBookmark && formData.title.trim() && formData.url.trim()) {
      await updateBookmark(editingBookmark.id, {
        title: formData.title,
        url: formData.url,
        description: formData.description,
        icon: formData.icon,
        tags: formData.tags,
        is_frequent: formData.is_frequent,
      });
      setEditingBookmark(null);
      setFormData({ title: '', url: '', description: '', icon: '', tags: [], is_frequent: false });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个书签吗？')) {
      await deleteBookmark(id);
    }
  };

  const startEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setFormData({
      title: bookmark.title || '',
      url: bookmark.url,
      description: bookmark.description || '',
      icon: bookmark.icon || '',
      tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
      is_frequent: bookmark.is_frequent,
    });
  };

  const handleToggleFrequent = async (bookmark: Bookmark) => {
    await toggleFrequent(bookmark.id, !bookmark.is_frequent);
    // No need to fetch again - optimistic update in store
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔖</span>
              <h1 className="font-semibold text-gray-900 dark:text-gray-100">书签管理</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              添加书签
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto p-6">
        {/* Frequent Bookmarks Section */}
        {frequentBookmarks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              常用书签
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {frequentBookmarks.map((bookmark) => (
                <a
                  key={bookmark.id}
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <SiteIcon
                    url={bookmark.url}
                    icon={bookmark.icon}
                    className="w-5 h-5 object-contain flex-shrink-0"
                    fallbackClassName="text-lg flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">{bookmark.title || bookmark.url || '未命名'}</span>
                  <ExternalLink size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          {/* Search Input - Fixed Width */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索书签..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          
          {/* Tags - Below Search */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  selectedTag === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                全部
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bookmarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden flex flex-col h-[200px]"
            >
              {/* Header */}
              <div className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <SiteIcon
                        url={bookmark.url}
                        icon={bookmark.icon}
                        className="w-6 h-6 object-contain"
                        fallbackClassName="text-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {/* Auto-scroll title on hover */}
                      <AutoScrollTitle 
                        title={bookmark.title || bookmark.url || '未命名'} 
                      className="font-semibold text-gray-900 dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{
                        (() => {
                          try {
                            return new URL(bookmark.url).hostname;
                          } catch {
                            return bookmark.url || '无效链接';
                          }
                        })()
                      }</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleToggleFrequent(bookmark)}
                      className={`p-1.5 rounded transition-colors ${
                        bookmark.is_frequent 
                          ? 'text-yellow-500 hover:text-yellow-600' 
                          : 'text-gray-300 hover:text-yellow-500'
                      }`}
                      title={bookmark.is_frequent ? '取消常用' : '设为常用'}
                    >
                      {bookmark.is_frequent ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Middle Content - Flexible */}
              <div className="flex-1 px-4 py-2 overflow-hidden">
                {bookmark.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">{bookmark.description}</p>
                )}

                {bookmark.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {bookmark.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/60 mt-auto">
                <div className="flex items-center justify-between">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink size={14} />
                    打开链接
                  </a>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(bookmark)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(bookmark.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isInitialLoading && (
          <div ref={loadMoreTriggerRef} className="mt-6 flex justify-center">
            {isLoadingMore && (
              <span className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">加载中...</span>
            )}
          </div>
        )}

        {isInitialLoading ? (
          <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-300">加载中...</div>
        ) : filteredBookmarks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔖</div>
            <p className="text-lg text-gray-600">没有找到书签</p>
            <p className="text-sm text-gray-400 mt-1">添加一个书签开始收藏吧</p>
          </div>
        )}
      </div>

      {/* Create Modal - Use QuickAddBookmark */}
      {isCreating && (
        <QuickAddBookmark 
          isOpen={isCreating} 
          onClose={() => setIsCreating(false)} 
        />
      )}

      {/* Edit Modal */}
      {editingBookmark && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Link2 size={20} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">编辑书签</h2>
              </div>
              <button
                onClick={() => {
                  setEditingBookmark(null);
                  setFormData({ title: '', url: '', description: '', icon: '', tags: [], is_frequent: false });
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* URL - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">网址</label>
                <input
                  type="text"
                  value={formData.url}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300"
                />
              </div>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="书签标题"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={2}
                  placeholder="书签描述（可选）"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  <Tag size={14} className="inline mr-1" />
                  标签
                </label>
                <TagInput
                  value={formData.tags}
                  onChange={(newTags) => setFormData({ ...formData, tags: newTags })}
                  availableTags={tags}
                  placeholder="输入或选择标签"
                />
              </div>

              {/* Is Frequent */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_frequent}
                  onChange={(e) => setFormData({ ...formData, is_frequent: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">设为常用书签（显示在顶部栏）</span>
              </label>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBookmark(null);
                    setFormData({ title: '', url: '', description: '', icon: '', tags: [], is_frequent: false });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
