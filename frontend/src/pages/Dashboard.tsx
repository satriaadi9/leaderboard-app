import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, BarChart2, Users, LogOut, HelpCircle, X, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ClassItem {
  id: string;
  name: string;
  description: string;
  publicSlug: string;
  createdAt: string;
  stats: {
      studentCount: number;
      averagePoints: number;
      totalPointsDistributed: number;
      distribution: number[];
  };
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<ClassItem | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const { data: classes, isLoading } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data.data;
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async (name: string) => {
      return api.post('/classes', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsCreating(false);
      setNewClassName('');
    },
  });

  const updateClassMutation = useMutation({
      mutationFn: async ({ id, name }: { id: string; name: string }) => {
          return api.patch(`/classes/${id}`, { name });
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['classes'] });
          setEditingClass(null);
      }
  });

  const deleteClassMutation = useMutation({
      mutationFn: async (id: string) => {
          return api.delete(`/classes/${id}`);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['classes'] });
          setDeleteConfirmation(null);
      }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    createClassMutation.mutate(newClassName);
  };

  const handleUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingClass || !editingClass.name.trim()) return;
      updateClassMutation.mutate({ id: editingClass.id, name: editingClass.name });
  };

  const handleDelete = (cls: ClassItem) => {
      setDeleteConfirmation(cls);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]"> {/* Apple System Gray 6 */}
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3">
            {user?.role === 'SUPERADMIN' && (
                <Link 
                    to="/admin/users" 
                    className="hidden sm:flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                >
                    <Users className="h-4 w-4" /> Users
                </Link>
            )}
            <Link 
                to="/profile" 
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                title="Edit Profile"
            >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                    <span className="text-xs font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user?.name}</span>
            </Link>
            <button
                onClick={() => setIsHelpOpen(true)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-[#007AFF] transition-colors"
                title="Help & Guide"
            >
                <HelpCircle className="h-5 w-5" />
            </button>
            <button
              onClick={logout}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Your Classes</h2>
                <p className="mt-1 text-gray-500">Manage your leaderboards and students.</p>
            </div>
            
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0062cc] active:scale-95 transition-all"
            >
              <Plus className="h-5 w-5" /> New Class
            </button>
          </div>

          {isCreating && (
            <div className="mb-8 overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-all animate-in fade-in slide-in-from-top-4">
              <form onSubmit={handleCreate} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Class Name (e.g., Mathematics 101)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="flex-1 rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-[#007AFF] transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={createClassMutation.isPending}
                  className="rounded-xl bg-[#007AFF] px-6 py-3 font-semibold text-white shadow-sm hover:bg-[#0062cc] disabled:opacity-50 transition-all"
                >
                  Create
                </button>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#007AFF]"></div>
            </div>
          ) : classes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50/50 p-16 text-center">
              <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
                  <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No classes yet</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">Get started by creating a new class to track student progress.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {classes?.map((cls) => (
                <div key={cls.id} className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-900/5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                   <div className="p-6">
                       <div className="flex items-start justify-between">
                            <Link to={`/class/${cls.id}`} className="block flex-1 group-card-link">
                                <h3 className="text-xl font-semibold text-gray-900 tracking-tight group-hover:text-[#007AFF] transition-colors">
                                    {cls.name}
                                </h3>
                                <div className="mt-1 text-xs font-medium text-gray-400">
                                    Created {new Date(cls.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </Link>
                            <div className="relative ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingClass(cls); }}
                                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-[#007AFF] transition-colors"
                                    title="Edit Name"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                {user?.role !== 'STUDENT_ASSISTANT' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}
                                        className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        title="Delete Class"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                       </div>
                       
                       <div className="mt-8 grid grid-cols-2 gap-4">
                           <div className="text-center p-3 rounded-2xl bg-gray-50">
                               <div className="text-2xl font-bold text-gray-900">{cls.stats.studentCount}</div>
                               <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Students</div>
                           </div>
                           <div className="text-center p-3 rounded-2xl bg-blue-50/50">
                               <div className="text-2xl font-bold text-blue-600">{cls.stats.averagePoints}</div>
                               <div className="text-xs font-medium text-blue-600/70 uppercase tracking-wide">Avg Points</div>
                           </div>
                       </div>
                       
                        {/* Points Distribution Histogram */}
                       <div className="mt-6">
                           <div className="flex items-center gap-2 mb-3">
                               <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
                               <span className="text-xs font-medium text-gray-500">Performance Distribution</span>
                           </div>
                           <div className="flex items-end justify-between h-12 gap-1.5 px-1">
                               {(cls.stats.distribution || [0,0,0,0,0]).map((count, i) => {
                                   const max = Math.max(...(cls.stats.distribution || [0]), 1);
                                   const height = Math.max((count / max) * 100, 6); // Min height 6%
                                   return (
                                       <div key={i} className="relative flex-1 h-full flex items-end group/bar">
                                           <div 
                                               className={`w-full rounded-md transition-all duration-500 ${count > 0 ? 'bg-[#007AFF] hover:bg-[#0051a8]' : 'bg-gray-100'}`}
                                               style={{ height: `${count > 0 ? height : 6}%` }}
                                           />
                                           {count > 0 && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/bar:block whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg z-10 animate-in fade-in zoom-in-95 duration-200">
                                                    {count} students
                                                    <div className="absolute -bottom-1 left-1/2 -ml-1 h-2 w-2 -rotate-45 bg-gray-900"></div>
                                                </div>
                                           )}
                                       </div>
                                   );
                               })}
                           </div>
                       </div>
                   </div>

                  <Link
                    to={`/class/${cls.id}`}
                    className="block border-t border-gray-100 bg-gray-50/50 px-6 py-4 text-center text-sm font-semibold text-[#007AFF] hover:bg-gray-50 transition-colors"
                  >
                    View Leaderboard
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Apple-style Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setEditingClass(null)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-6 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 text-center">Edit Class</h3>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6">
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700 ml-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={editingClass.name}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, name: e.target.value })
                  }
                  className="w-full rounded-xl border-0 bg-gray-100 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#007AFF] transition-all"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-900 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateClassMutation.isPending}
                  className="w-full rounded-xl bg-[#007AFF] px-4 py-3 font-semibold text-white hover:bg-[#0062cc] disabled:opacity-50 transition-colors"
                >
                  {updateClassMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in" onClick={() => setIsHelpOpen(false)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] bg-[#F2F2F7]/80 px-6 py-4 backdrop-blur-xl">
                <h3 className="text-[17px] font-semibold text-[#1C1C1E] flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-[#007AFF]" /> User Guide
                </h3>
                <button 
                    onClick={() => setIsHelpOpen(false)} 
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E5EA] text-[#8E8E93] hover:bg-[#D1D1D6] hover:text-[#1C1C1E] transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-8">
                    {/* Admin Section */}
                    <div className="rounded-2xl bg-[#F2F2F7]/50 p-6 ring-1 ring-black/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-[17px] font-semibold text-[#1C1C1E]">Admin (Lecturer)</h4>
                                <p className="text-[13px] text-[#8E8E93]">Full access to manage classes and assistants.</p>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-[15px] text-[#1C1C1E]">
                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#007AFF]" />
                                <span><span className="font-semibold">Create Class:</span> Click the "New Class" button to create a new leaderboard for your course.</span>
                            </li>
                            <li className="flex gap-3 text-[15px] text-[#1C1C1E]">
                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#007AFF]" />
                                <span><span className="font-semibold">Manage Class:</span> Use the edit icon to rename a class, or the trash icon to permanently delete it.</span>
                            </li>
                            <li className="flex gap-3 text-[15px] text-[#1C1C1E]">
                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#007AFF]" />
                                <span><span className="font-semibold">Leaderboard:</span> Click on any class card to enter the leaderboard admin view.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Student Assistant Section */}
                    {user?.role !== 'STUDENT' && (
                        <div className="rounded-2xl bg-[#F2F2F7]/50 p-6 ring-1 ring-black/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759]/10 text-[#34C759]">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-[17px] font-semibold text-[#1C1C1E]">Student Assistant</h4>
                                    <p className="text-[13px] text-[#8E8E93]">Restricted access to assist in grading.</p>
                                </div>
                            </div>
                            <ul className="space-y-3">
                                <li className="flex gap-3 text-[15px] text-[#1C1C1E]">
                                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#34C759]" />
                                    <span><span className="font-semibold">View Access:</span> You can view all classes assigned to you.</span>
                                </li>
                                <li className="flex gap-3 text-[15px] text-[#1C1C1E]">
                                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#34C759]" />
                                    <span><span className="font-semibold">Grading:</span> Click on a class to enter the leaderboard and award/deduct points for students.</span>
                                </li>
                                <li className="flex gap-3 text-[15px] text-[#1C1C1E]">
                                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#34C759]" />
                                    <span><span className="font-semibold">No Deletion:</span> Assistants cannot delete classes or change critical settings.</span>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setDeleteConfirmation(null)} />
          <div className="relative w-full max-w-[320px] overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#FF3B30]">
                    <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-[17px] font-semibold text-[#1C1C1E]">Delete Class</h3>
                <p className="text-[13px] text-[#8E8E93] leading-relaxed">
                    Are you sure you want to delete <span className="font-medium text-[#1C1C1E]">"{deleteConfirmation.name}"</span>?
                    All student data will be permanently removed.
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-px bg-[#3C3C43]/20 border-t border-[#3C3C43]/20">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="bg-white p-3.5 text-[17px] font-medium text-[#007AFF] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteClassMutation.mutate(deleteConfirmation.id)}
                  disabled={deleteClassMutation.isPending}
                  className="bg-white p-3.5 text-[17px] font-semibold text-[#FF3B30] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors"
                >
                  {deleteClassMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
