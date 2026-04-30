"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await api.post('/forgot-password', { email });
      // In development, the token is returned. In production, check email.
      if (response.data.token) {
        toast.success(`Token generated (dev only): ${response.data.token.substring(0,10)}...`);
      } else {
        toast.success(response.data.message || 'Reset link sent!');
      }
      setIsSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    } finally {
      setIsSubmitting(false);
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
            <Mail size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            {isSent ? "Check your email for the reset link." : "Enter your email to receive a reset token."}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400 font-medium"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-xl hover:shadow-primary/30 text-white font-black uppercase tracking-[0.2em] py-4 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-white/20 border-t-white"></div>
              ) : (
                <>Send Reset Link <ArrowRight size={20} /></>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm font-medium">
              We've sent a password reset token to <strong className="text-green-800">{email}</strong>.
            </div>
            <Link 
              href="/admin/reset-password"
              className="w-full inline-block bg-primary hover:shadow-xl hover:shadow-primary/30 text-white font-black uppercase tracking-[0.2em] py-4 px-6 rounded-2xl shadow-lg transition-all"
            >
              Go to Reset Form
            </Link>
          </div>
        )}
        
        <div className="mt-10 text-center text-sm">
          <Link href="/admin/login" className="text-slate-500 hover:text-primary flex items-center justify-center gap-2 transition-all font-medium">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
