"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2, Send, Ticket, CheckCircle, ArrowLeft, X, Check, ChevronDown, Search } from 'lucide-react';
import api from '@/lib/api';
import { countries as COUNTRY_DATA } from '@/data/countries';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    country_code: '+1',
    phone: '',
    email: '',
    // currency: '$', // Commented out - not needed for current flow
    lottery_type: 'Daily',
    notes: '',
    lottery_selections: [],
    number_types: [],
  });

  const CURRENCIES = [
    { code: '$', name: 'USD', display: 'USD $' },
    { code: '€', name: 'EURO', display: 'EURO €' },
    { code: 'Cg', name: 'XCG', display: 'XCG Cg' }
  ];

  // Lottery options from admin configuration
  const [availableLotteries, setAvailableLotteries] = useState([]);
  const [lotterySearch, setLotterySearch] = useState('');
  const [showAllLotteries, setShowAllLotteries] = useState(false);
  const INITIAL_LOTTERY_COUNT = 8;

  // Phone validation state
  const [phoneError, setPhoneError] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const NUMBER_TYPE_OPTIONS = [
    '4 digits',
    '3 digits',
    '2 digits'
  ];

  const COUNTRY_CODES = COUNTRY_DATA;

  const [numbers, setNumbers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  
  // Searchable Country Dropdown State
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = COUNTRY_DATA.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  const selectedCountry = COUNTRY_DATA.find(c => c.code === formData.country_code) || COUNTRY_DATA[0];
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCountryDropdownOpen && !event.target.closest('.country-dropdown-container')) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCountryDropdownOpen]);

  const [lotteryTypes, setLotteryTypes] = useState([]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await api.get('/lottery-types?active_only=1');
        setLotteryTypes(response.data);
        setAvailableLotteries(response.data.map(t => t.name));
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, lottery_type: response.data[0].name }));
        }
      } catch (error) {
        console.error('Failed to fetch lottery types', error);
        // Fallback
        const fallback = [{ name: 'Daily' }, { name: 'Weekly' }, { name: 'Special' }];
        setLotteryTypes(fallback);
        setAvailableLotteries(fallback.map(t => t.name));
      }
    };
    fetchTypes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone input
    if (name === 'phone') {
      // Allow only digits, spaces, hyphens, parentheses, and + for country code part
      // But since country_code is separate, we only allow digits and formatting chars
      const sanitized = value.replace(/[^0-9\s\-()]/g, '');
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
      validatePhone(sanitized);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Phone validation function
  const validatePhone = (phoneValue) => {
    const digitsOnly = phoneValue.replace(/\D/g, '');
    
    if (!digitsOnly) {
      setPhoneError('');
      setIsPhoneValid(false);
      return;
    }
    
    // Check for fake repeated numbers (all same digit)
    if (/^(.)\1+$/.test(digitsOnly)) {
      setPhoneError('Please enter a valid phone number');
      setIsPhoneValid(false);
      return;
    }
    
    // Check length
    if (digitsOnly.length < 7) {
      setPhoneError('Phone number must contain at least 7 digits');
      setIsPhoneValid(false);
      return;
    }
    
    if (digitsOnly.length > 15) {
      setPhoneError('Phone number must not exceed 15 digits');
      setIsPhoneValid(false);
      return;
    }
    
    setPhoneError('');
    setIsPhoneValid(true);
  };

  // Get sanitized phone (digits only) for submission
  const getSanitizedPhone = () => {
    return formData.phone.replace(/\D/g, '');
  };

  const handleLotterySelectionChange = (lottery) => {
    setFormData((prev) => {
      const current = prev.lottery_selections;
      const isSelected = current.includes(lottery);
      return {
        ...prev,
        lottery_selections: isSelected
          ? current.filter(l => l !== lottery)
          : [...current, lottery]
      };
    });
  };

  const handleNumberTypeChange = (type) => {
    setFormData((prev) => {
      const current = prev.number_types;
      const isSelected = current.includes(type);
      return {
        ...prev,
        number_types: isSelected
          ? current.filter(t => t !== type)
          : [...current, type]
      };
    });
  };


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

    // Validation: Phone
    const sanitizedPhone = getSanitizedPhone();
    if (!sanitizedPhone) {
      toast.error('Please enter your phone number');
      return;
    }
    if (sanitizedPhone.length < 7 || sanitizedPhone.length > 15) {
      toast.error('Phone number must contain 7–15 digits');
      return;
    }
    // Check for fake repeated numbers
    if (/^(.)\1+$/.test(sanitizedPhone)) {
      toast.error('Please enter a valid phone number');
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

    // Validation: Lottery Selections
    if (formData.lottery_selections.length === 0) {
      toast.error('Please select at least one lottery');
      return;
    }

    // Validation: Number Types
    if (formData.number_types.length === 0) {
      toast.error('Please select at least one number type');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        phone: sanitizedPhone, // Send digits-only sanitized phone
        lottery_numbers: validNumbers,
        // currency: '$' // Default currency if needed by backend, or remove entirely
      };
      // Remove currency from submission as it's handled via WhatsApp
      delete dataToSubmit.currency;

      await api.post('/lottery-requests', dataToSubmit);

      setSubmittedData(dataToSubmit);
      setIsSubmitted(true);
      toast.success('Request submitted successfully!');

      // Reset form
      setFormData({
        name: '',
        country_code: '+1',
        phone: '',
        email: '',
        // currency: '$', // Commented out - not needed for current flow
        lottery_type: 'Daily',
        notes: '',
        lottery_selections: [],
        number_types: [],
      });
      setNumbers([]);
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.errors) {
        // Show the first validation error message
        const firstError = Object.values(errorData.errors)[0][0];
        toast.error(firstError);
      } else {
        toast.error(errorData?.message || 'Failed to submit request');
      }
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
              <div className="grid grid-cols-1 gap-6">
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
                  <div className="flex gap-3">
                    <div className="relative min-w-[120px] country-dropdown-container">
                      <div 
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-8 py-3 text-slate-900 font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer flex items-center gap-2 h-full"
                      >
                        <img 
                          src={`https://flagcdn.com/w40/${selectedCountry.iso.toLowerCase()}.png`} 
                          alt={selectedCountry.name}
                          className="w-5 h-auto rounded-sm shadow-sm"
                        />
                        <span className="text-sm">{selectedCountry.code}</span>
                      </div>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isCountryDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                  type="text"
                                  placeholder="Search country..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => (
                                  <div 
                                    key={`${country.name}-${country.code}`}
                                    onClick={() => {
                                      setFormData({ ...formData, country_code: country.code });
                                      setIsCountryDropdownOpen(false);
                                      setCountrySearch('');
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors ${formData.country_code === country.code ? 'bg-primary/10 text-primary' : 'text-slate-700'}`}
                                  >
                                    <img 
                                      src={`https://flagcdn.com/w40/${country.iso.toLowerCase()}.png`} 
                                      alt={country.name}
                                      className="w-6 h-auto rounded-sm shadow-sm"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">{country.name}</span>
                                      <span className="text-sm font-bold opacity-70 leading-none">{country.code}</span>
                                    </div>
                                    {formData.country_code === country.code && (
                                      <Check className="ml-auto" size={16} />
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="p-8 text-center text-slate-400">
                                  <p className="text-sm font-medium italic">No countries found</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="tel"
                        name="phone"
                        required
                        inputMode="numeric"
                        pattern="[0-9\s\-()]*"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 ${
                          phoneError 
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' 
                            : 'border-slate-200 focus:border-primary focus:ring-primary/10'
                        }`}
                        placeholder="1234567890"
                      />
                      {phoneError && (
                        <p className="text-[10px] text-rose-500 font-medium ml-1">{phoneError}</p>
                      )}
                    </div>
                  </div>
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

              {/* Lottery Selection Checkboxes */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  Select Lotteries <span className="text-rose-500">*</span>
                </label>
                
                {/* Lottery Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={lotterySearch}
                    onChange={(e) => setLotterySearch(e.target.value)}
                    placeholder="Search lotteries..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary transition-all"
                  />
                  {lotterySearch && (
                    <button
                      onClick={() => setLotterySearch('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableLotteries.length === 0 ? (
                    <p className="text-sm text-slate-400 col-span-full">Loading available lotteries...</p>
                  ) : (
                    (() => {
                      const filtered = availableLotteries.filter(l => 
                        l.toLowerCase().includes(lotterySearch.toLowerCase())
                      );
                      const displayLotteries = showAllLotteries || lotterySearch 
                        ? filtered 
                        : filtered.slice(0, INITIAL_LOTTERY_COUNT);
                      const hasMore = filtered.length > INITIAL_LOTTERY_COUNT && !lotterySearch;
                      
                      return (
                        <>
                          {displayLotteries.map((lottery) => (
                    <motion.button
                      key={lottery}
                      type="button"
                      onClick={() => handleLotterySelectionChange(lottery)}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        formData.lottery_selections.includes(lottery)
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          formData.lottery_selections.includes(lottery)
                            ? 'border-primary bg-primary'
                            : 'border-slate-300'
                        }`}>
                          {formData.lottery_selections.includes(lottery) && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className={`text-sm font-bold ${
                          formData.lottery_selections.includes(lottery) ? 'text-slate-900' : 'text-slate-600'
                        }`}>
                          {lottery.toUpperCase()}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                  
                  {/* Show More Button */}
                  {hasMore && !showAllLotteries && (
                    <motion.button
                      type="button"
                      onClick={() => setShowAllLotteries(true)}
                      whileTap={{ scale: 0.98 }}
                      className="relative p-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:border-primary hover:bg-primary/5 text-slate-500 hover:text-primary transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      <span className="text-sm font-bold">{filtered.length - INITIAL_LOTTERY_COUNT} more</span>
                    </motion.button>
                  )}
                        </>
                      );
                    })()
                  )}
                </div>
                
                {/* Show Less Button (when expanded) */}
                {showAllLotteries && availableLotteries.length > INITIAL_LOTTERY_COUNT && !lotterySearch && (
                  <button
                    type="button"
                    onClick={() => setShowAllLotteries(false)}
                    className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <ChevronDown size={16} className="rotate-180" /> Show less
                  </button>
                )}
                {formData.lottery_selections.length === 0 && (
                  <p className="text-[10px] text-rose-500 font-medium ml-1">Please select at least one lottery</p>
                )}
              </div>

              {/* Number Types Checkboxes */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  Number Types <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {NUMBER_TYPE_OPTIONS.map((type) => (
                    <motion.button
                      key={type}
                      type="button"
                      onClick={() => handleNumberTypeChange(type)}
                      whileTap={{ scale: 0.98 }}
                      className={`relative px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        formData.number_types.includes(type)
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          formData.number_types.includes(type)
                            ? 'border-primary bg-primary'
                            : 'border-slate-300'
                        }`}>
                          {formData.number_types.includes(type) && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className={`text-sm font-bold ${
                          formData.number_types.includes(type) ? 'text-slate-900' : 'text-slate-600'
                        }`}>
                          {type}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
                {formData.number_types.length === 0 && (
                  <p className="text-[10px] text-rose-500 font-medium ml-1">Please select at least one number type</p>
                )}
              </div>

              {/*
              // Currency Selection - Commented out as payment is handled separately via WhatsApp
              // Can be re-enabled if needed for future features
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  Preferred Currency
                </label>
                <div className="relative">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.display}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              */}

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
                  <span className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {submittedData?.lottery_selections?.join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                  <span className="text-sm text-slate-500 font-medium">Phone Number</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://flagcdn.com/w40/${COUNTRY_DATA.find(c => c.code === submittedData?.country_code)?.iso.toLowerCase()}.png`}
                      alt=""
                      className="w-4 h-auto rounded-sm"
                    />
                    <span className="text-sm font-black text-slate-900">{submittedData?.country_code} {submittedData?.phone}</span>
                  </div>
                </div>
                <div className="pb-3 border-b border-slate-200/50">
                  <span className="text-sm text-slate-500 font-medium block mb-2">Number Types</span>
                  <div className="flex flex-wrap gap-2">
                    {submittedData?.number_types?.map((type, i) => (
                      <span key={i} className="px-3 py-1.5 bg-secondary/10 border border-secondary/20 text-secondary text-sm font-bold rounded-xl">
                        {type}
                      </span>
                    ))}
                  </div>
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
