"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSignup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const password = formData.password;

    // Email Check
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      toast.error('Enter a valid email address');
      return;
    }

    // Length Check
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password.length > 100) {
      toast.error('Password cannot exceed 100 characters');
      return;
    }

    // Complexity Checks
    const hasCapital = /[A-Z]/.test(password);
    const hasSmall = /[a-z]/.test(password);
    const hasSpecial = /[@$!%*#?&]/.test(password);

    if (!hasCapital || !hasSmall || !hasSpecial) {
      toast.error('Invalid password, it must contain at least one capital letter, one small letter, and one special character');
      return;
    }

    // Confirmation Check
    if (formData.password !== formData.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/register', formData);
      toast.success(response.data.message || 'Account created! Please check your email to verify.');
      // router.push('/admin'); // We don't push until verified
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-md p-10 rounded-[2.5rem] relative overflow-hidden bg-white shadow-2xl border border-slate-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary"></div>

        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-primary/10 rounded-2xl text-primary mb-6 shadow-sm border border-primary/10">
            <User size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Join Team</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Create a new administrator account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400 font-medium"
                placeholder="John Doe"
              />
            </div>
          </div>

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
                placeholder="admin@curacaolottery.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
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

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="password_confirmation"
                required
                minLength={8}
                value={formData.password_confirmation}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              <>Create Account <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div className="mt-10 text-center text-sm text-slate-500 font-medium">
          Already registered? <Link href="/admin/login" className="text-primary font-black hover:underline underline-offset-4 ml-1">Log in</Link>
        </div>
      </motion.div>
    </main>
  );
}
