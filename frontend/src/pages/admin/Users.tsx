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
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                             <UsersIcon className="h-6 w-6" /> User Management
                        </h1>
                    </div>
                    <button 
                        onClick={() => { resetForm(); setIsCreateOpen(true); }}
                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" /> Add User
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg bg-white shadow">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading users...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Classes Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created At</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {users?.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="flex items-center">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                        <div className="text-sm text-gray-500">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    u.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {u.role === 'SUPERADMIN' ? <ShieldAlert className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {u._count.createdClasses}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                <button 
                                                    onClick={() => openEdit(u)}
                                                    className="mr-3 text-indigo-600 hover:text-indigo-900"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {u.id !== currentUser?.id && (
                                                    <button 
                                                        onClick={() => handleDelete(u)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-100 p-4">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingUser ? 'Edit User' : 'Create New User'}
                                </h2>
                                <button 
                                    onClick={() => { setIsCreateOpen(false); setEditingUser(null); }}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={editingUser ? handleUpdate : handleCreate} className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                        disabled={!!editingUser && editingUser.id === currentUser?.id} // Can't edit own email here maybe? or let it be
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {editingUser ? 'New Password (Optional)' : 'Password'}
                                    </label>
                                    <input 
                                        type="password" 
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        placeholder={editingUser ? "Leave blank to keep unchanged" : ""}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role</label>
                                    <select 
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value as any})}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    >
                                        <option value="ADMIN">Admin</option>
                                        <option value="SUPERADMIN">Super Admin</option>
                                    </select>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => { setIsCreateOpen(false); setEditingUser(null); }}
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {editingUser ? 'Update User' : 'Create User'}
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
