import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Minus, UserPlus, ArrowLeft, Trash2, Upload, ArrowUpDown, ArrowUp, ArrowDown, Settings, Code, Copy, Check, Shield, UserX, Lock, Download, HelpCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

const ClassDetails: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState({ name: '', email: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'total', direction: 'desc' });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ publicSlug: '', isPublic: true });

  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [embedConfig, setEmbedConfig] = useState({ width: '100%', height: '600px' });
  const [isCopied, setIsCopied] = useState(false);

  const updateSettingsMutation = useMutation({
      mutationFn: async (data: { publicSlug: string; isPublic: boolean }) => {
          return api.patch(`/classes/${id}`, data);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['class', id] });
          setIsSettingsOpen(false);
          alert('Settings updated successfully');
      },
      onError: (err: any) => {
          alert('Failed to update: ' + (err.response?.data?.message || err.message));
      }
  });

  const handleSettingsSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateSettingsMutation.mutate(settingsForm);
  };

  const [adjustData, setAdjustData] = useState<{
    isOpen: boolean;
    studentId: string;
    studentName: string;
    delta: number;
    reason: string;
  }>({
    isOpen: false,
    studentId: '',
    studentName: '',
    delta: 0,
    reason: '',
  });

  const [bulkAdjustData, setBulkAdjustData] = useState<{
      isOpen: boolean;
      mode: 'add' | 'remove';
      delta: number;
      reason: string;
  }>({
      isOpen: false,
      mode: 'add',
      delta: 0,
      reason: '',
  });

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', id],
    queryFn: async () => {
      const res = await api.get(`/classes/${id}/leaderboard`);
      return res.data.data;
    },
  });

  const { data: classDetails } = useQuery({
      queryKey: ['class', id],
      queryFn: async () => {
          const res = await api.get(`/classes/${id}`);
          return res.data.data;
      }
  })

  // Update Settings Form when data loads
  React.useEffect(() => {
      if (classDetails) {
          setSettingsForm({
              publicSlug: classDetails.publicSlug,
              isPublic: classDetails.isPublic ?? true
          });
      }
  }, [classDetails]);

  const enrollMutation = useMutation({
    mutationFn: async (data: { studentName: string; studentEmail: string }) => {
      return api.post(`/classes/${id}/enroll`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
      setIsEnrolling(false);
      setEnrollData({ name: '', email: '' });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (students: any[]) => {
      return api.post(`/classes/${id}/import`, { students });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
      setIsImporting(false);
      setImportFile(null);
      alert('Students imported successfully');
    },
    onError: (err: any) => {
        alert('Failed to import: ' + (err.response?.data?.message || err.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return api.delete(`/classes/${id}/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      return api.post(`/classes/${id}/students/bulk-delete`, { studentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
      setSelectedStudents(new Set());
    },
  });

  const bulkAdjustMutation = useMutation({
    mutationFn: async ({ studentIds, delta, reason }: { studentIds: string[]; delta: number; reason: string }) => {
      return api.post(`/classes/${id}/points/bulk`, { studentIds, delta, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
      setSelectedStudents(new Set());
      setBulkAdjustData(prev => ({ ...prev, isOpen: false }));
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: async ({ studentId, delta, reason }: { studentId: string; delta: number; reason: string }) => {
      return api.post(`/classes/${id}/points`, { studentId, delta, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
    },
  });

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    enrollMutation.mutate({ studentName: enrollData.name, studentEmail: enrollData.email });
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const text = await importFile.text();
    const lines = text.split('\n');
    const students: any[] = [];
    
    // Simple CSV Parser for handling quotes
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols: string[] = [];
        let inQuote = false;
        let current = '';
        
        for (let char of line) {
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                cols.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        cols.push(current);

        const clean = (s: string) => s?.trim().replace(/^"|"$/g, '');
        
        // Expected ID, Name, Email (according to user file)
        if (cols.length >= 3) {
            students.push({
                nim: clean(cols[0]),
                name: clean(cols[1]), 
                email: clean(cols[2])
            });
        }
    }

    if (students.length === 0) {
        alert("No valid students found in CSV");
        return;
    }

    importMutation.mutate(students);
  };

  const handleDelete = (studentId: string, name: string) => {
      if (confirm(`Are you sure you want to remove ${name} from this class? This action cannot be undone.`)) {
          deleteMutation.mutate(studentId);
      }
  };

  const handleBulkDelete = () => {
      if (selectedStudents.size === 0) return;
      if (confirm(`Are you sure you want to remove ${selectedStudents.size} students?`)) {
          bulkDeleteMutation.mutate(Array.from(selectedStudents));
      }
  }

  const openBulkAdjust = (mode: 'add' | 'remove') => {
      setBulkAdjustData({
          isOpen: true,
          mode,
          delta: mode === 'add' ? 10 : -10,
          reason: ''
      });
  };

  const handleConfirmBulkAdjust = (e: React.FormEvent) => {
      e.preventDefault();
      if (!bulkAdjustData.reason.trim()) return;
      
      bulkAdjustMutation.mutate({
          studentIds: Array.from(selectedStudents),
          delta: bulkAdjustData.delta,
          reason: bulkAdjustData.reason
      });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === (leaderboard?.length || 0)) {
        setSelectedStudents(new Set());
    } else {
        setSelectedStudents(new Set(leaderboard?.map((s: any) => s.studentId)));
    }
  };

  const toggleSelect = (studentId: string) => {
      const newSet = new Set(selectedStudents);
      if (newSet.has(studentId)) {
          newSet.delete(studentId);
      } else {
          newSet.add(studentId);
      }
      setSelectedStudents(newSet);
  };

  const handleSort = (key: string) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const copyEmbedCode = () => {
    const code = `<iframe src="${window.location.origin}/p/${classDetails?.publicSlug}" width="${embedConfig.width}" height="${embedConfig.height}" style="border:none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></iframe>`;
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const sortedLeaderboard = React.useMemo(() => {
      if (!leaderboard) return [];
      return [...leaderboard].sort((a, b) => {
          let aVal: any = a[sortConfig.key];
          let bVal: any = b[sortConfig.key];
          
          if (sortConfig.key === 'name') {
              aVal = a.student.name.toLowerCase();
              bVal = b.student.name.toLowerCase();
          }

          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [leaderboard, sortConfig]);

  const openAdjustModal = (studentId: string, studentName: string, delta: number) => {
    setAdjustData({
      isOpen: true,
      studentId,
      studentName,
      delta,
      reason: '',
    });
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustData.reason.trim()) return;
    
    adjustPointsMutation.mutate({ 
      studentId: adjustData.studentId, 
      delta: adjustData.delta, 
      reason: adjustData.reason 
    });
    setAdjustData(prev => ({ ...prev, isOpen: false }));
  };

  const [newAssistant, setNewAssistant] = useState({ name: '', email: '', password: '' });

  const addAssistantMutation = useMutation({
      mutationFn: async (data: any) => {
          return api.post(`/classes/${id}/assistants`, data);
      },
      onSuccess: () => {
           queryClient.invalidateQueries({ queryKey: ['class', id] });
           setNewAssistant({ name: '', email: '', password: '' });
           alert('Assistant added successfully');
      },
      onError: (err: any) => alert(err.response?.data?.message || 'Failed to add assistant')
  });

  const removeAssistantMutation = useMutation({
      mutationFn: async (userId: string) => {
          return api.delete(`/classes/${id}/assistants/${userId}`);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['class', id] });
      },
      onError: (err: any) => alert(err.response?.data?.message || 'Failed to remove assistant')
  });

  const handleAddAssistant = (e: React.FormEvent) => {
      e.preventDefault();
      addAssistantMutation.mutate(newAssistant);
  };

  const handleExport = () => {
      if (!leaderboard || leaderboard.length === 0) {
          alert("No data to export");
          return;
      }
      
      const headers = ["User ID,User Name,Email Address,Points"];
      const rows = leaderboard.map((entry: any) => {
          const safeName = entry.student.name.replace(/"/g, '""');
          return `${entry.studentId},"${safeName}",${entry.student.email},${entry.total}`;
      });
      
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leaderboard_export_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin mb-4" />
        <p className="text-[#8E8E93] font-medium">Loading Class Details...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20 font-sans text-[#1C1C1E]">
      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-30 border-b border-[#000000]/[0.05] bg-white/70 px-4 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
             <Link 
                to="/dashboard" 
                className="group flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
            >
                <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">{classDetails?.name || 'Class Details'}</h1>
              <div className="flex items-center gap-2 text-[13px] text-[#8E8E93]">
                 <span>Public Link:</span>
                 <a href={`/p/${classDetails?.publicSlug}`} target="_blank" rel="noreferrer" className="font-medium text-[#007AFF] hover:underline">
                      /p/{classDetails?.publicSlug}
                 </a>
                 {!classDetails?.isPublic && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                        <Lock className="h-3 w-3" /> Private
                    </span>
                 )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
             <button
              onClick={() => setIsHelpOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-[#1C1C1E] shadow-sm ring-1 ring-[#D1D1D6] transition-all hover:bg-[#F2F2F7] active:scale-95"
            >
              <HelpCircle className="h-4 w-4 text-[#8E8E93]" /> Help
            </button>
             <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-[#1C1C1E] shadow-sm ring-1 ring-[#D1D1D6] transition-all hover:bg-[#F2F2F7] active:scale-95"
            >
              <Settings className="h-4 w-4 text-[#8E8E93]" /> Settings
            </button>
             <button
              onClick={() => setIsEmbedOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-[#1C1C1E] shadow-sm ring-1 ring-[#D1D1D6] transition-all hover:bg-[#F2F2F7] active:scale-95"
            >
              <Code className="h-4 w-4 text-[#8E8E93]" /> Embed
            </button>
            <div className="h-6 w-px bg-[#D1D1D6] mx-1 hidden sm:block"></div>
            {selectedStudents.size > 0 ? (
                <>
                    <button
                        onClick={() => openBulkAdjust('add')}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#34C759] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#32B357] active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> Add ({selectedStudents.size})
                    </button>
                    <button
                        onClick={() => openBulkAdjust('remove')}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#FF9500] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#E08600] active:scale-95"
                    >
                        <Minus className="h-4 w-4" /> Penalty ({selectedStudents.size})
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#FF3B30] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#D6342B] active:scale-95"
                    >
                        <Trash2 className="h-4 w-4" /> Delete ({selectedStudents.size})
                    </button>
                </>
            ) : (
                <>
                    <button
                        onClick={() => setIsImporting(!isImporting)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-[#1C1C1E] shadow-sm ring-1 ring-[#D1D1D6] transition-all hover:bg-[#F2F2F7] active:scale-95"
                    >
                        <Upload className="h-4 w-4 text-[#8E8E93]" /> Import CSV
                    </button>
                    <button
                        onClick={() => setIsEnrolling(!isEnrolling)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#007AFF] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] active:scale-95"
                    >
                        <UserPlus className="h-4 w-4" /> Enroll Student
                    </button>
                </>
            )}
            <button
              onClick={handleExport}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-[#1C1C1E] shadow-sm ring-1 ring-[#D1D1D6] transition-all hover:bg-[#F2F2F7] active:scale-95"
            >
              <Download className="h-4 w-4 text-[#8E8E93]" /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Import Panel */}
        {isImporting && (
           <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5 animate-in slide-in-from-top-4 duration-300">
            <div className="border-b border-[#F2F2F7] px-6 py-4">
                <h3 className="text-lg font-bold text-[#1C1C1E]">Import Students</h3>
                <p className="text-[13px] text-[#8E8E93]">Upload a CSV to bulk enroll students.</p>
            </div>
            <div className="p-6">
                <div className="mb-6 rounded-xl bg-[#F2F2F7] p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Expected CSV Format</p>
                    <div className="font-mono text-xs text-[#1C1C1E] bg-white p-3 rounded-lg border border-[#E5E5EA] overflow-x-auto">
                        "First name","Last name","Email address",Groups<br/>
                        0706022410004,"Cecilia Agusta Leo",cagustaleo@student.ciputra.ac.id,
                    </div>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-[#1C1C1E]">Select File</label>
                        <input 
                            type="file" 
                            accept=".csv"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-[#8E8E93]
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-xs file:font-bold
                            file:bg-[#F2F2F7] file:text-[#007AFF]
                            hover:file:bg-[#E5E5EA] cursor-pointer"
                        />
                    </div>
                    <div className="flex gap-3">
                         <a 
                            href={`data:text/csv;charset=utf-8,${encodeURIComponent('"First name","Last name","Email address",Groups\n0706022410033,"Alvon Hindarmawan",ahindarmawan@student.ciputra.ac.id,\n0706022410026,"Casey Daniella Winarto",cdaniella@student.ciputra.ac.id,')}`} 
                            download="import_template.csv"
                            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-[13px] font-semibold text-[#007AFF] bg-[#F2F2F7] hover:bg-[#E5E5EA] transition-colors"
                        >
                            <Upload className="mr-2 h-4 w-4" /> Template
                        </a>
                        <button
                            type="button"
                            onClick={handleFileUpload}
                            disabled={!importFile || importMutation.isPending}
                            className="inline-flex items-center justify-center rounded-lg bg-[#007AFF] px-6 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {importMutation.isPending ? 'Importing...' : 'Upload & Import'}
                        </button>
                    </div>
                </div>
            </div>
           </div>
        )}

        {/* Enroll Panel */}
        {isEnrolling && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5 animate-in slide-in-from-top-4 duration-300">
            <div className="border-b border-[#F2F2F7] px-6 py-4">
                <h3 className="text-lg font-bold text-[#1C1C1E]">Enroll New Student</h3>
            </div>
            <div className="p-6">
                <form onSubmit={handleEnroll} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-[#1C1C1E]">Full Name</label>
                    <input
                        placeholder="John Doe"
                        className="w-full rounded-lg border-0 bg-[#F2F2F7] px-4 py-2.5 text-[15px] font-medium text-[#1C1C1E] placeholder:text-[#8E8E93] focus:ring-2 focus:ring-[#007AFF] transition-all"
                        value={enrollData.name}
                        onChange={(e) => setEnrollData({ ...enrollData, name: e.target.value })}
                        required
                    />
                </div>
                <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-[#1C1C1E]">Email Address</label>
                    <input
                        placeholder="john@example.com"
                        type="email"
                        className="w-full rounded-lg border-0 bg-[#F2F2F7] px-4 py-2.5 text-[15px] font-medium text-[#1C1C1E] placeholder:text-[#8E8E93] focus:ring-2 focus:ring-[#007AFF] transition-all"
                        value={enrollData.email}
                        onChange={(e) => setEnrollData({ ...enrollData, email: e.target.value })}
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={enrollMutation.isPending}
                    className="h-[46px] rounded-lg bg-[#007AFF] px-8 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] active:scale-95"
                >
                    Enroll
                </button>
                </form>
            </div>
          </div>
        )}

        {/* Leaderboard Table (Apple Settings Style) */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-[#F2F2F7]/50 border-b border-[#E5E5EA]">
                <tr>
                    <th className="px-6 py-3 w-4">
                        <input 
                            type="checkbox"
                            className="rounded h-4 w-4 border-[#C7C7CC] text-[#007AFF] focus:ring-[#007AFF]"
                            checked={leaderboard?.length > 0 && selectedStudents.size === leaderboard?.length}
                            onChange={toggleSelectAll}
                        />
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Rank</th>
                    <th 
                        className="group cursor-pointer px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] transition-colors hover:bg-gray-50"
                        onClick={() => handleSort('name')}
                    >
                        <div className="flex items-center gap-1">
                            Student
                            <div className="text-[#C7C7CC] group-hover:text-[#8E8E93]">
                                {sortConfig.key === 'name' ? (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>
                                ) : <ArrowUpDown className="h-3 w-3"/>}
                            </div>
                        </div>
                    </th>
                    <th 
                        className="group cursor-pointer px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] transition-colors hover:bg-gray-50"
                        onClick={() => handleSort('total')}
                    >
                        <div className="flex items-center justify-end gap-1">
                            Points
                            <div className="text-[#C7C7CC] group-hover:text-[#8E8E93]">
                                {sortConfig.key === 'total' ? (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>
                                ) : <ArrowUpDown className="h-3 w-3"/>}
                            </div>
                        </div>
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA] bg-white">
                {sortedLeaderboard.map((entry: any, index: number) => (
                    <tr 
                        key={entry.studentId} 
                        className={`group transition-colors ${selectedStudents.has(entry.studentId) ? 'bg-[#F2F2F7]' : 'hover:bg-[#F2F2F7]/50'}`}
                    >
                    <td className="px-6 py-4">
                        <input 
                            type="checkbox"
                            className="rounded h-4 w-4 border-[#C7C7CC] text-[#007AFF] focus:ring-[#007AFF]"
                            checked={selectedStudents.has(entry.studentId)}
                            onChange={() => toggleSelect(entry.studentId)}
                        />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-[15px] font-semibold text-[#1C1C1E] tabular-nums">
                        {entry.total === 0 && !entry.hasNegativeHistory ? <span className="text-[#C7C7CC]">-</span> : index + 1}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[15px] font-medium text-[#1C1C1E]">{entry.student.name}</span>
                                    {entry.badges?.includes('TOP_1') && <span title="Top #1" className="cursor-help text-lg drop-shadow-sm">🥇</span>}
                                    {entry.badges?.includes('MOST_IMPROVED') && <span title="Most Improved This Week" className="cursor-help text-lg drop-shadow-sm">🔥</span>}
                                    {entry.badges?.includes('BIGGEST_CLIMBER') && <span title="Biggest Rank Climber" className="cursor-help text-lg drop-shadow-sm">📈</span>}
                                </div>
                                <div className="text-[13px] text-[#8E8E93]">{entry.student.email}</div>
                            </div>
                        </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold tabular-nums ${entry.total > 0 ? 'bg-[#34C759]/10 text-[#34C759]' : entry.total < 0 ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-[#E5E5EA] text-[#8E8E93]'}`}>
                            {entry.total > 0 && '+'}{entry.total}
                        </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => openAdjustModal(entry.studentId, entry.student.name, 10)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34C759]/10 text-[#34C759] transition-colors hover:bg-[#34C759]/20"
                            title="Add points"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => openAdjustModal(entry.studentId, entry.student.name, -10)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9500]/10 text-[#FF9500] transition-colors hover:bg-[#FF9500]/20"
                            title="Penalty"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <div className="h-4 w-px bg-[#E5E5EA]"></div>
                        <button 
                            onClick={() => handleDelete(entry.studentId, entry.student.name)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[#8E8E93] transition-colors hover:bg-[#FF3B30] hover:text-white"
                            title="Remove Student"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
          {leaderboard?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2F2F7]">
                      <UserPlus className="h-8 w-8 text-[#C7C7CC]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1C1C1E]">No students enrolled</h3>
                  <p className="max-w-xs text-[13px] text-[#8E8E93]">Get started by importing a CSV file or enrolling students manually.</p>
              </div>
          )}
        </div>


        {/* Assistants Management (Admin Only visual check, backend protected too) */}
        {classDetails?.assistants && (
            <div className="mt-8 rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
                <h3 className="mb-1 text-lg font-bold text-[#1C1C1E]">Teaching Assistants</h3>
                <p className="mb-6 text-[13px] text-[#8E8E93]">Manage assistants who can help grade the leaderboard.</p>
                
                <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                         {user?.role !== 'STUDENT_ASSISTANT' && (
                            <form onSubmit={handleAddAssistant} className="rounded-xl bg-[#F2F2F7] p-5">
                                <h4 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[#8E8E93]">Add New Assistant</h4>
                                <div className="space-y-3">
                                    <input
                                        placeholder="Full Name"
                                        className="w-full rounded-lg border-0 bg-white px-3 py-2 text-[15px] shadow-sm focus:ring-2 focus:ring-[#007AFF]"
                                        value={newAssistant.name}
                                        onChange={(e) => setNewAssistant({ ...newAssistant, name: e.target.value })}
                                        required
                                    />
                                    <input
                                        placeholder="Email Address"
                                        type="email"
                                        className="w-full rounded-lg border-0 bg-white px-3 py-2 text-[15px] shadow-sm focus:ring-2 focus:ring-[#007AFF]"
                                        value={newAssistant.email}
                                        onChange={(e) => setNewAssistant({ ...newAssistant, email: e.target.value })}
                                        required
                                    />
                                    <input
                                        placeholder="Password (min 8 chars)"
                                        type="password"
                                        className="w-full rounded-lg border-0 bg-white px-3 py-2 text-[15px] shadow-sm focus:ring-2 focus:ring-[#007AFF]"
                                        value={newAssistant.password}
                                        onChange={(e) => setNewAssistant({ ...newAssistant, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={addAssistantMutation.isPending}
                                        className="w-full rounded-lg bg-[#007AFF] py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#0062CC] active:scale-95"
                                    >
                                        Add Assistant
                                    </button>
                                </div>
                            </form>
                         )}
                    </div>
                    <div>
                         <h4 className="mb-3 ml-1 text-[13px] font-bold uppercase tracking-wider text-[#8E8E93]">Current Assistants</h4>
                         <ul className="space-y-2">
                            {classDetails?.assistants?.map((assistant: any) => (
                            <li key={assistant.userId} className="flex items-center justify-between rounded-xl bg-white p-3 ring-1 ring-black/5">
                                <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93]">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[15px] font-semibold text-[#1C1C1E]">{assistant.name}</p>
                                    <p className="text-[13px] text-[#8E8E93]">{assistant.email}</p>
                                </div>
                                </div>
                                {user?.role !== 'STUDENT_ASSISTANT' && (
                                    <button
                                    onClick={() => removeAssistantMutation.mutate(assistant.userId)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93] hover:bg-[#FF3B30] hover:text-white transition-colors"
                                    title="Remove Assistant"
                                    >
                                    <UserX className="h-4 w-4" />
                                    </button>
                                )}
                            </li>
                            ))}
                            {classDetails?.assistants?.length === 0 && (
                                <li className="px-4 text-[13px] text-[#8E8E93] italic">No assistants assigned yet.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in" onClick={() => setIsHelpOpen(false)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] bg-[#F2F2F7]/80 px-6 py-4 backdrop-blur-xl">
                <h3 className="text-[17px] font-semibold text-[#1C1C1E] flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-[#007AFF]" /> Leaderboard Guide
                </h3>
                <button 
                    onClick={() => setIsHelpOpen(false)} 
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E5EA] text-[#8E8E93] hover:bg-[#D1D1D6] hover:text-[#1C1C1E] transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                    <div>
                        <h4 className="mb-3 text-[15px] font-semibold text-[#1C1C1E]">1. Managing Students</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-[#F2F2F7] p-4">
                                <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#007AFF] text-white">
                                    <UserPlus className="h-4 w-4" />
                                </span>
                                <h5 className="font-semibold text-[#1C1C1E]">Enroll Student</h5>
                                <p className="mt-1 text-[13px] text-[#8E8E93]">Add a single student manually using their Name and Email address.</p>
                            </div>
                            <div className="rounded-xl bg-[#F2F2F7] p-4">
                                <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                                    <Upload className="h-4 w-4 text-[#1C1C1E]" />
                                </span>
                                <h5 className="font-semibold text-[#1C1C1E]">Import CSV</h5>
                                <p className="mt-1 text-[13px] text-[#8E8E93]">Bulk enroll students by uploading a CSV file. Use the "Template" button to see the format.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-3 text-[15px] font-semibold text-[#1C1C1E]">2. Scoring</h4>
                        <ul className="space-y-3 rounded-xl border border-[#E5E5EA] p-4">
                             <li className="flex gap-3 text-[14px] text-[#1C1C1E]">
                                <div className="mt-1 h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#34C759]/10 text-[#34C759] flex">
                                    <Plus className="h-3 w-3" />
                                </div>
                                <span><span className="font-semibold">Award Points:</span> Hover over a student row and click the (+) button to award points.</span>
                            </li>
                             <li className="flex gap-3 text-[14px] text-[#1C1C1E]">
                                <div className="mt-1 h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#FF3B30]/10 text-[#FF3B30] flex">
                                    <Minus className="h-3 w-3" />
                                </div>
                                <span><span className="font-semibold">Penalty:</span> Use the (-) button to deduct points for infractions or missed deadlines.</span>
                            </li>
                            <li className="flex gap-3 text-[14px] text-[#1C1C1E]">
                                <div className="mt-1 h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#007AFF]/10 text-[#007AFF] flex">
                                    <Check className="h-3 w-3" />
                                </div>
                                <span><span className="font-semibold">Bulk Actions:</span> Select multiple students using the checkboxes to apply points to the whole group at once.</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-3 text-[15px] font-semibold text-[#1C1C1E]">3. Sharing & Data</h4>
                         <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-[#E5E5EA] p-3">
                                <div className="font-semibold text-[#1C1C1E] text-[13px] flex items-center gap-2 mb-1">
                                    <Download className="h-3.5 w-3.5" /> Export
                                </div>
                                <p className="text-[12px] text-[#8E8E93]">Download the current leaderboard as a CSV file for grading.</p>
                            </div>
                            <div className="rounded-xl border border-[#E5E5EA] p-3">
                                <div className="font-semibold text-[#1C1C1E] text-[13px] flex items-center gap-2 mb-1">
                                    <Code className="h-3.5 w-3.5" /> Embed
                                </div>
                                <p className="text-[12px] text-[#8E8E93]">Get an iframe code to display this leaderboard on Moodle or Canvas.</p>
                            </div>
                             <div className="rounded-xl border border-[#E5E5EA] p-3">
                                <div className="font-semibold text-[#1C1C1E] text-[13px] flex items-center gap-2 mb-1">
                                    <Settings className="h-3.5 w-3.5" /> Settings
                                </div>
                                <p className="text-[12px] text-[#8E8E93]">Change the public "Slug" URL or make the leaderboard private.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal - Apple Standard Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 scale-100">
             <div className="bg-[#F2F2F7]/80 px-4 py-3 border-b border-[#E5E5EA] flex justify-between items-center backdrop-blur-xl">
                 <h3 className="text-[17px] font-semibold text-[#1C1C1E]">Class Settings</h3>
                 <button onClick={() => setIsSettingsOpen(false)} className="rounded-full bg-[#E5E5EA] p-1 text-[#8E8E93] hover:bg-[#D1D1D6]">
                    <Check className="h-4 w-4 rotate-45" />
                 </button>
             </div>
             
             <form onSubmit={handleSettingsSave} className="p-0">
                <div className="p-4 space-y-4">
                    <div className="rounded-xl bg-[#F2F2F7] p-2">
                        <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm">
                            <span className="text-[15px] font-medium text-[#1C1C1E]">Public Access</span>
                            <div className="relative inline-block w-[51px] align-middle select-none transition duration-200 ease-in">
                                <input 
                                    type="checkbox" 
                                    checked={settingsForm.isPublic}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, isPublic: e.target.checked })}
                                    className="peer absolute block w-6 h-6 rounded-full bg-white border-0 appearance-none cursor-pointer shadow-sm transition-all duration-300 ease-in-out left-[2px] top-[2px] checked:translate-x-[21px]"
                                />
                                <div className={`block overflow-hidden h-[31px] rounded-full cursor-pointer transition-colors duration-300 ease-in-out ${settingsForm.isPublic ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}></div>
                            </div>
                        </div>
                        <p className="px-4 py-2 text-[11px] text-[#8E8E93]">
                            If disabled, only enrolled students and admins can view the leaderboard.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="ml-1 text-[13px] font-medium text-[#8E8E93]">CUSTOM URL</label>
                        <div className="flex rounded-lg bg-[#F2F2F7] px-3 py-2 ring-1 ring-transparent focus-within:ring-[#007AFF] transition-all">
                            <span className="flex select-none items-center text-[#8E8E93] text-[15px]">/p/</span>
                            <input
                                type="text"
                                value={settingsForm.publicSlug}
                                onChange={(e) => setSettingsForm({ ...settingsForm, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                className="block flex-1 border-0 bg-transparent py-0 pl-1 text-[#1C1C1E] placeholder:text-[#C7C7CC] focus:ring-0 text-[15px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-0 border-t border-[#E5E5EA]">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(false)}
                        className="flex-1 py-4 text-[17px] text-[#007AFF] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors border-r border-[#E5E5EA]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        className="flex-1 py-4 text-[17px] font-semibold text-[#007AFF] hover:bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors disabled:opacity-50"
                    >
                        {updateSettingsMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Embed Modal */}
      {isEmbedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in" onClick={() => setIsEmbedOpen(false)}></div>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95">
             <div className="flex items-center justify-between border-b border-[#E5E5EA] bg-[#F2F2F7]/80 px-6 py-4 backdrop-blur-xl">
                <h3 className="text-[17px] font-semibold text-[#1C1C1E]">Embed Leaderboard</h3>
                <button onClick={() => setIsEmbedOpen(false)} className="rounded-full p-1 text-[#8E8E93] hover:bg-[#D1D1D6] transition-colors"><Check className="h-5 w-5 rotate-45" /></button>
             </div>
             
             <div className="p-6 grid gap-8 md:grid-cols-2">
                 <div className="space-y-4">
                     <p className="text-[13px] text-[#8E8E93]">
                         Copy this code to embed the leaderboard in Moodle, Canvas, Notion, or any other website.
                     </p>
                     
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Width</label>
                             <input 
                                type="text" 
                                value={embedConfig.width}
                                onChange={(e) => setEmbedConfig({...embedConfig, width: e.target.value})}
                                className="w-full rounded-lg border-0 bg-[#F2F2F7] px-3 py-2 text-[15px] text-[#1C1C1E] focus:ring-2 focus:ring-[#007AFF]"
                             />
                         </div>
                         <div>
                             <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Height</label>
                             <input 
                                type="text" 
                                value={embedConfig.height}
                                onChange={(e) => setEmbedConfig({...embedConfig, height: e.target.value})}
                                className="w-full rounded-lg border-0 bg-[#F2F2F7] px-3 py-2 text-[15px] text-[#1C1C1E] focus:ring-2 focus:ring-[#007AFF]"
                             />
                         </div>
                     </div>

                     <div className="group relative rounded-xl border border-[#E5E5EA] bg-[#F9F9F9] p-3 transition-colors hover:border-[#D1D1D6]">
                        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-[#1C1C1E] leading-relaxed">
{`<iframe 
  src="${window.location.origin}/p/${classDetails?.publicSlug}" 
  width="${embedConfig.width}" 
  height="${embedConfig.height}" 
  style="border:none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
</iframe>`}
                        </pre>
                        <button 
                            onClick={copyEmbedCode}
                            className="absolute right-2 top-2 rounded-lg bg-white p-2 shadow-sm ring-1 ring-black/5 hover:bg-[#F2F2F7] transition-all active:scale-95"
                            title="Copy Code"
                        >
                            {isCopied ? <Check className="h-4 w-4 text-[#34C759]" /> : <Copy className="h-4 w-4 text-[#8E8E93]" />}
                        </button>
                     </div>
                 </div>

                 <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-[#F2F2F7]">
                     <div className="border-b border-[#E5E5EA] bg-[#FFFFFF]/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Preview</div>
                     <div className="relative h-[280px] w-full bg-[#E5E5EA]/50">
                        {classDetails?.publicSlug ? (
                            <iframe 
                                src={`${window.location.origin}/p/${classDetails.publicSlug}`}
                                title="Leaderboard Preview"
                                className="h-full w-full border-0"
                                style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%', height: '133.33%' }}
                            />
                        ) : (
                             <div className="flex h-full w-full items-center justify-center text-[#8E8E93]">
                                 Preview Unavailable
                             </div>
                        )}
                     </div>
                 </div>
             </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal - Apple Style Action Sheet / Dialog */}
      {adjustData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in" onClick={() => setAdjustData({ ...adjustData, isOpen: false })}></div>
          <div className="relative w-full max-w-sm overflow-hidden rounded-[20px] bg-white shadow-2xl animate-in zoom-in-95">
            <div className="p-6 text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${adjustData.delta > 0 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
                   {adjustData.delta > 0 ? <Plus className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
                </div>
                <h3 className="text-[17px] font-semibold text-[#1C1C1E]">
                {adjustData.delta > 0 ? 'Award Points' : 'Penalty Points'}
                </h3>
                <p className="mt-1 text-[13px] text-[#8E8E93]">
                {adjustData.studentName} will {adjustData.delta > 0 ? 'receive' : 'lose'} <span className="font-semibold text-[#1C1C1E]">{Math.abs(adjustData.delta)} points</span>.
                </p>
                
                <form onSubmit={handleConfirmAdjust} className="mt-6 text-left">
                     <div className="space-y-4">
                         <div>
                             <label className="mb-1 ml-1 block text-[12px] font-medium text-[#8E8E93]">AMOUNT</label>
                             <input
                                type="number"
                                className="w-full rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-center text-[20px] font-bold text-[#1C1C1E] focus:ring-0"
                                value={adjustData.delta}
                                onChange={(e) => setAdjustData({ ...adjustData, delta: parseInt(e.target.value) || 0 })}
                                required
                            />
                         </div>
                         <div>
                            <label className="mb-1 ml-1 block text-[12px] font-medium text-[#8E8E93]">REASON</label>
                            <input
                                type="text"
                                placeholder="e.g. Good Participation"
                                className="w-full rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-[15px] text-[#1C1C1E] placeholder:text-[#C7C7CC] focus:ring-2 focus:ring-[#007AFF]"
                                value={adjustData.reason}
                                onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>
                     </div>
                     <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setAdjustData({ ...adjustData, isOpen: false })}
                            className="rounded-xl bg-[#F2F2F7] py-3 text-[15px] font-semibold text-[#1C1C1E] hover:bg-[#E5E5EA] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={adjustPointsMutation.isPending || !adjustData.reason}
                            className={`rounded-xl py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 ${adjustData.delta > 0 ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}
                        >
                            {adjustPointsMutation.isPending ? 'Saving...' : 'Confirm'}
                        </button>
                     </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Adjust Modal */}
      {bulkAdjustData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in" onClick={() => setBulkAdjustData({ ...bulkAdjustData, isOpen: false })}></div>
          <div className="relative w-full max-w-sm overflow-hidden rounded-[20px] bg-white shadow-2xl animate-in zoom-in-95">
             <div className="p-6 text-center">
                 <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${bulkAdjustData.mode === 'add' ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
                   {bulkAdjustData.mode === 'add' ? <Plus className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
                </div>
                <h3 className="text-[17px] font-semibold text-[#1C1C1E]">
                    Bulk {bulkAdjustData.mode === 'add' ? 'Award' : 'Penalty'}
                </h3>
                <p className="mt-1 text-[13px] text-[#8E8E93]">
                    Apply to <span className="font-semibold text-[#1C1C1E]">{selectedStudents.size} selected students</span>.
                </p>

                <form onSubmit={handleConfirmBulkAdjust} className="mt-6 text-left">
                     <div className="space-y-4">
                         <div>
                             <label className="mb-1 ml-1 block text-[12px] font-medium text-[#8E8E93]">AMOUNT</label>
                             <input
                                type="number"
                                min="1"
                                className="w-full rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-center text-[20px] font-bold text-[#1C1C1E] focus:ring-0"
                                value={Math.abs(bulkAdjustData.delta)}
                                onChange={(e) => {
                                    const val = Math.abs(parseInt(e.target.value) || 0);
                                    setBulkAdjustData({
                                        ...bulkAdjustData,
                                        delta: bulkAdjustData.mode === 'remove' ? -val : val
                                    });
                                }}
                                required
                            />
                         </div>
                         <div>
                            <label className="mb-1 ml-1 block text-[12px] font-medium text-[#8E8E93]">REASON</label>
                            <input
                                type="text"
                                placeholder={bulkAdjustData.mode === 'add' ? "e.g. Group Activity Winner" : "e.g. Late Submission"}
                                className="w-full rounded-xl border-0 bg-[#F2F2F7] px-4 py-3 text-[15px] text-[#1C1C1E] placeholder:text-[#C7C7CC] focus:ring-2 focus:ring-[#007AFF]"
                                value={bulkAdjustData.reason}
                                onChange={(e) => setBulkAdjustData({ ...bulkAdjustData, reason: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>
                     </div>
                     <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setBulkAdjustData({ ...bulkAdjustData, isOpen: false })}
                            className="rounded-xl bg-[#F2F2F7] py-3 text-[15px] font-semibold text-[#1C1C1E] hover:bg-[#E5E5EA] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={bulkAdjustMutation.isPending || !bulkAdjustData.reason}
                            className={`rounded-xl py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 ${bulkAdjustData.mode === 'add' ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}
                        >
                            {bulkAdjustMutation.isPending ? 'Processing...' : 'Confirm'}
                        </button>
                     </div>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetails;
