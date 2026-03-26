import { useState, useMemo } from 'react';
import { Plus, Tag, X, Link2 } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Bookmark } from '../types';
import { DraggableBookmark } from './DraggableBookmark';
import { QuickAddBookmark } from './QuickAddBookmark';

interface BookmarkFormData {
  title: string;
  url: string;
  description: string;
  icon: string;
  tags: string;
}

export function BookmarkManager() {
  const { bookmarks, tags, updateBookmark, deleteBookmark } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<BookmarkFormData>({ title: '', url: '', description: '', icon: '', tags: '' });

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

  // 使用 QuickAddBookmark 处理创建，这里只需要处理编辑

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

      {/* Create Modal - Use QuickAddBookmark */}
      {isCreating && (
        <QuickAddBookmark 
          isOpen={isCreating} 
          onClose={() => setIsCreating(false)} 
        />
      )}

      {/* Edit Modal */}
      {editingBookmark && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Link2 size={20} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">编辑书签</h3>
              </div>
              <button
                onClick={() => {
                  setEditingBookmark(null);
                  setFormData({ title: '', url: '', description: '', icon: '', tags: '' });
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* URL Input - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">网址</label>
                <input
                  type="text"
                  value={formData.url}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500"
                />
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="书签标题"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  rows={2}
                  placeholder="书签描述（可选）"
                />
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Tag size={14} className="inline mr-1" />
                  标签
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="用逗号分隔，如：工具, 文档, 常用"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBookmark(null);
                    setFormData({ title: '', url: '', description: '', icon: '', tags: '' });
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
