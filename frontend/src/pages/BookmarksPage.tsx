import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Search, Star, StarOff, ExternalLink, Tag, Filter } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Bookmark } from '../types';

interface BookmarkFormData {
  title: string;
  url: string;
  description: string;
  icon: string;
  tags: string;
  is_frequent: boolean;
}

export function BookmarksPage() {
  const navigate = useNavigate();
  const { bookmarks, tags, fetchBookmarks, fetchTags, fetchFrequentBookmarks, createBookmark, updateBookmark, deleteBookmark, toggleFrequent } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [formData, setFormData] = useState<BookmarkFormData>({ 
    title: '', url: '', description: '', icon: '', tags: '', is_frequent: false 
  });

  useEffect(() => {
    fetchBookmarks();
    fetchTags();
  }, []);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      const matchesTag = !selectedTag || bookmark.tags.includes(selectedTag);
      const matchesSearch = !searchQuery || 
        bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTag && matchesSearch;
    });
  }, [bookmarks, selectedTag, searchQuery]);

  const frequentBookmarks = useMemo(() => {
    return bookmarks.filter(b => b.is_frequent);
  }, [bookmarks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.url.trim()) {
      await createBookmark({
        title: formData.title,
        url: formData.url,
        description: formData.description,
        icon: formData.icon,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_frequent: formData.is_frequent,
      });
      setFormData({ title: '', url: '', description: '', icon: '', tags: '', is_frequent: false });
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBookmark && formData.title.trim() && formData.url.trim()) {
      await updateBookmark(editingBookmark.id, {
        title: formData.title,
        url: formData.url,
        description: formData.description,
        icon: formData.icon,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_frequent: formData.is_frequent,
      });
      setEditingBookmark(null);
      setFormData({ title: '', url: '', description: '', icon: '', tags: '', is_frequent: false });
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
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      icon: bookmark.icon || '',
      tags: bookmark.tags.join(', '),
      is_frequent: bookmark.is_frequent,
    });
  };

  const handleToggleFrequent = async (bookmark: Bookmark) => {
    await toggleFrequent(bookmark.id, !bookmark.is_frequent);
    // No need to fetch again - optimistic update in store
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔖</span>
              <h1 className="font-semibold text-gray-900">书签管理</h1>
            </div>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            添加书签
          </button>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto p-6">
        {/* Frequent Bookmarks Section */}
        {frequentBookmarks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
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
                  className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  {bookmark.icon ? (
                    <img src={bookmark.icon} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                  ) : (
                    <span className="text-lg flex-shrink-0">🔗</span>
                  )}
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">{bookmark.title}</span>
                  <ExternalLink size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索书签..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-gray-400" />
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  selectedTag === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                      {bookmark.icon ? (
                        <img src={bookmark.icon} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <span className="text-lg">🔗</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{bookmark.title}</h3>
                      <p className="text-xs text-gray-500 truncate">{new URL(bookmark.url).hostname}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
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

                {bookmark.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bookmark.description}</p>
                )}

                {bookmark.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {bookmark.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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

        {filteredBookmarks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔖</div>
            <p className="text-lg text-gray-600">没有找到书签</p>
            <p className="text-sm text-gray-400 mt-1">添加一个书签开始收藏吧</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingBookmark) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingBookmark ? '编辑书签' : '添加书签'}
            </h2>
            
            <form onSubmit={editingBookmark ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入书签标题"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="https://example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={2}
                  placeholder="书签描述（可选）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag size={14} className="inline mr-1" />
                  标签（用逗号分隔）
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="工具, 文档, 常用"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_frequent}
                  onChange={(e) => setFormData({ ...formData, is_frequent: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">设为常用书签（显示在顶部栏）</span>
              </label>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBookmark(null);
                    setFormData({ title: '', url: '', description: '', icon: '', tags: '', is_frequent: false });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {editingBookmark ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
