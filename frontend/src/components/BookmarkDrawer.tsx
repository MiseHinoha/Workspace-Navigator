import { useEffect, useState, useMemo, useRef } from 'react';
import { X, Search, ExternalLink, GripVertical, Bookmark } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Bookmark as BookmarkType } from '../types';

interface BookmarkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarkDrawer({ isOpen, onClose }: BookmarkDrawerProps) {
  const { bookmarks, tags, fetchBookmarks, fetchTags } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use ref to store onClose to avoid dependency issues
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Track previous isOpen to detect open action
  const prevIsOpenRef = useRef(isOpen);
  
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    
    if (isOpen && !wasOpen) {
      // Drawer is opening - reset isClosing
      setIsClosing(false);
      fetchBookmarks();
      fetchTags();
    } else if (!isOpen && wasOpen && isClosing) {
      // Drawer was closed by handleClose, wait for animation to finish then unmount
      const timer = setTimeout(() => setIsClosing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isClosing]);

  const handleClose = () => {
    if (closeTimerRef.current || isClosing) return; // Prevent double close
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onCloseRef.current();
    }, 200);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing && !closeTimerRef.current) {
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = null;
          onCloseRef.current();
        }, 200);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isClosing]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      const matchesTag = !selectedTag || (bookmark.tags && bookmark.tags.includes(selectedTag));
      const query = searchQuery.toLowerCase();
      const title = bookmark.title || '';
      const url = bookmark.url || '';
      const matchesSearch = !searchQuery || 
        title.toLowerCase().includes(query) ||
        url.toLowerCase().includes(query) ||
        (bookmark.tags && bookmark.tags.some(tag => tag && tag.toLowerCase().includes(query)));
      return matchesTag && matchesSearch;
    });
  }, [bookmarks, selectedTag, searchQuery]);

  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, BookmarkType[]> = {};
    filteredBookmarks.forEach(bookmark => {
      const title = bookmark.title || bookmark.url || '未命名';
      const firstChar = title.charAt(0).toUpperCase();
      const key = /^[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(bookmark);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredBookmarks]);

  // When closing animation finishes, isOpen becomes false from parent
  // Keep rendering while isClosing is true to show animation
  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop - click to close, hide immediately when closing */}
      {!isClosing && (
        <div 
          className={`fixed inset-0 bg-black/20 z-40 animate-fadeIn transition-all ${isDragging ? 'pointer-events-none' : ''}`}
          onClick={handleClose}
        />
      )}
      
      {/* Drawer - stop propagation to prevent closing when clicking inside */}
      <div 
        className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
        style={{ animation: isClosing ? 'slideOutRight 0.2s ease-in forwards' : 'slideInRight 0.2s ease-out forwards' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/60">
          <div className="flex items-center gap-2">
            <Bookmark size={20} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">书签库</h2>
            <span className="text-xs text-gray-400">({bookmarks.length})</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索书签标题或标签..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 max-h-24 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
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
                  className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bookmark List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {filteredBookmarks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bookmark size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">没有找到书签</p>
            </div>
          ) : (
            searchQuery ? (
              <div className="space-y-2">
                {filteredBookmarks.map((bookmark) => (
                  <DraggableBookmarkItem 
                    key={bookmark.id} 
                    bookmark={bookmark} 
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                  />
                ))}
              </div>
            ) : (
              groupedBookmarks.map(([letter, items]) => (
                <div key={letter}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase px-2 mb-2">{letter}</h3>
                  <div className="space-y-2">
                    {items.map((bookmark) => (
                      <DraggableBookmarkItem 
                        key={bookmark.id} 
                        bookmark={bookmark}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/60 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-300 text-center">
          💡 拖拽书签到左侧工作区域进行固定
        </div>
      </div>
    </>
  );
}

function DraggableBookmarkItem({ bookmark, onDragStart: onDragStartProp, onDragEnd: onDragEndProp }: { bookmark: BookmarkType; onDragStart?: () => void; onDragEnd?: () => void }) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('Native drag start:', bookmark);
    
    // Set data for the drag operation
    const data = JSON.stringify(bookmark);
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.setData('text/plain', data); // Fallback
    e.dataTransfer.effectAllowed = 'copy';
    
    // Notify parent that dragging has started
    onDragStartProp?.();
    
    // Set a drag image if desired (optional)
    // e.dataTransfer.setDragImage(element, 0, 0);
  };

  const handleDragEnd = (_e: React.DragEvent<HTMLDivElement>) => {
    console.log('Native drag end');
    onDragEndProp?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="group flex items-center gap-2 p-2.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
    >
      <GripVertical size={16} className="text-gray-300 dark:text-gray-500 flex-shrink-0" />
      
      <div className="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-gray-600 rounded flex-shrink-0 overflow-hidden">
        {bookmark.icon ? (
          <img 
            src={bookmark.icon} 
            alt="" 
            className="w-5 h-5 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const urlObj = new URL(bookmark.url);
              target.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
              target.onerror = () => {
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<span class="text-sm">🔗</span>';
              };
            }}
          />
        ) : (
          <img 
            src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
            alt=""
            className="w-5 h-5 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<span class="text-sm">🔗</span>';
            }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{bookmark.title || bookmark.url || '未命名'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{bookmark.url}</p>
        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {bookmark.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 rounded">{tag}</span>
            ))}
            {bookmark.tags.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 rounded">+{bookmark.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-gray-300 hover:text-blue-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
