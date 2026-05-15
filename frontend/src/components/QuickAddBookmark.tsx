import { useState, useRef, useEffect } from 'react';
import { X, Link2, Loader2, Globe, FileText } from 'lucide-react';
import { AxiosError } from 'axios';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { TagInput } from './TagInput';

interface QuickAddBookmarkProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const normalizeBookmarkUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${hostname}${pathname}`;
  } catch {
    return rawUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  }
};

export function QuickAddBookmark({ isOpen, onClose, onSuccess }: QuickAddBookmarkProps) {
  const { createBookmark, bookmarks, tags: availableTags } = useWorkspaceStore();
  const [url, setUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Focus URL input when modal opens
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('请输入网址');
      return;
    }

    // Normalize URL for comparison
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Check for duplicate URL
    const existingBookmark = bookmarks.find((b) => normalizeBookmarkUrl(b.url) === normalizeBookmarkUrl(normalizedUrl));

    if (existingBookmark) {
      setError(`该网站已存在于书签中：${existingBookmark.title || existingBookmark.url}`);
      setTimeout(() => {
        handleClose();
      }, 2000);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 后端会自动获取标题和图标
      await createBookmark({
        url: url.trim(),
        description: description.trim() || undefined,
        tags: selectedTags,
      });
      
      // Reset form and close
      setUrl('');
      setSelectedTags([]);
      setDescription('');
      onSuccess?.();
      onClose();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string; bookmark?: { title?: string; url?: string } }>;
      if (axiosError.response?.status === 409) {
        const existing = axiosError.response.data?.bookmark;
        setError(`该书签已存在：${existing?.title || existing?.url || '请勿重复添加'}`);
      } else {
        setError('添加书签失败，请重试');
      }
      console.error('Failed to create bookmark:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setSelectedTags([]);
    setDescription('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 transform transition-all"
        style={{ animation: 'slideInUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Link2 size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">快速添加书签</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              网址 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={urlInputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="example.com 或 https://example.com"
                disabled={isLoading}
              />
              <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              系统会自动获取网站标题和图标
            </p>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              标签
            </label>
            <TagInput
              value={selectedTags}
              onChange={setSelectedTags}
              availableTags={availableTags}
              placeholder="输入或选择标签"
              disabled={isLoading}
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              <FileText size={14} className="inline mr-1" />
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              rows={3}
              placeholder="添加描述（可选）"
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
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
