import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(`OTP has been successfully sent to ${email}`);
      setStep('verify');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      setStep('reset');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      navigate('/login', { state: { message: 'Password reset successful across all your devices. Please login.' } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">
          {step === 'request' && 'Reset your password'}
          {step === 'verify' && 'Check your email'}
          {step === 'reset' && 'Create new password'}
        </h2>
        <p className="mt-2 text-center text-sm text-[#8E8E93]">
          {step === 'request' && 'Enter your email address and we will send you an OTP to reset your password.'}
          {step === 'verify' && `We sent a 6-digit code to ${email}`}
          {step === 'reset' && 'Your new password must be securely protected.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#1c1c1e] py-8 px-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:rounded-2xl sm:px-10 ring-1 ring-black/5 dark:ring-white/10">
          
          {success && (
            <div className="mb-6 rounded-xl bg-green-50 dark:bg-green-500/10 p-4 border border-green-200 dark:border-green-500/20 flex gap-3">
               <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
               <p className="text-[13px] font-medium text-green-800 dark:text-green-400">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 p-4 border border-red-200 dark:border-red-500/20 flex gap-3">
               <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
               <p className="text-[13px] font-medium text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {step === 'request' && (
            <form className="space-y-6" onSubmit={handleRequestOtp}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1C1C1E] dark:text-white">
                  Email address
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[#8E8E93]" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-[#F2F2F7] dark:bg-[#2c2c2e] border-0 rounded-xl text-[15px] text-[#1C1C1E] dark:text-white placeholder-[#8E8E93] focus:ring-2 focus:ring-[#007AFF] transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-[15px] font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007AFF] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isSubmitting ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-[#1C1C1E] dark:text-white text-center">
                  6-Digit OTP
                </label>
                <div className="mt-4">
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full text-center tracking-[0.5em] font-mono text-2xl py-4 bg-[#F2F2F7] dark:bg-[#2c2c2e] border-0 rounded-xl text-[#1C1C1E] dark:text-white placeholder-[#8E8E93]/50 focus:ring-2 focus:ring-[#007AFF] transition-all"
                    placeholder="------"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-[15px] font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007AFF] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={cooldown > 0 || isSubmitting}
                  className="text-[13px] font-medium text-[#007AFF] hover:text-[#0062CC] disabled:text-[#8E8E93] transition-colors"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {step === 'reset' && (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] dark:text-white">
                  New Password
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#8E8E93]" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-[#F2F2F7] dark:bg-[#2c2c2e] border-0 rounded-xl text-[15px] text-[#1C1C1E] dark:text-white placeholder-[#8E8E93] focus:ring-2 focus:ring-[#007AFF] transition-all"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] dark:text-white">
                  Confirm Password
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-[#8E8E93]" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-[#F2F2F7] dark:bg-[#2c2c2e] border-0 rounded-xl text-[15px] text-[#1C1C1E] dark:text-white placeholder-[#8E8E93] focus:ring-2 focus:ring-[#007AFF] transition-all"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || newPassword.length < 6 || confirmPassword.length < 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-[15px] font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007AFF] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
                {!isSubmitting && <ArrowRight className="ml-2 -mr-1 h-5 w-5" />}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
             <Link to="/login" className="text-[14px] font-medium text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors">
               Back to login
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
