import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, Bookmark, FolderKanban, X } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Workspace } from '../types';

interface WorkspaceFormData {
  name: string;
  description: string;
  icon: string;
}

export function WorkspaceSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
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

  return (
    <div className="space-y-2">
      {/* Navigation */}
      <div className="space-y-1 mb-4">
        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            isHome
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-100 border border-transparent'
          }`}
        >
          <FolderKanban size={20} />
          <span className="font-medium">工作空间</span>
        </button>
        
        <button
          onClick={() => navigate('/bookmarks')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            isBookmarks
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-100 border border-transparent'
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
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">我的工作空间</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="新建工作空间"
            >
              <Plus size={18} />
            </button>
          </div>

          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                activeWorkspaceId === workspace.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-100 border border-transparent'
              }`}
              onClick={() => setActiveWorkspace(workspace.id)}
            >
              <span className="text-xl">{workspace.icon || '📁'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{workspace.name}</p>
                {workspace.description && (
                  <p className="text-xs text-gray-500 truncate">{workspace.description}</p>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="例如: 💼 🚀 📊"
                />
                <p className="text-xs text-gray-500 mt-1">可以使用 Emoji 作为图标</p>
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
