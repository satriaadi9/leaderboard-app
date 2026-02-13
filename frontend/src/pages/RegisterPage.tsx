import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/register', data);
      login(res.data.data.token, res.data.data.user);
    } catch (error: any) {
      setError('root', {
        message: error.response?.data?.message || 'Registration failed',
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black px-4 transition-colors">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">Create Account</h1>
            <p className="mt-2 text-[15px] text-[#8E8E93] dark:text-gray-400">Join UC Leaderboard today.</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 transition-colors">
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
                <div>
                     <input
                        {...register('name')}
                        type="text"
                         placeholder="Full Name"
                        className="w-full rounded-lg border-0 bg-[#F2F2F7] dark:bg-[#2c2c2e] px-4 py-3 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] dark:placeholder:text-gray-500 focus:ring-2 focus:ring-[#007AFF] transition-all"
                    />
                    {errors.name && <p className="mt-1 ml-1 text-[13px] text-[#FF3B30]">{errors.name.message}</p>}
                </div>
                <div>
                    <input
                        {...register('email')}
                        type="email"
                        placeholder="Email"
                        className="w-full rounded-lg border-0 bg-[#F2F2F7] dark:bg-[#2c2c2e] px-4 py-3 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] dark:placeholder:text-gray-500 focus:ring-2 focus:ring-[#007AFF] transition-all"
                    />
                    {errors.email && <p className="mt-1 ml-1 text-[13px] text-[#FF3B30]">{errors.email.message}</p>}
                </div>
                <div>
                    <input
                        {...register('password')}
                        type="password"
                        placeholder="Password"
                        className="w-full rounded-lg border-0 bg-[#F2F2F7] dark:bg-[#2c2c2e] px-4 py-3 text-[17px] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] dark:placeholder:text-gray-500 focus:ring-2 focus:ring-[#007AFF] transition-all"
                    />
                    {errors.password && <p className="mt-1 ml-1 text-[13px] text-[#FF3B30]">{errors.password.message}</p>}
                </div>
            </div>
            
            {errors.root && (
                <div className="rounded-lg bg-[#FF3B30]/10 p-3 text-center text-[13px] font-medium text-[#FF3B30]">
                    {errors.root.message}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#007AFF] py-3 text-[17px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] active:scale-95 disabled:opacity-50"
            >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
            </form>
             <div className="mt-8 border-t border-[#E5E5EA] dark:border-[#3a3a3c] pt-6 text-center">
                <p className="text-[13px] text-[#8E8E93] dark:text-gray-400">Already have an account?</p>
                <Link to="/login" className="mt-1 block text-[15px] font-medium text-[#007AFF] hover:underline">
                    Sign in here
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
