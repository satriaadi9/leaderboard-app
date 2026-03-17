import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, Users, LogOut, HelpCircle, X, Shield, Moon, Sun, ArrowRight, Lock, Globe, LayoutGrid, List as ListIcon, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useEventLogger } from '@/hooks/useEventLogger';

interface ClassItem {
  id: string;
  name: string;
  description: string;
  publicSlug: string;
  isPublic?: boolean;
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
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<ClassItem | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAtDesc' | 'createdAtAsc' | 'nameAsc' | 'nameDesc' | 'studentCountDesc'>('createdAtDesc');
  const { logEvent } = useEventLogger();

  useEffect(() => {
    logEvent('PAGE_VIEW', { page: 'Dashboard' });
  }, [logEvent]);

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

  const filteredAndSortedClasses = React.useMemo(() => {
    if (!classes) return [];
    
    let result = classes.filter(cls => 
      cls.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'createdAtDesc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'createdAtAsc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'studentCountDesc':
          return b.stats.studentCount - a.stats.studentCount;
        default:
          return 0;
      }
    });
    
    return result;
  }, [classes, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black transition-colors duration-300"> {/* Apple System Gray 6 */}
      <header className="sticky top-0 z-10 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3">
             <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] transition-colors"
                title="Toggle Theme"
             >
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
             </button>
            {user?.role === 'SUPERADMIN' && (
              <div className="flex gap-2">
                <Link 
                    to="/admin/users" 
                    className="hidden sm:flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                    <Users className="h-4 w-4" /> Users
                </Link>
                <Link 
                    to="/admin/events" 
                    className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                >
                    <ListIcon className="h-4 w-4" /> Logs
                </Link>
              </div>
            )}
            <Link 
                to="/profile" 
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] transition-colors"
                title="Edit Profile"
            >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-[#2c2c2e] text-gray-500 dark:text-gray-400">
                    <span className="text-xs font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user?.name}</span>
            </Link>
            <button
                onClick={() => setIsHelpOpen(true)}
                className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] hover:text-[#007AFF] dark:hover:text-[#007AFF] transition-colors"
                title="Help & Guide"
            >
                <HelpCircle className="h-5 w-5" />
            </button>
            <button
              onClick={logout}
              className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] hover:text-red-600 dark:hover:text-[#FF453A] transition-colors"
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
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Your Classes <span className="text-xs text-transparent select-none">v2</span></h2>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your leaderboards and students.</p>
            </div>
            
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0062cc] active:scale-95 transition-all"
            >
              <Plus className="h-5 w-5" /> New Class
            </button>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
             <div className="relative w-full sm:w-72">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-gray-400" />
                 </div>
                 <input 
                     type="text" 
                     placeholder="Search classes..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="block w-full pl-10 pr-3 py-2 border-0 rounded-xl bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-[#007AFF] shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 transition-all text-sm outline-none"
                 />
             </div>
             
             <div className="flex items-center gap-3 w-full sm:w-auto">
                 <select 
                     value={sortBy} 
                     onChange={(e) => setSortBy(e.target.value as any)}
                     className="block w-full sm:w-auto py-2 pl-3 pr-8 border-0 rounded-xl bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#007AFF] shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 transition-all text-sm outline-none appearance-none"
                 >
                     <option value="createdAtDesc">Newest First</option>
                     <option value="createdAtAsc">Oldest First</option>
                     <option value="nameAsc">Name (A-Z)</option>
                     <option value="nameDesc">Name (Z-A)</option>
                     <option value="studentCountDesc">Most Students</option>
                 </select>
                 
                 <div className="flex bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 p-1">
                     <button 
                         onClick={() => setViewMode('card')} 
                         className={`p-1.5 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                         title="Card View"
                     >
                         <LayoutGrid className="h-4 w-4" />
                     </button>
                     <button 
                         onClick={() => setViewMode('list')} 
                         className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                         title="List View"
                     >
                         <ListIcon className="h-4 w-4" />
                     </button>
                 </div>
             </div>
          </div>

          {isCreating && (
            <div className="mb-8 overflow-hidden rounded-2xl bg-white dark:bg-[#1c1c1e] p-6 shadow-sm ring-1 ring-gray-900/5 dark:ring-0 transition-all animate-in fade-in slide-in-from-top-4">
              <form onSubmit={handleCreate} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Class Name (e.g., Mathematics 101)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="flex-1 rounded-xl border-0 bg-gray-100 dark:bg-[#2c2c2e] px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-[#3a3a3c] focus:ring-2 focus:ring-[#007AFF] transition-all"
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
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-[#007AFF]"></div>
            </div>
          ) : filteredAndSortedClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1c1c1e]/50 p-16 text-center">
              <div className="mb-4 rounded-full bg-white dark:bg-[#2c2c2e] p-4 shadow-sm">
                  {searchQuery ? <Search className="h-8 w-8 text-gray-400 dark:text-gray-500" /> : <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{searchQuery ? "No matching classes" : "No classes yet"}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{searchQuery ? "Try adjusting your search filter." : "Get started by creating a new class to track student progress."}</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-hidden rounded-3xl bg-white dark:bg-[#1c1c1e] shadow-sm ring-1 ring-gray-900/5 dark:ring-0">
               <ul className="divide-y divide-gray-200 dark:divide-white/10">
                  {filteredAndSortedClasses.map((cls) => (
                      <li key={cls.id} className="group relative flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors">
                          <Link to={`/class/${cls.id}`} className="absolute inset-0 z-0"></Link>
                          
                          <div className="flex items-center gap-6 min-w-0 pr-4 z-10 pointer-events-none">
                              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                  {cls.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{cls.name}</h3>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                                      <span>{new Date(cls.createdAt).toLocaleDateString()}</span>
                                      <span className="hidden sm:inline">•</span>
                                      <span>{cls.stats.studentCount} students</span>
                                      <span className="hidden sm:inline">•</span>
                                      <span>Avg: {cls.stats.averagePoints} pts</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-4 z-10 shrink-0">
                              {cls.isPublic !== false ? (
                                    <span className="hidden sm:flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                                        <Globe className="h-3.5 w-3.5" /> Public
                                    </span>
                                ) : (
                                    <span className="hidden sm:flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                        <Lock className="h-3.5 w-3.5" /> Private
                                    </span>
                                )}
                              
                              <div className="flex gap-1">
                                  <button 
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingClass(cls); }}
                                      className="rounded-full p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3a3a3c] hover:text-[#007AFF] transition-colors"
                                      title="Edit Name"
                                  >
                                      <Edit2 className="h-4 w-4" />
                                  </button>
                                  {user?.role !== 'STUDENT_ASSISTANT' && (
                                      <button 
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(cls); }}
                                          className="rounded-full p-2 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                          title="Delete Class"
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </button>
                                  )}
                              </div>
                          </div>
                      </li>
                  ))}
               </ul>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedClasses.map((cls) => (
                <div key={cls.id} className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white dark:bg-[#1c1c1e] shadow-sm ring-1 ring-gray-900/5 dark:ring-0 transition-all duration-300 hover:-translate-y-1">
                   <div className="p-6">
                       <div className="flex items-start justify-between">
                            <Link to={`/class/${cls.id}`} className="block flex-1 group-card-link">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight group-hover:text-[#007AFF] transition-colors">
                                    {cls.name}
                                </h3>
                                <div className="mt-2 flex items-center justify-between text-xs font-medium text-gray-400 dark:text-gray-500">
                                    <span>Created {new Date(cls.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    {cls.isPublic !== false ? (
                                        <span className="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                                            <Globe className="h-3 w-3" /> Public
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                            <Lock className="h-3 w-3" /> Private
                                        </span>
                                    )}
                                </div>
                            </Link>
                            <div className="relative ml-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingClass(cls); }}
                                    className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] hover:text-[#007AFF] transition-colors"
                                    title="Edit Name"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                {user?.role !== 'STUDENT_ASSISTANT' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}
                                        className="rounded-full p-2 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="Delete Class"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                       </div>
                       
                       <div className="mt-8 grid grid-cols-2 gap-4">
                           <div className="text-center p-3 rounded-2xl bg-gray-50 dark:bg-[#2c2c2e]">
                               <div className="text-2xl font-bold text-gray-900 dark:text-white">{cls.stats.studentCount}</div>
                               <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Students</div>
                           </div>
                           <div className="text-center p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/20">
                               <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{cls.stats.averagePoints}</div>
                               <div className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide">Avg Points</div>
                           </div>
                       </div>
                       
                        {/* Point Distribution Histogram */}
                       <div className="mt-6">
                           <div className="flex items-end justify-between h-12 gap-1 px-1">
                                {cls.stats.distribution && cls.stats.distribution.length > 0 ? (
                                    cls.stats.distribution.map((count, i) => {
                                        const maxCount = Math.max(...cls.stats.distribution, 1);
                                        // Ensure at least a sliver is shown if count is 0, or just hide it? 
                                        // Better to show linear bar. if count is 0, height 0.
                                        const heightPercentage = (count / maxCount) * 100;
                                        
                                        return (
                                            <div key={i} className="h-full w-full bg-gray-100 dark:bg-[#2c2c2e] rounded-sm relative group/bar overflow-hidden" title={`${count} students`}>
                                                <div 
                                                    className={`absolute bottom-0 w-full bg-[#007AFF] transition-all duration-500 ${count === 0 ? 'opacity-0' : 'opacity-40 dark:opacity-60 group-hover/bar:opacity-80'}`}
                                                    style={{ height: `${Math.max(heightPercentage, count > 0 ? 15 : 0)}%` }}
                                                ></div>
                                            </div>
                                        );
                                    })
                                ) : (
                                     // Fallback if no distribution data
                                     [...Array(5)].map((_, i) => (
                                        <div key={i} className="h-full w-full bg-gray-100 dark:bg-[#2c2c2e] rounded-sm relative opacity-50"></div>
                                     ))
                                )}
                           </div>
                           <div className="flex justify-between mt-2 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                               <span>Score Dist.</span>
                               <span className="opacity-50">Low → High</span>
                           </div>
                       </div>
                   </div>

                   <div className="bg-gray-50 dark:bg-[#2c2c2e] px-6 py-4 flex items-center justify-between">
                        <div className="flex -space-x-2 overflow-hidden">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1c1c1e] bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[8px] font-bold text-gray-500 dark:text-gray-300">
                                    {String.fromCharCode(65 + i)}
                                </div>
                            ))}
                            {cls.stats.studentCount > 3 && (
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1c1c1e] bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[8px] font-medium text-gray-500 dark:text-gray-400">
                                    +{cls.stats.studentCount - 3}
                                </div>
                            )}
                        </div>
                        <Link to={`/class/${cls.id}`} className="text-sm font-semibold text-[#007AFF] hover:text-[#005bb5] transition-colors flex items-center gap-1 group/btn">
                            View Details <ArrowRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Overlay */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm"
             onClick={() => setEditingClass(null)}>
          <div 
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1c1c1e] p-6 shadow-xl ring-1 ring-gray-900/5 dark:ring-white/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Class Name</h3>
            <form onSubmit={handleUpdate}>
                <input
                  type="text"
                  required
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2c2c2e] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#007AFF] focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition-all"
                  placeholder="e.g. IMT-101"
                />
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={() => setEditingClass(null)}
                        className="flex-1 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={updateClassMutation.isPending}
                        className="flex-1 rounded-xl bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#005bb5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:opacity-50 transition-all"
                    >
                        {updateClassMutation.isPending ? 'Saving...' : 'Save Changes'}
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
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] bg-white dark:bg-[#1c1c1e] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#3a3a3c] bg-[#F2F2F7]/80 dark:bg-[#2c2c2e]/80 px-6 py-4 backdrop-blur-xl">
                <h3 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-[#007AFF]" /> User Guide
                </h3>
                <button 
                    onClick={() => setIsHelpOpen(false)} 
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E5EA] dark:bg-[#3a3a3c] text-[#8E8E93] dark:text-gray-400 hover:bg-[#D1D1D6] dark:hover:bg-[#48484a] hover:text-[#1C1C1E] dark:hover:text-white transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-8">
                    {/* Admin Section */}
                    <div className="rounded-2xl bg-[#F2F2F7]/50 dark:bg-[#2c2c2e]/50 p-6 ring-1 ring-black/5 dark:ring-white/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white">Admin (Lecturer)</h4>
                                <p className="text-[13px] text-[#8E8E93] dark:text-gray-400">Full access to manage classes and assistants.</p>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-[15px] text-[#1C1C1E] dark:text-white">
                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#007AFF]" />
                                <span><span className="font-semibold">Create Class:</span> Click the "New Class" button to create a new leaderboard for your course.</span>
                            </li>
                            <li className="flex gap-3 text-[15px] text-[#1C1C1E] dark:text-white">
                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#007AFF]" />
                                <span><span className="font-semibold">Manage Class:</span> Use the edit icon to rename a class, or the trash icon to permanently delete it.</span>
                            </li>
                            <li className="flex gap-3 text-[15px] text-[#1C1C1E] dark:text-white">
                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#007AFF]" />
                                <span><span className="font-semibold">Leaderboard:</span> Click on any class card to enter the leaderboard admin view.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Student Assistant Section */}
                    {user?.role !== 'STUDENT' && (
                        <div className="rounded-2xl bg-[#F2F2F7]/50 dark:bg-[#2c2c2e]/50 p-6 ring-1 ring-black/5 dark:ring-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759]/10 text-[#34C759]">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white">Student Assistant</h4>
                                    <p className="text-[13px] text-[#8E8E93] dark:text-gray-400">Restricted access to assist in grading.</p>
                                </div>
                            </div>
                            <ul className="space-y-3">
                                <li className="flex gap-3 text-[15px] text-[#1C1C1E] dark:text-white">
                                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#34C759]" />
                                    <span><span className="font-semibold">View Access:</span> You can view all classes assigned to you.</span>
                                </li>
                                <li className="flex gap-3 text-[15px] text-[#1C1C1E] dark:text-white">
                                    <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#34C759]" />
                                    <span><span className="font-semibold">Grading:</span> Click on a class to enter the leaderboard and award/deduct points for students.</span>
                                </li>
                                <li className="flex gap-3 text-[15px] text-[#1C1C1E] dark:text-white">
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
          <div className="relative w-full max-w-[320px] overflow-hidden rounded-[20px] bg-white dark:bg-[#1c1c1e] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#FF3B30]">
                    <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-[17px] font-semibold text-[#1C1C1E] dark:text-white">Delete Class</h3>
                <p className="text-[13px] text-[#8E8E93] dark:text-gray-400 leading-relaxed">
                    Are you sure you want to delete <span className="font-medium text-[#1C1C1E] dark:text-white">"{deleteConfirmation.name}"</span>?
                    All student data will be permanently removed.
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-px bg-[#3C3C43]/20 border-t border-[#3C3C43]/20">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="bg-white dark:bg-[#1c1c1e] p-3.5 text-[17px] font-medium text-[#007AFF] hover:bg-[#F2F2F7] dark:hover:bg-[#2c2c2e] active:bg-[#E5E5EA] dark:active:bg-[#3a3a3c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteClassMutation.mutate(deleteConfirmation.id)}
                  disabled={deleteClassMutation.isPending}
                  className="bg-white dark:bg-[#1c1c1e] p-3.5 text-[17px] font-semibold text-[#FF3B30] hover:bg-[#F2F2F7] dark:hover:bg-[#2c2c2e] active:bg-[#E5E5EA] dark:active:bg-[#3a3a3c] transition-colors"
                >
                  {deleteClassMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard;
