import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, Archive, BarChart2 } from 'lucide-react';
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
  };
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

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
      if (confirm(`Are you sure you want to delete "${cls.name}"? This will remove all student data and cannot be undone.`)) {
          deleteClassMutation.mutate(cls.id);
      }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <button
              onClick={logout}
              className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Your Classes</h2>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> New Class
            </button>
          </div>

          {isCreating && (
            <div className="mb-6 rounded-lg bg-white p-4 shadow-sm transition-all">
              <form onSubmit={handleCreate} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Class Name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={createClassMutation.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Create
                </button>
              </form>
            </div>
          )}

          {isLoading ? (
            <div>Loading classes...</div>
          ) : classes?.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No classes</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new class.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {classes?.map((cls) => (
                <div key={cls.id} className="group relative flex flex-col justify-between overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-md">
                   <div className="p-6">
                       <div className="flex items-start justify-between">
                            <Link to={`/class/${cls.id}`} className="block flex-1">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600">
                                    {cls.name}
                                </h3>
                                <div className="mt-1 text-xs text-gray-500">
                                    Created: {new Date(cls.createdAt).toLocaleDateString()}
                                </div>
                            </Link>
                            <div className="relative ml-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button 
                                    onClick={() => setEditingClass(cls)}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                                    title="Edit Name"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(cls)}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                                    title="Delete Class"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                       </div>
                       
                       <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                           <div className="text-center">
                               <div className="text-2xl font-bold text-gray-900">{cls.stats.studentCount}</div>
                               <div className="text-xs text-gray-500">Students</div>
                           </div>
                           <div className="text-center">
                               <div className="text-2xl font-bold text-indigo-600">{cls.stats.averagePoints}</div>
                               <div className="text-xs text-gray-500">Avg Points</div>
                           </div>
                       </div>
                       
                        {/* Mini Bar Chart / Visual */}
                       <div className="mt-4">
                           <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                               <span>Points Distribution</span>
                               <BarChart2 className="h-3 w-3" />
                           </div>
                           <div className="h-1.5 w-full rounded-full bg-gray-100">
                               <div 
                                    className="h-full rounded-full bg-indigo-500" 
                                    style={{ width: `${Math.min(100, Math.max(5, (cls.stats.averagePoints / 100) * 100))}%` }} 
                               />
                           </div>
                       </div>
                   </div>

                  <div className="flex border-t border-gray-100 bg-gray-50">
                    <Link
                      to={`/class/${cls.id}`}
                      className="flex-1 px-4 py-3 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      View Leaderboard &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Edit Class</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Class Name
                </label>
                <input
                  type="text"
                  value={editingClass.name}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, name: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateClassMutation.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateClassMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
