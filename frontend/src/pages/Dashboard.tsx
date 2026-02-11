import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ClassItem {
  id: string;
  name: string;
  description: string;
  publicSlug: string;
  _count: { enrollments: number };
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    createClassMutation.mutate(newClassName);
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
                <Link
                  key={cls.id}
                  to={`/class/${cls.id}`}
                  className="block rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-medium text-gray-900">{cls.name}</h3>
                  <p className="mt-2 text-sm text-gray-500 truncate">{cls.publicSlug}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
