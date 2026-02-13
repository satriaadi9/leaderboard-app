import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    // Validation
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setIsLoading(false);
      return;
    }

    if (newPassword && !oldPassword) {
      setMessage({ type: 'error', text: 'Old password is required to change password' });
      setIsLoading(false);
      return;
    }

    try {
      const payload: any = { name };
      if (newPassword) {
        payload.oldPassword = oldPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.patch('/users/profile', payload);
      const updatedUser = res.data.data;
      
      updateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      
      // Clear password fields on success
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update profile' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#F2F2F7] dark:bg-black p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-4">
          <Link 
            to="/dashboard" 
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1c1c1e] text-[#8E8E93] dark:text-gray-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all hover:bg-[#E5E5EA] dark:hover:bg-[#2c2c2e] hover:text-[#1C1C1E] dark:hover:text-white active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">Edit Profile</h1>
        </header>

        <div className="overflow-hidden rounded-[20px] bg-white dark:bg-[#1c1c1e] shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 transition-colors">
          <div className="p-8">
            {message && (
              <div className={`mb-8 flex items-center gap-3 rounded-2xl p-4 text-[15px] font-medium ${
                message.type === 'success' ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
              }`}>
                <AlertCircle className="h-5 w-5" />
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-5">
                <div>
                    <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-gray-400">Email Address</label>
                    <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full rounded-xl border-0 bg-[#F2F2F7] dark:bg-[#2c2c2e] px-4 py-3.5 text-[17px] text-[#8E8E93] dark:text-gray-500 cursor-not-allowed opacity-75 transition-colors"
                    />
                    <p className="mt-2 text-[13px] text-[#8E8E93] dark:text-gray-500">Email address cannot be changed.</p>
                </div>

                <div>
                    <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-gray-400">Full Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border-0 bg-[#F2F2F7] dark:bg-[#2c2c2e] px-4 py-3.5 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] dark:placeholder:text-gray-600 focus:ring-2 focus:ring-[#007AFF] transition-all"
                    />
                </div>
              </div>

              <div className="rounded-2xl bg-[#F2F2F7]/50 dark:bg-[#2c2c2e]/50 p-6 space-y-5 ring-1 ring-black/5 dark:ring-white/10 transition-colors">
                <h3 className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white">Change Password</h3>
                <div>
                   <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-gray-400">Current Password</label>
                   <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Required to set new password"
                        className="w-full rounded-xl border-0 bg-white dark:bg-[#1c1c1e] px-4 py-3.5 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] dark:placeholder:text-gray-600 shadow-sm focus:ring-2 focus:ring-[#007AFF] transition-all"
                    />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-gray-400">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white dark:bg-[#1c1c1e] px-4 py-3.5 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] dark:placeholder:text-gray-600 shadow-sm focus:ring-2 focus:ring-[#007AFF] transition-all"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-gray-400">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white dark:bg-[#1c1c1e] px-4 py-3.5 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#C7C7CC] dark:placeholder:text-gray-600 shadow-sm focus:ring-2 focus:ring-[#007AFF] transition-all"
                        />
                    </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-[50px] items-center justify-center rounded-xl bg-[#007AFF] px-8 text-[17px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Saving...
                      </>
                  ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" /> Save Changes
                      </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
