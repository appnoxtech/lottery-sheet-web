"use client";

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === '1') {
      toast.success('Email verified successfully! You can now login.');
    } else if (verified === 'already') {
      toast.info('Email is already verified.');
    }
  }, [searchParams]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Email Check
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      toast.error('Enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/login', formData);
      localStorage.setItem('admin_token', response.data.access_token);
      toast.success('Login successful!');
      router.push('/admin');
    } catch (error) {
      if (error.response?.data?.email_not_verified) {
        toast.error('Email not verified. Please check your inbox.');
        setShowResend(true);
      } else {
        toast.error(error.response?.data?.message || 'Invalid credentials');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      const response = await api.post('/email/resend', { email: formData.email });
      toast.success(response.data.message || 'Verification email resent!');
      setShowResend(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-md p-10 rounded-[2.5rem] relative overflow-hidden bg-white shadow-2xl border border-slate-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary"></div>

        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-primary/10 rounded-2xl text-primary mb-6 shadow-sm border border-primary/10">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Portal</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Access the Lottery dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400 font-medium"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
              <Link href="/admin/forgot-password" weights="medium" className="text-xs text-primary hover:text-primary-dark transition-all font-bold">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400 font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-xl hover:shadow-primary/30 text-white font-black uppercase tracking-[0.2em] py-4 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 mt-8 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-white/20 border-t-white"></div>
            ) : (
              <>Log In <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        {showResend && (
          <div className="mt-6 text-center p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-xs text-amber-700 mb-3 font-bold uppercase tracking-wider">Verification required</p>
            <button
              onClick={handleResend}
              className="text-sm text-white bg-amber-600 hover:bg-amber-700 px-6 py-2.5 rounded-xl transition-all font-bold shadow-md shadow-amber-600/20"
            >
              Resend Verification Email
            </button>
          </div>
        )}

        <div className="mt-10 text-center text-sm text-slate-500 font-medium">
          New administrator? <Link href="/admin/signup" className="text-primary font-black hover:underline underline-offset-4 ml-1">Sign Up</Link>
        </div>
      </motion.div>
    </main>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
