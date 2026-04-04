import { ExternalLink, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Bookmark } from '../types';

interface DraggableBookmarkProps {
  bookmark: Bookmark;
  onEdit: () => void;
  onDelete: () => void;
}

export function DraggableBookmark({ bookmark, onEdit, onDelete }: DraggableBookmarkProps) {
  const handleDragStart = (e: React.DragEvent) => {
    console.log('Native drag start from sidebar:', bookmark);
    e.dataTransfer.setData('application/json', JSON.stringify(bookmark));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group relative flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
    >
      {/* Drag Handle */}
      <div className="text-gray-300 group-hover:text-gray-500">
        <GripVertical size={16} />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
        {bookmark.icon ? (
          <img 
            src={bookmark.icon} 
            alt="" 
            className="w-5 h-5 object-contain"
            onError={(e) => {
              // Fallback to Google favicon or emoji
              const target = e.target as HTMLImageElement;
              const urlObj = new URL(bookmark.url);
              target.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
              target.onerror = () => {
                // If Google favicon also fails, show emoji
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<span class="text-lg">🔗</span>';
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
              target.parentElement!.innerHTML = '<span class="text-lg">🔗</span>';
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{bookmark.title || bookmark.url || '未命名'}</p>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
          </a>
        </div>
        <p className="text-xs text-gray-500 truncate">{bookmark.url}</p>
        {Array.isArray(bookmark.tags) && bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {bookmark.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
