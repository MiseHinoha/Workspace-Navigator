import { useState, useMemo, useEffect } from 'react';
import { Plus, Tag, X, Link2, Loader2, CheckCircle } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Bookmark } from '../types';
import { DraggableBookmark } from './DraggableBookmark';

interface BookmarkFormData {
  title: string;
  url: string;
  description: string;
  icon: string;
  tags: string;
}

interface FetchedMetadata {
  title: string;
  icon: string;
  description: string;
}

export function BookmarkManager() {
  const { bookmarks, tags, createBookmark, updateBookmark, deleteBookmark } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<BookmarkFormData>({ title: '', url: '', description: '', icon: '', tags: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      const matchesTag = !selectedTag || (bookmark.tags && bookmark.tags.includes(selectedTag));
      const title = bookmark.title || '';
      const url = bookmark.url || '';
      const description = bookmark.description || '';
      const matchesSearch = !searchQuery || 
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTag && matchesSearch;
    });
  }, [bookmarks, selectedTag, searchQuery]);

  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // Auto-fetch metadata when URL changes (with debounce)
  useEffect(() => {
    if (!formData.url.trim() || editingBookmark) return;

    const timer = setTimeout(async () => {
      let targetUrl = formData.url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      // Basic URL validation
      try {
        new URL(targetUrl);
      } catch {
        return;
      }

      setIsFetchingMetadata(true);
      try {
        const { data } = await bookmarkApi.fetchMetadata(targetUrl);
        // Only update if user hasn't manually entered these fields
        if (!formData.title.trim() && data.title) {
          setFormData(prev => ({ ...prev, title: data.title }));
        }
        if (!formData.icon.trim() && data.icon) {
          setFormData(prev => ({ ...prev, icon: data.icon }));
        }
        if (!formData.description.trim() && data.description) {
          setFormData(prev => ({ ...prev, description: data.description }));
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
      } finally {
        setIsFetchingMetadata(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.url, editingBookmark]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.url.trim()) {
      await createBookmark({
        title: formData.title.trim() || undefined,
        url: formData.url,
        description: formData.description.trim() || undefined,
        icon: formData.icon.trim() || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setFormData({ title: '', url: '', description: '', icon: '', tags: '' });
      setIsCreating(false);
      setSuccessMessage('书签添加成功！');
      setShowSuccess(true);
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
      });
      setEditingBookmark(null);
      setFormData({ title: '', url: '', description: '', icon: '', tags: '' });
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
      url: bookmark.url || '',
      description: bookmark.description || '',
      icon: bookmark.icon || '',
      tags: Array.isArray(bookmark.tags) ? bookmark.tags.join(', ') : '',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slideInUp">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">{successMessage}</span>
            <button
              onClick={() => setShowSuccess(false)}
              className="ml-2 p-0.5 hover:bg-green-700 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">书签管理</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <Plus size={16} />
          添加书签
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索书签..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
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
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
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

      {/* Bookmark List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredBookmarks.map((bookmark) => (
          <DraggableBookmark
            key={bookmark.id}
            bookmark={bookmark}
            onEdit={() => startEdit(bookmark)}
            onDelete={() => handleDelete(bookmark.id)}
          />
        ))}
        {filteredBookmarks.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Link2 size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无书签</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingBookmark) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBookmark ? '编辑书签' : '添加书签'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingBookmark(null);
                  setFormData({ title: '', url: '', description: '', icon: '', tags: '' });
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={editingBookmark ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题
                  {isFetchingMetadata && <Loader2 size={14} className="inline ml-1 animate-spin text-blue-500" />}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="自动获取或自定义标题"
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
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBookmark(null);
                    setFormData({ title: '', url: '', description: '', icon: '', tags: '' });
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
