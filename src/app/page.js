"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2, Send, Ticket, CheckCircle, ArrowLeft, X, Check } from 'lucide-react';
import api from '@/lib/api';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    amount: '',
    lottery_type: 'Daily',
    notes: '',
  });

  const [numbers, setNumbers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [lotteryTypes, setLotteryTypes] = useState([]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await api.get('/lottery-types?active_only=1');
        setLotteryTypes(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, lottery_type: response.data[0].name }));
        }
      } catch (error) {
        console.error('Failed to fetch lottery types', error);
        // Fallback
        setLotteryTypes([{ name: 'Daily' }, { name: 'Weekly' }, { name: 'Special' }]);
      }
    };
    fetchTypes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (index, value) => {
    const newNumbers = [...numbers];
    newNumbers[index] = value;
    setNumbers(newNumbers);
  };

  const addNumberField = () => setNumbers([...numbers, '']);
  const removeNumberField = (index) => {
    setNumbers(numbers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: Name (Alphabets and spaces only)
    if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      toast.error('Full Name should contain alphabets only');
      return;
    }

    // Validation: Email
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      toast.error('Enter a valid email address');
      return;
    }

    // Validation: Phone (Numerical only)
    if (!/^\d+$/.test(formData.phone)) {
      toast.error('Phone number should contain numerical values only');
      return;
    }

    // Filter empty numbers
    const validNumbers = numbers.filter(n => n.trim() !== '');
    if (validNumbers.length === 0) {
      toast.error('Please enter at least one lottery number');
      return;
    }

    // Validation: Lottery Numbers (Numerical only)
    const nonNumeric = validNumbers.filter(n => !/^\d+$/.test(n));
    if (nonNumeric.length > 0) {
      toast.error('Lottery numbers should contain numerical values only');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        lottery_numbers: validNumbers
      };

      await api.post('/lottery-requests', dataToSubmit);

      setSubmittedData(dataToSubmit);
      setIsSubmitted(true);
      toast.success('Request submitted successfully!');

      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        amount: '',
        lottery_type: 'Daily',
        notes: '',
      });
      setNumbers(['']);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-lg p-8 rounded-3xl relative overflow-hidden bg-white shadow-2xl border border-slate-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary"></div>

        {!isSubmitted ? (
          <>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Ticket size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lottery Request</h1>
                <p className="text-sm text-slate-500 font-medium">Submit your numbers for Lottery</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    pattern="[A-Za-z\s]*"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400"
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Lottery Numbers</label>
                  {numbers.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setNumbers([])} 
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-all"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[120px] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all cursor-text"
                     onClick={() => document.getElementById('number-input')?.focus()}>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {numbers.map((num, idx) => (
                        <motion.div
                          key={`${num}-${idx}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="group bg-white border border-slate-200 pl-4 pr-2 py-2 rounded-xl flex items-center gap-2 shadow-sm hover:border-primary/30 transition-all"
                        >
                          <span className="text-sm font-black text-slate-900 tracking-wider">{num}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNumberField(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    <input
                      id="number-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400"
                      placeholder={numbers.length === 0 ? "Type a number and press Enter..." : "Add more..."}
                      onKeyDown={(e) => {
                        const isNumeric = /^[0-9]$/.test(e.key);
                        const isDelimiter = e.key === 'Enter' || e.key === ',' || e.key === ' ';
                        const isControl = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key);

                        if (isDelimiter) {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && /^\d+$/.test(val)) {
                            setNumbers([...numbers, val]);
                            e.target.value = '';
                          }
                        } else if (e.key === 'Backspace' && !e.target.value && numbers.length > 0) {
                          removeNumberField(numbers.length - 1);
                        } else if (!isNumeric && !isControl) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic ml-1">
                  Tip: Press <span className="font-bold text-slate-500">Enter</span>, <span className="font-bold text-slate-500">Space</span>, or <span className="font-bold text-slate-500">Comma</span> to add a number.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Amount ($)</label>
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
                    placeholder="5.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Lottery Type</label>
                  <div className="relative">
                    <select
                      name="lottery_type"
                      value={formData.lottery_type}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                    >
                      {lotteryTypes.map((type) => (
                        <option key={type.name} value={type.name}>{type.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                      <Plus size={16} className="rotate-45" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-primary transition-all resize-none placeholder:text-slate-400"
                  placeholder="Any special instructions for the agent..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-xl hover:shadow-primary/30 text-white font-black uppercase tracking-[0.2em] py-4 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-4 border-white/20 border-t-white"></div>
                ) : (
                  <>
                    Submit Request <Send size={20} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="inline-flex p-5 bg-green-50 rounded-[2rem] text-green-500 mb-8 border border-green-100 shadow-sm">
              <CheckCircle size={64} />
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Request Submitted!</h2>
            <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10">
              Your lottery request has been recorded. Once our team starts processing it, you will receive a confirmation email at <span className="text-slate-900 font-bold">{submittedData?.email}</span>.
            </p>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 text-left mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Entry Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                  <span className="text-sm text-slate-500 font-medium">Lottery Type</span>
                  <span className="text-sm font-black text-slate-900 uppercase tracking-wider">{submittedData?.lottery_type}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                  <span className="text-sm text-slate-500 font-medium">Total Amount</span>
                  <span className="text-lg font-black text-primary">${parseFloat(submittedData?.amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-sm text-slate-500 font-medium block mb-3">Numbers Entered</span>
                  <div className="flex flex-wrap gap-2">
                    {submittedData?.lottery_numbers.map((num, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-900 text-sm font-black rounded-xl shadow-sm">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
                {submittedData?.notes && (
                  <div className="pt-3 border-t border-slate-200/50">
                    <span className="text-sm text-slate-500 font-medium block mb-1">Additional Notes</span>
                    <p className="text-sm text-slate-900 italic font-medium">"{submittedData.notes}"</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsSubmitted(false)}
              className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-widest text-sm hover:opacity-80 transition-all border-b-2 border-primary pb-1"
            >
              <ArrowLeft size={18} /> Submit another request
            </button>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
