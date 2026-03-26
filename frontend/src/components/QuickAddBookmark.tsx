import { useState, useRef, useEffect } from 'react';
import { X, Link2, Loader2, Tag, Globe } from 'lucide-react';
import { bookmarkApi } from '../utils/api';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface QuickAddBookmarkProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddBookmark({ isOpen, onClose }: QuickAddBookmarkProps) {
  const { createBookmark } = useWorkspaceStore();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Focus URL input when modal opens
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-fetch metadata when URL changes (with debounce)
  useEffect(() => {
    if (!url.trim()) {
      setTitle('');
      setIcon('');
      return;
    }

    const timer = setTimeout(async () => {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      // Basic URL validation
      try {
        new URL(targetUrl);
      } catch {
        return;
      }

      setIsFetching(true);
      setError('');

      try {
        const { data } = await bookmarkApi.fetchMetadata(targetUrl);
        setTitle(data.title || '');
        setIcon(data.icon || '');
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
        // Don't show error, just leave fields empty
      } finally {
        setIsFetching(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('请输入网址');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await createBookmark({
        url: url.trim(),
        title: title.trim() || undefined,
        icon: icon.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      
      // Reset form
      setUrl('');
      setTitle('');
      setIcon('');
      setTags('');
      onClose();
    } catch (err) {
      setError('添加书签失败，请重试');
      console.error('Failed to create bookmark:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setTitle('');
    setIcon('');
    setTags('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 transform transition-all"
        style={{ animation: 'slideInUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Link2 size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">快速添加书签</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              网址 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={urlInputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="example.com 或 https://example.com"
                disabled={isLoading}
              />
              <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {isFetching && (
                <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              输入网址后自动获取网站标题和图标
            </p>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="自动获取或自定义标题"
              disabled={isLoading || isFetching}
            />
          </div>

          {/* Icon Preview & Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              图标
            </label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {icon ? (
                  <img 
                    src={icon} 
                    alt="" 
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                    }}
                  />
                ) : (
                  <Globe size={20} className="text-gray-300" />
                )}
              </div>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="自动获取或自定义图标URL"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Tag size={14} className="inline mr-1" />
              标签
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="用逗号分隔，如：工具, 文档, 常用"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  添加中...
                </>
              ) : (
                '添加书签'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
