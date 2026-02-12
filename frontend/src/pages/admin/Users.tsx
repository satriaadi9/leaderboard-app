import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Ensure you have this installed, Dashboard uses it.
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { 
    Users as UsersIcon, 
    Plus, 
    Edit2, 
    Trash2, 
    Shield, 
    ShieldAlert, 
    ArrowLeft,
    X,
    Save
} from 'lucide-react';

interface AdminUser { // Renamed to avoid authorized user conflict
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SUPERADMIN';
    createdAt: string;
    _count: { createdClasses: number };
}

const Users: React.FC = () => {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    
    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'ADMIN' as 'ADMIN' | 'SUPERADMIN'
    });
    
    // Authorization Check
    if (currentUser?.role !== 'SUPERADMIN') {
        return <Navigate to="/" replace />;
    }

    // Queries
    const { data: users, isLoading } = useQuery<AdminUser[]>({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data.data;
        }
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            return api.post('/users', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to create user');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<typeof formData> }) => {
            return api.patch(`/users/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setEditingUser(null);
            resetForm();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to update user');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'ADMIN'
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        
        // Only send changed fields and password only if provided
        const payload: any = {
            name: formData.name,
            email: formData.email,
            role: formData.role
        };
        if (formData.password) payload.password = formData.password;

        updateMutation.mutate({ id: editingUser.id, data: payload });
    };

    const openEdit = (user: AdminUser) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Don't fill password
            role: user.role
        });
    };

    const handleDelete = (user: AdminUser) => {
        if (confirm(`Are you sure you want to delete ${user.name}? This will delete their classes as well.`)) {
            deleteMutation.mutate(user.id);
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            to="/dashboard" 
                            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#8E8E93] shadow-sm ring-1 ring-black/5 transition-all hover:bg-[#E5E5EA] hover:text-[#1C1C1E] active:scale-95"
                        >
                            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-[#1C1C1E] flex items-center gap-2">
                             <UsersIcon className="h-7 w-7" /> User Management
                        </h1>
                    </div>
                    <button 
                        onClick={() => { resetForm(); setIsCreateOpen(true); }}
                        className="inline-flex h-[44px] items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-6 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] active:scale-95"
                    >
                        <Plus className="h-5 w-5" /> Add User
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                             <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin mb-4" />
                             <p className="text-[#8E8E93] font-medium">Loading users...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-[#F2F2F7]/50 border-b border-[#E5E5EA]">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">User</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Role</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Classes</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Joined</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E5EA] bg-white">
                                    {users?.map(u => (
                                        <tr key={u.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div>
                                                    <div className="text-[15px] font-semibold text-[#1C1C1E]">{u.name}</div>
                                                    <div className="text-[13px] text-[#8E8E93]">{u.email}</div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                                    u.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-[#E5E5EA] text-[#8E8E93]'
                                                }`}>
                                                    {u.role === 'SUPERADMIN' ? <ShieldAlert className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-[15px] text-[#1C1C1E] tabular-nums">
                                                {u._count.createdClasses}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-[13px] text-[#8E8E93] tabular-nums">
                                                {new Date(u.createdAt).toLocaleDateString(undefined, {
                                                    dateStyle: 'medium'
                                                })}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => openEdit(u)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    {u.id !== currentUser?.id && (
                                                        <button 
                                                            onClick={() => handleDelete(u)}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Overlay Modals */}
                {(isCreateOpen || editingUser) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-[440px] overflow-hidden rounded-[20px] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between border-b border-[#E5E5EA] bg-[#F2F2F7]/50 px-6 py-4 backdrop-blur-xl">
                                <h2 className="text-[17px] font-semibold text-[#1C1C1E]">
                                    {editingUser ? 'Edit User' : 'Create New User'}
                                </h2>
                                <button 
                                    onClick={() => { setIsCreateOpen(false); setEditingUser(null); }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E5EA] text-[#8E8E93] transition-colors hover:bg-[#D1D1D6] hover:text-[#1C1C1E]"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <form onSubmit={editingUser ? handleUpdate : handleCreate} className="p-6 space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">Full Name</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="block w-full rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-[17px] text-[#1C1C1E] placeholder:text-[#8E8E93] focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="mb-1.5 block text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">Email Address</label>
                                        <input 
                                            type="email" 
                                            required 
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                            className="block w-full rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-[17px] text-[#1C1C1E] placeholder:text-[#8E8E93] focus:ring-2 focus:ring-[#007AFF]/20 transition-all disabled:opacity-50"
                                            disabled={!!editingUser && editingUser.id === currentUser?.id}
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">
                                            {editingUser ? 'New Password (Optional)' : 'Password'}
                                        </label>
                                        <input 
                                            type="password" 
                                            required={!editingUser}
                                            value={formData.password}
                                            onChange={e => setFormData({...formData, password: e.target.value})}
                                            placeholder={editingUser ? "Leave blank to keep unchanged" : "••••••••"}
                                            className="block w-full rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-[17px] text-[#1C1C1E] placeholder:text-[#8E8E93] focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide">Role</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.role}
                                                onChange={e => setFormData({...formData, role: e.target.value as any})}
                                                className="block w-full appearance-none rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-[17px] text-[#1C1C1E] focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                                            >
                                                <option value="ADMIN">Admin</option>
                                                <option value="SUPERADMIN">Super Admin</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#8E8E93]">
                                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        type="button"
                                        onClick={() => { setIsCreateOpen(false); setEditingUser(null); }}
                                        className="flex-1 rounded-xl bg-[#E5E5EA] py-3 text-[15px] font-semibold text-[#1C1C1E] transition-all hover:bg-[#D1D1D6]"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="flex-1 rounded-xl bg-[#007AFF] py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] disabled:opacity-50"
                                    >
                                        {editingUser ? 'Save Changes' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Users;
