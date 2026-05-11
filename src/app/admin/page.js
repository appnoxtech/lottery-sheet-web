"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  LogOut, CheckCircle, Clock, Filter, Ticket,
  ChevronDown, Download, FileText, Table as TableIcon,
  FileSpreadsheet, CheckSquare, Square, Trash2, X,
  Search, Calendar, DollarSign, FilterX, Share2, Send, Mail, Plus, Languages, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AdminDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'users'
  const [isLoading, setIsLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [openShareId, setOpenShareId] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState({ platform: 'email', email: '', message: '', format: 'pdf' });
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [lotteryTypes, setLotteryTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);

  // Advanced Filters State
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    start_date: '',
    end_date: '',
    lottery_type: 'all'
  });

  // Currency Conversion State
  const [viewCurrency, setViewCurrency] = useState('original'); // 'original', 'USD', 'EUR', 'XCD'
  const [exchangeRates, setExchangeRates] = useState(null);
  const [isFetchingRates, setIsFetchingRates] = useState(false);

  const fetchRates = async () => {
    if (exchangeRates) return;
    setIsFetchingRates(true);
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      setExchangeRates(data.rates);
    } catch (error) {
      console.error('Failed to fetch rates', error);
      toast.error('Failed to fetch real-time exchange rates');
    } finally {
      setIsFetchingRates(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCurrencyMenuOpen && !event.target.closest('.currency-dropdown-container')) {
        setIsCurrencyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCurrencyMenuOpen]);

  const getCurrencySymbol = (code) => {
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'XCD') return 'Cg';
    return code;
  };

  const getCurrencyName = (code) => {
    if (code === 'USD') return 'USD';
    if (code === 'EUR') return 'EURO';
    if (code === 'XCD') return 'XCG';
    return code;
  };

  const convertAmount = (amount, fromCurrencyCode, toCurrencyCode) => {
    if (!exchangeRates || toCurrencyCode === 'original') return { amount, symbol: fromCurrencyCode };
    
    // Map internal codes to ISO codes for API
    const mapToIso = (code) => {
      if (code === '$') return 'USD';
      if (code === '€') return 'EUR';
      if (code === 'Cg') return 'XCD';
      return code;
    };

    const fromIso = mapToIso(fromCurrencyCode);
    const toIso = toCurrencyCode;

    if (!exchangeRates[fromIso] || !exchangeRates[toIso]) return { amount, symbol: fromCurrencyCode };

    const amountInUsd = amount / exchangeRates[fromIso];
    const converted = amountInUsd * exchangeRates[toIso];
    
    return { 
      amount: converted, 
      symbol: getCurrencySymbol(toIso),
      name: getCurrencyName(toIso)
    };
  };

  const superAdminEmail = 'master@example.com'; // Should match backend

  const fetchLotteryTypes = useCallback(async () => {
    try {
      const response = await api.get('/admin/lottery-types');
      setLotteryTypes(response.data);
    } catch (error) {
      toast.error('Failed to fetch lottery types');
    }
  }, []);

  const handleAddType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setIsAddingType(true);
    try {
      await api.post('/admin/lottery-types', { name: newTypeName });
      setNewTypeName('');
      fetchLotteryTypes();
      toast.success('Lottery type added successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.name?.[0] || error.response?.data?.message || 'Failed to add type';
      toast.error(errorMessage);
    } finally {
      setIsAddingType(false);
    }
  };

  const handleDeleteType = async (id) => {
    if (!confirm('Are you sure you want to delete this lottery type?')) return;
    try {
      await api.delete(`/admin/lottery-types/${id}`);
      fetchLotteryTypes();
      toast.success('Lottery type deleted');
    } catch (error) {
      toast.error('Failed to delete type');
    }
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/user');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user', error);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await api.get(`/admin/requests?${params.toString()}`);
      setRequests(response.data.data);
      setSelectedIds(new Set());
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
      } else {
        toast.error('Failed to fetch requests');
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, router]);

  const fetchPendingUsers = useCallback(async () => {
    setIsUserLoading(true);
    try {
      const response = await api.get('/admin/pending-users');
      setPendingUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch pending users', error);
    } finally {
      setIsUserLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    } else if (activeTab === 'users') {
      fetchPendingUsers();
    } else if (activeTab === 'settings') {
      fetchLotteryTypes();
    }
  }, [activeTab, fetchRequests, fetchPendingUsers, fetchLotteryTypes]);

  const handleApproveUser = async (id) => {
    try {
      await api.post(`/admin/users/${id}/approve`);
      toast.success('User approved successfully');
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      search: '',
      start_date: '',
      end_date: '',
      lottery_type: 'all'
    });
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('admin_token');
      router.push('/admin/login');
    }
  };

  const handleShare = (req, platform) => {
    const message = `Lottery Request Details:
-------------------
Name: ${req.name}
Email: ${req.email}
Phone: ${req.country_code} ${req.phone}
Numbers: ${req.lottery_numbers.join(', ')}
Lotteries: ${req.lottery_selections?.join(', ') || 'N/A'}
Number Types: ${req.number_types?.join(', ') || 'N/A'}
Type: ${req.lottery_type}
Status: ${req.status}
-------------------`;

    const encodedMessage = encodeURIComponent(message);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=Lottery Request Details - ${req.name}&body=${encodedMessage}`;
    }
  };

  const handleBulkShare = (platform) => {
    const selectedData = selectedIds.size > 0
      ? requests.filter(r => selectedIds.has(r.id))
      : requests;

    if (selectedData.length === 0) {
      toast.error('No requests selected to share');
      return;
    }

    let message = `Lottery Requests Summary (${selectedData.length} items):\n\n`;
    selectedData.forEach((req, idx) => {
      message += `${idx + 1}. ${req.name} | ${req.lottery_numbers.join(', ')} | ${req.lottery_type} | ${req.status}\n`;
    });
    message += `\nGenerated on: ${new Date().toLocaleString()}`;

    const encodedMessage = encodeURIComponent(message);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=Lottery Requests Summary (${selectedData.length} items)&body=${encodedMessage}`;
    }
  };

  const generateFileBlob = async (format) => {
    const data = getExportData();
    if (data.length === 0) return null;

    if (format === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.text("Lottery Requests Report", 14, 15);
      autoTable(doc, {
        startY: 22,
        head: [Object.keys(data[0])],
        body: data.map(Object.values),
        headStyles: { fillColor: [99, 102, 241] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      });
      return { blob: doc.output('blob'), extension: 'pdf' };
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return { blob: new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), extension: 'xlsx' };
    } else if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return { blob: new Blob([csv], { type: 'text/csv' }), extension: 'csv' };
    }
    return null;
  };

  const handleWhatsAppDirectShare = () => {
    const selectedData = selectedIds.size > 0
      ? requests.filter(r => selectedIds.has(r.id))
      : requests;

    if (selectedData.length === 0) {
      toast.error('No requests selected to share');
      return;
    }

    let message = `Lottery Requests Summary (${selectedData.length} items):\n\n`;
    selectedData.forEach((req, idx) => {
      message += `${idx + 1}. ${req.name} | ${req.lottery_numbers.join(', ')} | ${req.lottery_type} | ${req.status}\n`;
    });
    message += `\nGenerated on: ${new Date().toLocaleString()}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();

    if (shareModalData.platform === 'whatsapp') {
      const selectedData = selectedIds.size > 0
        ? requests.filter(r => selectedIds.has(r.id))
        : requests;

      let message = `${shareModalData.message ? shareModalData.message + '\n\n' : ''}Lottery Requests Summary (${selectedData.length} items):\n`;
      selectedData.forEach((req, idx) => {
        message += `${idx + 1}. ${req.name} | ${req.lottery_numbers.join(', ')} | ${req.lottery_type} | ${req.status}\n`;
      });

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
      setIsEmailModalOpen(false);
      return;
    }

    setIsSendingShare(true);

    try {
      const fileData = await generateFileBlob(shareModalData.format);
      if (!fileData) {
        toast.error('No data to generate attachment');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `lottery_requests_${timestamp}.${fileData.extension}`;

      const formData = new FormData();
      formData.append('email', shareModalData.email);
      formData.append('message', shareModalData.message);
      formData.append('file', fileData.blob, filename);

      await api.post('/admin/requests/share-email', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Email sent successfully!');
      setIsEmailModalOpen(false);
      setShareModalData({ ...shareModalData, email: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    } finally {
      setIsSendingShare(false);
    }
  };

  const handleProcess = async (id) => {
    console.log('Attempting to process request with ID:', id);
    if (!id) {
      toast.error('Invalid request ID');
      return;
    }

    // Temporary alert to confirm the button is working
    // window.alert('Processing request: ' + id);

    const processPromise = api.patch(`/admin/requests/${id}/process`, { status: 'processed' });

    toast.promise(processPromise, {
      loading: 'Updating status...',
      success: (response) => {
        setRequests(prevRequests => 
          prevRequests.map(req => 
            String(req.id) === String(id) ? { ...req, status: 'processed' } : req
          )
        );
        return 'Request marked as processed';
      },
      error: (err) => {
        console.error('Process error:', err);
        return err.response?.data?.message || 'Failed to update status';
      }
    });
  };

  // Selection Logic
  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length && requests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkProcess = async () => {
    if (selectedIds.size === 0) return;

    try {
      await api.patch('/admin/requests/bulk-status', {
        ids: Array.from(selectedIds),
        status: 'processed'
      });
      toast.success(`${selectedIds.size} requests marked as processed`);

      // Update local state
      setRequests(requests.map(req =>
        selectedIds.has(req.id) ? { ...req, status: 'processed' } : req
      ));
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to update requests');
    }
  };

  // Export Logic
  const getExportData = () => {
    const dataToExport = selectedIds.size > 0
      ? requests.filter(r => selectedIds.has(r.id))
      : requests;

    return dataToExport.map(r => ({
      'Date': new Date(r.created_at).toLocaleDateString(),
      'Name': r.name,
      'Email': r.email,
      'Phone': `${r.country_code} ${r.phone}`,
      'Numbers': r.lottery_numbers.join(', '),
      'Lotteries': r.lottery_selections?.join(', ') || '',
      'Number Types': r.number_types?.join(', ') || '',
      'Type': r.lottery_type,
      'Status': r.status,
      'Notes': r.notes || ''
    }));
  };

  const downloadFile = (data, filename, type) => {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    if (requests.length === 0) {
      toast.error('No data to export');
      return;
    }

    const data = getExportData();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `lottery_requests_${timestamp}`;

    try {
      if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        downloadFile(csv, `${filename}.csv`, 'text/csv');
      } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      } else if (format === 'pdf') {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.text("Lottery Requests Report", 14, 15);
        autoTable(doc, {
          startY: 22,
          head: [Object.keys(data[0])],
          body: data.map(Object.values),
          headStyles: { fillColor: [99, 102, 241] }, // Indigo-500
          alternateRowStyles: { fillColor: [249, 250, 251] },
        });
        doc.save(`${filename}.pdf`);
      }
      toast.success(`Exported ${data.length} records to ${format.toUpperCase()}`);
      setShowExportMenu(false);
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    }
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && v !== 'all').length;

  const isSuperAdmin = currentUser?.email === superAdminEmail;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="glass-panel sticky top-0 z-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-none bg-white/80">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Ticket className="text-primary" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">Lottery Admin</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-2 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-2 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Lottery Types
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-2 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-slate-900'}`}
              >
                Admins
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium border border-slate-200"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'requests' ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Requests Overview</h1>
                <p className="text-slate-500 mt-1">Manage and filter incoming lottery numbers</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Selection Info */}
                <AnimatePresence>
                  {selectedIds.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg"
                    >
                      <span className="text-primary text-sm font-medium">
                        {selectedIds.size} selected
                      </span>

                      <div className="h-4 w-[1px] bg-primary/20"></div>

                      {requests.some(r => selectedIds.has(r.id) && r.status === 'pending') && (
                        <button
                          onClick={handleBulkProcess}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm"
                        >
                          <CheckCircle size={14} /> Mark Processed
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-slate-500 hover:text-slate-900 transition-colors p-1"
                        title="Clear selection"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm font-semibold border ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Filter size={18} /> Filters {activeFilterCount > 0 && <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                </button>

                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowExportMenu(!showExportMenu);
                      setShowShareMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors text-sm font-semibold"
                  >
                    <Download size={18} /> Export <ChevronDown size={16} />
                  </button>

                  <AnimatePresence>
                    {showExportMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden"
                        >
                          <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <FileText size={16} className="text-blue-500" /> Download CSV
                          </button>
                          <button onClick={() => handleExport('xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <FileSpreadsheet size={16} className="text-green-600" /> Download Excel
                          </button>
                          <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <FileText size={16} className="text-red-500" /> Download PDF
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Share Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowShareMenu(!showShareMenu);
                      setShowExportMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:opacity-90 text-white transition-colors text-sm font-semibold shadow-lg shadow-primary/20"
                  >
                    <Share2 size={18} /> Share <ChevronDown size={16} />
                  </button>

                  <AnimatePresence>
                    {showShareMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)}></div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden"
                        >
                          <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Share Selected</div>

                          <button
                            onClick={() => {
                              setShowShareMenu(false);
                              handleWhatsAppDirectShare();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            <Send size={16} className="text-green-600" /> Share via WhatsApp
                          </button>

                          <button
                            onClick={() => {
                              setShareModalData({ ...shareModalData, platform: 'email' });
                              setIsEmailModalOpen(true);
                              setShowShareMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            <Mail size={16} className="text-blue-600" /> Share via Email
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Search */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search Customer</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={14} />
                          </div>
                          <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Name, Email, Phone..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                        <select
                          name="status"
                          value={filters.status}
                          onChange={handleFilterChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="processed">Processed</option>
                        </select>
                      </div>

                      {/* Date Start */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Calendar size={14} />
                          </div>
                          <input
                            type="date"
                            name="start_date"
                            value={filters.start_date}
                            onChange={handleFilterChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>

                      {/* Date End */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Calendar size={14} />
                          </div>
                          <input
                            type="date"
                            name="end_date"
                            value={filters.end_date}
                            onChange={handleFilterChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>

                      {/* Lottery Type */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lottery Type</label>
                        <select
                          name="lottery_type"
                          value={filters.lottery_type}
                          onChange={handleFilterChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                        >
                          <option value="all">All Types</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Special">Special</option>
                          <option value="Mega">Mega Jackpot</option>
                        </select>
                      </div>

                      {/* Clear Filters */}
                      <div className="flex items-end">
                        <button
                          onClick={clearFilters}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition-all"
                        >
                          <FilterX size={16} /> Reset All
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Data Table */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="py-5 px-6 w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                          checked={selectedIds.size === requests.length && requests.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(requests.map(r => r.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Numbers</th>
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="py-5 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" className="py-20 text-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary mx-auto"></div>
                          <p className="text-slate-400 mt-4 font-medium italic">Synchronizing lottery data...</p>
                        </td>
                      </tr>
                    ) : requests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-20 text-center">
                          <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Ticket size={36} className="text-slate-300" />
                          </div>
                          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">No Requests Found</h3>
                          <p className="text-slate-500 text-sm mt-1 max-w-[250px] mx-auto">We couldn't find any lottery requests matching your current filters.</p>
                          <button
                            onClick={() => setFilters({
                              status: 'all',
                              search: '',
                              start_date: '',
                              end_date: '',
                              lottery_type: 'all'
                            })}
                            className="mt-6 text-primary font-bold text-sm underline underline-offset-4 hover:text-primary-dark"
                          >
                            Reset all filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      requests.map((request, i) => (
                        <motion.tr
                          key={request.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`group hover:bg-slate-50/50 transition-all duration-300 ${selectedIds.has(request.id) ? 'bg-primary/5' : ''}`}
                        >
                          <td className="py-5 px-6">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer transition-all"
                              checked={selectedIds.has(request.id)}
                              onChange={() => toggleSelect(request.id)}
                            />
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{new Date(request.created_at).toLocaleDateString()}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{request.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium">{request.email}</span>
                              <span className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">{request.country_code} {request.phone}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                              {request.lottery_numbers.map((num, i) => (
                                <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg border border-slate-200/50 shadow-sm">
                                  {num}
                                </span>
                              ))}
                              {request.notes && (
                                <div className="w-full text-[10px] text-slate-400 mt-2 flex items-start gap-1 font-medium italic">
                                  <span className="text-primary not-italic font-black">Note:</span> {request.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            {request.lottery_type && (
                              <span className="text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg shadow-sm border bg-primary/10 text-primary border-primary/10">
                                {request.lottery_type}
                              </span>
                            )}
                          </td>
                          <td className="py-5 px-6">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border transition-all ${request.status === 'processed'
                              ? 'bg-green-50 text-green-600 border-green-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                              }`}>
                              {request.status === 'processed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                              {request.status}
                            </div>
                          </td>
                          <td className="py-5 px-6 text-right">
                            {request.status === 'pending' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcess(request.id);
                                }}
                                className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 border border-primary/20"
                              >
                                Process Now
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Pending Admin Approvals</h1>
              <p className="text-slate-500 mt-1">Review and approve new admin registrations</p>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registration Date</th>
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                      <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</th>
                      <th className="py-5 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isUserLoading ? (
                      <tr>
                        <td colSpan="4" className="py-12 text-center text-slate-400">
                          <div className="flex justify-center items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
                            <span className="text-sm font-bold italic">Checking credentials...</span>
                          </div>
                        </td>
                      </tr>
                    ) : pendingUsers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                              <CheckCircle size={48} className="text-green-500" />
                            </div>
                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight">Queue Empty</p>
                            <p className="text-slate-500 text-sm font-medium">All registered administrators have been approved.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pendingUsers.map((user, i) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group hover:bg-slate-50/80 transition-all duration-300"
                        >
                          <td className="py-5 px-6 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-900">
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{user.name}</div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="text-sm text-slate-500 font-medium">{user.email}</div>
                          </td>
                          <td className="py-5 px-6 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 border border-green-700/10"
                            >
                              Approve Admin
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lottery Type Customization</h1>
              <p className="text-slate-500 mt-1 font-medium">Manage the lottery types available on the customer landing page.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Plus size={16} className="text-primary" /> Add New Lottery Type
              </h3>
              <form onSubmit={handleAddType} className="flex gap-4">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Daily, Weekly, Mega Jackpot..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400 font-bold"
                />
                <button
                  type="submit"
                  disabled={isAddingType || !newTypeName.trim()}
                  className="bg-primary hover:opacity-90 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isAddingType ? 'Adding...' : <><Plus size={18} /> Add Type</>}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl">
              <div className="p-8 pb-0">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Ticket size={16} className="text-primary" /> Active Lottery Types
                </h3>
              </div>
              <div className="p-8 pt-4">
                <div className="grid grid-cols-1 gap-3">
                  {lotteryTypes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium italic">
                      No lottery types defined yet.
                    </div>
                  ) : (
                    lotteryTypes.map((type, i) => (
                      <motion.div
                        key={type.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                            <Ticket size={20} />
                          </div>
                          <span className="font-black text-slate-900 uppercase tracking-wider">{type.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteType(type.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Email Share Modal */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEmailModalOpen(false)}
              className="absolute inset-0 bg-white/60 backdrop-blur-md"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Share via Email</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Send report with an attachment</p>
                  </div>
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleShareSubmit} className="space-y-8">
                  {/* Format Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">1. Choose Attachment Format</label>
                    <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-100 rounded-[2rem] border border-slate-200">
                      {['pdf', 'xlsx', 'csv'].map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setShareModalData({ ...shareModalData, format: fmt })}
                          className={`py-3 rounded-[1.5rem] transition-all text-xs font-black uppercase tracking-widest ${shareModalData.format === fmt
                            ? 'bg-white text-primary shadow-lg'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                          {fmt === 'xlsx' ? 'Excel' : fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">2. Delivery Details</label>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        value={shareModalData.email}
                        onChange={(e) => setShareModalData({ ...shareModalData, email: e.target.value })}
                        placeholder="recipient@example.com"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] pl-14 pr-4 py-4 text-slate-900 focus:outline-none focus:border-primary transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="relative">
                      <textarea
                        value={shareModalData.message}
                        onChange={(e) => setShareModalData({ ...shareModalData, message: e.target.value })}
                        placeholder="Include a message with the attached file..."
                        rows="3"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-5 py-4 text-slate-900 focus:outline-none focus:border-primary transition-all resize-none placeholder:text-slate-400"
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-5 rounded-[2rem] border-2 bg-primary/5 border-primary/10">
                    <div className={`p-3.5 rounded-2xl ${shareModalData.format === 'pdf' ? 'bg-red-100 text-red-500' :
                      shareModalData.format === 'xlsx' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                      {shareModalData.format === 'pdf' ? <FileText size={24} /> : <FileSpreadsheet size={24} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900">lottery_requests_{new Date().toISOString().split('T')[0]}.{shareModalData.format}</div>
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                        Document will be attached to the email
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingShare}
                    className="w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl bg-primary hover:opacity-90 text-white shadow-primary/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSendingShare ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-4 border-white/20 border-t-white"></div>
                    ) : (
                      <>
                        <Mail size={20} /> Send via Email
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
