import { useEffect, useState, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, MoreHorizontal, GripVertical } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';

export function FrequentBookmarksBar() {
  const { frequentBookmarks, fetchFrequentBookmarks, bookmarks, toggleFrequent } = useWorkspaceStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetchFrequentBookmarks();
  }, []);

  useEffect(() => {
    checkScroll();
  }, [frequentBookmarks]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleToggleFrequent = async (id: string, isFrequent: boolean) => {
    await toggleFrequent(id, isFrequent);
  };

  const handleCloseDropdown = () => {
    setShowDropdown(false);
    setIsEditing(false);
  };

  if (frequentBookmarks.length === 0) {
    return (
      <div className="flex items-center justify-center py-2 px-4 bg-blue-50/50 border-b border-blue-100">
        <span className="text-sm text-gray-400">暂无常用书签，在书签管理页面设置常用书签</span>
      </div>
    );
  }

  return (
    <div className="relative bg-blue-50/50 border-b border-blue-100">
      <div className="flex items-center px-2">
        {/* Label */}
        <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-700">
          <Star size={16} fill="currentColor" />
          <span className="hidden sm:inline">常用</span>
        </div>

        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 p-1 text-blue-600 hover:bg-blue-100 rounded"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Bookmarks Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex-1 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex items-center gap-1 py-2">
            {frequentBookmarks.map((bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-white hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-gray-200 hover:border-blue-300 transition-all group"
              >
                {bookmark.icon ? (
                  <img 
                    src={bookmark.icon} 
                    alt="" 
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      try {
                        const urlObj = new URL(bookmark.url);
                        target.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
                      } catch {
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<span class="text-xs">🔗</span>';
                      }
                    }}
                  />
                ) : (
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
                    alt=""
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<span class="text-xs">🔗</span>';
                    }}
                  />
                )}
                <span className="max-w-[120px] truncate">{bookmark.title || bookmark.url || '未命名'}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 p-1 text-blue-600 hover:bg-blue-100 rounded"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Manage Button */}
        <div className="relative flex-shrink-0 ml-2">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <MoreHorizontal size={16} />
            <span className="hidden sm:inline">管理</span>
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[60]"
                onClick={handleCloseDropdown}
              />
              {/* Dropdown - positioned below with higher z-index */}
              <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[70] py-2 max-h-80 overflow-y-auto">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">常用书签管理</span>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {isEditing ? '完成' : '编辑'}
                    </button>
                  </div>
                </div>
                
                <div className="py-1">
                  {isEditing ? (
                    // Edit mode: show all bookmarks
                    bookmarks.map((bookmark) => (
                      <label
                        key={bookmark.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={bookmark.is_frequent}
                          onChange={(e) => handleToggleFrequent(bookmark.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 truncate flex-1">{bookmark.title || bookmark.url || '未命名'}</span>
                      </label>
                    ))
                  ) : (
                    // View mode: only show frequent bookmarks
                    frequentBookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                      >
                        <GripVertical size={14} className="text-gray-300" />
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {bookmark.icon ? (
                            <img 
                              src={bookmark.icon} 
                              alt="" 
                              className="w-4 h-4 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                try {
                                  const urlObj = new URL(bookmark.url);
                                  target.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
                                } catch {
                                  target.style.display = 'none';
                                  target.parentElement!.innerHTML = '<span class="text-xs">🔗</span>';
                                }
                              }}
                            />
                          ) : (
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
                              alt=""
                              className="w-4 h-4 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<span class="text-xs">🔗</span>';
                              }}
                            />
                          )}
                          <span className="text-sm text-gray-700 truncate">{bookmark.title || bookmark.url || '未命名'}</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
