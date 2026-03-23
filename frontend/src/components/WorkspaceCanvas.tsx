import { useEffect, useState, useRef } from 'react';
import { ExternalLink, X, Plus, Folder, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Bookmark, PinnedCard, Group } from '../types';

export function WorkspaceCanvas() {
  const { 
    workspaces, 
    activeWorkspaceId, 
    activeGroupId,
    groups,
    pinnedCards, 
    fetchPinnedCards, 
    fetchGroups,
    unpinCard,
    pinBookmark,
    setActiveGroup,
    createGroup,
    deleteGroup,
    setActiveWorkspace
  } = useWorkspaceStore();
  
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [cards, setCards] = useState<PinnedCard[]>([]);
  const [workspaceGroups, setWorkspaceGroups] = useState<Group[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchGroups(activeWorkspaceId);
      fetchPinnedCards(activeWorkspaceId, activeGroupId);
    }
  }, [activeWorkspaceId, activeGroupId, fetchGroups, fetchPinnedCards]);

  useEffect(() => {
    if (activeWorkspaceId && groups[activeWorkspaceId]) {
      setWorkspaceGroups(groups[activeWorkspaceId]);
    } else {
      setWorkspaceGroups([]);
    }
  }, [activeWorkspaceId, groups]);

  useEffect(() => {
    if (activeWorkspaceId) {
      const key = `${activeWorkspaceId}-${activeGroupId || 'null'}`;
      setCards(pinnedCards[key] || []);
    }
  }, [activeWorkspaceId, activeGroupId, pinnedCards]);

  // Native drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // MUST preventDefault to allow dropping
    e.preventDefault();
    e.stopPropagation();
    
    // Set drop effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    setIsDraggingOver(true);
    console.log('Drag over workspace');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
    console.log('Drag enter workspace');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only set to false if we're actually leaving the element
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingOver(false);
      console.log('Drag leave workspace');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    console.log('Drop event received on workspace');
    console.log('DataTransfer types:', e.dataTransfer.types);
    
    // Try to get data
    let data = e.dataTransfer.getData('application/json');
    
    // If no JSON data, try text/plain as fallback
    if (!data) {
      data = e.dataTransfer.getData('text/plain');
      console.log('Fallback to text/plain:', data);
    }
    
    if (!data) {
      console.log('No data found in drop event');
      return;
    }
    
    try {
      const bookmark: Bookmark = JSON.parse(data);
      console.log('Parsed bookmark:', bookmark);
      
      let targetWorkspaceId = activeWorkspaceId;
      
      if (!targetWorkspaceId && workspaces.length > 0) {
        targetWorkspaceId = workspaces[0].id;
        setActiveWorkspace(targetWorkspaceId);
      }
      
      if (targetWorkspaceId && bookmark?.id) {
        console.log('Pinning bookmark:', bookmark.id, 'to workspace:', targetWorkspaceId);
        pinBookmark(targetWorkspaceId, bookmark.id, activeGroupId);
      }
    } catch (err) {
      console.error('Failed to parse dropped data:', err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim() && activeWorkspaceId) {
      await createGroup(activeWorkspaceId, newGroupName.trim());
      setNewGroupName('');
      setShowNewGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('确定要删除这个分组吗？分组内的卡片将移动到未分组区域。')) {
      await deleteGroup(groupId);
      if (activeGroupId === groupId) {
        setActiveGroup(null);
      }
    }
  };

  if (workspaces.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">📂</div>
          <p className="text-lg">还没有工作空间</p>
          <p className="text-sm mt-2">点击左侧「+」按钮创建第一个工作空间</p>
        </div>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">📂</div>
          <p className="text-lg">选择一个工作空间开始</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Groups Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveGroup(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeGroupId === null
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FolderOpen size={16} />
            全部
          </button>
          
          {workspaceGroups.map((group) => (
            <div key={group.id} className="flex items-center">
              <button
                onClick={() => setActiveGroup(group.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-l-lg whitespace-nowrap transition-colors ${
                  activeGroupId === group.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Folder size={16} />
                {group.name}
              </button>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className={`px-2 py-1.5 rounded-r-lg transition-colors ${
                  activeGroupId === group.id
                    ? 'bg-blue-100 text-blue-700 hover:text-red-500'
                    : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                }`}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {showNewGroup ? (
            <form onSubmit={handleCreateGroup} className="flex items-center gap-1">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="分组名称"
                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onBlur={() => {
                  if (!newGroupName.trim()) setShowNewGroup(false);
                }}
              />
              <button
                type="submit"
                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                确定
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewGroup(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus size={16} />
              新建分组
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas */}
      <div
        id="workspace-canvas"
        ref={canvasRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 overflow-auto transition-colors ${
          isDraggingOver ? 'bg-blue-100' : 'bg-gray-50'
        }`}
      >
        {/* Workspace Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeWorkspace.icon || '📁'}</span>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{activeWorkspace.name}</h1>
              {activeWorkspace.description && (
                <p className="text-sm text-gray-500">{activeWorkspace.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Cards Area */}
        <div className="relative min-h-[calc(100vh-280px)] p-6">
          {cards.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`text-center transition-all ${isDraggingOver ? 'scale-110' : ''}`}>
                <div className="text-5xl mb-3">📌</div>
                <p className="text-lg text-gray-600">从书签列表拖拽卡片到这里</p>
                <p className="text-sm text-gray-400 mt-1">将常用网站固定到工作空间</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((card) => (
              <PinnedCardItem 
                key={card.id} 
                card={card} 
                onRemove={() => unpinCard(activeWorkspaceId!, card.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PinnedCardItemProps {
  card: PinnedCard;
  onRemove: () => void;
}

function PinnedCardItem({ card, onRemove }: PinnedCardItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  };

  const handleOpenLink = () => {
    window.open(card.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpenLink}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
            {card.icon ? (
              <img src={card.icon} alt="" className="w-8 h-8 object-contain" />
            ) : (
              <img 
                src={getFavicon(card.url)} 
                alt="" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{card.title}</h3>
            <p className="text-xs text-gray-500 truncate">{new URL(card.url).hostname}</p>
          </div>
        </div>
        
        {/* Actions */}
        <div 
          className={`flex items-center gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking buttons
        >
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
            title="打开链接"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={16} />
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
            title="移除卡片"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Description */}
      {card.description && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-600 line-clamp-2">{card.description}</p>
        </div>
      )}

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1">
            {card.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {card.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                +{card.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
