import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, Bookmark, FolderKanban, X, GripVertical } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Workspace } from '../types';

interface WorkspaceFormData {
  name: string;
  description: string;
  icon: string;
}

const WORKSPACE_ICONS = ['📁', '💼', '🚀', '📊', '🧠', '⚙️', '🧩', '📝', '📚', '🛠️', '🎯', '💡'];

export function WorkspaceSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
  } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [draggedWorkspaceId, setDraggedWorkspaceId] = useState<string | null>(null);
  const [dragOverWorkspaceId, setDragOverWorkspaceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkspaceFormData>({ name: '', description: '', icon: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      await createWorkspace(formData);
      setFormData({ name: '', description: '', icon: '' });
      setIsCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWorkspace && formData.name.trim()) {
      await updateWorkspace(editingWorkspace.id, formData);
      setEditingWorkspace(null);
      setFormData({ name: '', description: '', icon: '' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个工作空间吗？')) {
      await deleteWorkspace(id);
    }
  };

  const startEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description || '',
      icon: workspace.icon || '',
    });
  };

  const isHome = location.pathname === '/';
  const isBookmarks = location.pathname === '/bookmarks';

  const handleWorkspaceDragStart = (e: React.DragEvent<HTMLButtonElement>, workspaceId: string) => {
    e.stopPropagation();
    setDraggedWorkspaceId(workspaceId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('workspace/id', workspaceId);
  };

  const handleWorkspaceDragOver = (e: React.DragEvent<HTMLDivElement>, workspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedWorkspaceId && draggedWorkspaceId !== workspaceId) {
      setDragOverWorkspaceId(workspaceId);
    }
  };

  const handleWorkspaceDrop = async (e: React.DragEvent<HTMLDivElement>, targetWorkspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceWorkspaceId = e.dataTransfer.getData('workspace/id') || draggedWorkspaceId;
    setDraggedWorkspaceId(null);
    setDragOverWorkspaceId(null);

    if (!sourceWorkspaceId || sourceWorkspaceId === targetWorkspaceId) return;

    const nextWorkspaces = [...workspaces];
    const sourceIndex = nextWorkspaces.findIndex((workspace) => workspace.id === sourceWorkspaceId);
    const targetIndex = nextWorkspaces.findIndex((workspace) => workspace.id === targetWorkspaceId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedWorkspace] = nextWorkspaces.splice(sourceIndex, 1);
    nextWorkspaces.splice(targetIndex, 0, movedWorkspace);
    await reorderWorkspaces(nextWorkspaces);
  };

  const handleWorkspaceDragEnd = () => {
    setDraggedWorkspaceId(null);
    setDragOverWorkspaceId(null);
  };

  return (
    <div className="space-y-2">
      {/* Navigation */}
      <div className="space-y-1 mb-4">
        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            isHome
              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/60'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
          }`}
        >
          <FolderKanban size={20} />
          <span className="font-medium">工作空间</span>
        </button>
        
        <button
          onClick={() => navigate('/bookmarks')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            isBookmarks
              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/60'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
          }`}
        >
          <Bookmark size={20} />
          <span className="font-medium">书签管理</span>
        </button>
      </div>

      {/* Workspaces Section */}
      {isHome && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">我的工作空间</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="新建工作空间"
            >
              <Plus size={18} />
            </button>
          </div>

          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              onDragOver={(e) => handleWorkspaceDragOver(e, workspace.id)}
              onDrop={(e) => handleWorkspaceDrop(e, workspace.id)}
              className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                activeWorkspaceId === workspace.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/60'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              } ${draggedWorkspaceId === workspace.id ? 'opacity-55' : ''} ${
                dragOverWorkspaceId === workspace.id ? 'ring-2 ring-blue-300 dark:ring-blue-700' : ''
              }`}
              onClick={() => setActiveWorkspace(workspace.id)}
            >
              <button
                draggable
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => handleWorkspaceDragStart(e, workspace.id)}
                onDragEnd={handleWorkspaceDragEnd}
                className="flex h-6 w-4 flex-shrink-0 cursor-grab items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-500 active:cursor-grabbing dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title="拖动排序"
              >
                <GripVertical size={16} />
              </button>
              <span className="text-xl flex-shrink-0">{workspace.icon || '📁'}</span>
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium truncate">{workspace.name}</p>
                {workspace.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{workspace.description}</p>
                )}
              </div>
              
              <div
                className={`absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg px-1 py-0.5 backdrop-blur-sm transition-opacity ${
                  activeWorkspaceId === workspace.id
                    ? 'bg-blue-50/95 dark:bg-blue-900/85'
                    : 'bg-gray-100/95 dark:bg-gray-800/90 opacity-0 group-hover:opacity-100'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(workspace);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(workspace.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || editingWorkspace) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingWorkspace ? '编辑工作空间' : '新建工作空间'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingWorkspace(null);
                  setFormData({ name: '', description: '', icon: '' });
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={editingWorkspace ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入工作空间名称"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <div className="grid grid-cols-6 gap-2">
                  {WORKSPACE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`h-10 rounded-lg border text-xl transition-colors ${
                        formData.icon === icon
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: '' })}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  使用默认图标（📁）
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="工作空间描述（可选）"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingWorkspace(null);
                    setFormData({ name: '', description: '', icon: '' });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {editingWorkspace ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
