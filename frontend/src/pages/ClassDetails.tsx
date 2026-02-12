import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Minus, UserPlus, ArrowLeft, Trash2, Upload, ArrowUpDown, ArrowUp, ArrowDown, Settings, Code, Copy, Check, Shield, UserX, Lock } from 'lucide-react';
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

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/dashboard" className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Classes
        </Link>
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-white p-6 shadow-sm sm:flex-row sm:items-center">
             <div>
            <h1 className="text-2xl font-bold text-gray-900">{classDetails?.name || 'Class Details'}</h1>
            <p className="text-sm text-gray-500">
               Public Link: {' '}
               <a href={`http://localhost:5173/p/${classDetails?.publicSlug}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    /p/{classDetails?.publicSlug}
               </a>
               {!classDetails?.isPublic && <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Private</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
             <button
              onClick={() => setIsEmbedOpen(true)}
              className="flex items-center gap-2 rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Code className="h-4 w-4" /> Embed
            </button>
            {selectedStudents.size > 0 && (
                <>
                    <button
                        onClick={() => openBulkAdjust('add')}
                        className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                        <Plus className="h-4 w-4" /> Add Points ({selectedStudents.size})
                    </button>
                    <button
                        onClick={() => openBulkAdjust('remove')}
                        className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                    >
                        <Minus className="h-4 w-4" /> Penalty ({selectedStudents.size})
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        <Trash2 className="h-4 w-4" /> Delete ({selectedStudents.size})
                    </button>
                </>
            )}
            <button
              onClick={() => setIsImporting(!isImporting)}
              className="flex items-center gap-2 rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" /> Import CSV
            </button>
            <button
              onClick={() => setIsEnrolling(!isEnrolling)}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" /> Enroll Student
            </button>
          </div>
        </header>

        {isImporting && (
           <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Import Students via CSV</h3>
            <div className="mb-4 flex flex-col gap-2">
                <p className="text-sm text-gray-500">
                    Upload a CSV file. Expected format (Moodle export style):
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 font-mono">
                    "First name","Last name","Email address",Groups<br/>
                    0706022410033,"Alvon Hindarmawan",ahindarmawan@student.ciputra.ac.id,
                </div>
                <a 
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent('"First name","Last name","Email address",Groups\n0706022410033,"Alvon Hindarmawan",ahindarmawan@student.ciputra.ac.id,\n0706022410026,"Casey Daniella Winarto",cdaniella@student.ciputra.ac.id,')}`} 
                    download="import_template.csv"
                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 w-fit"
                >
                    <Upload className="h-3 w-3" /> Download Example CSV
                </a>
            </div>
            <form onSubmit={handleFileUpload} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                 <input 
                    type="file" 
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                 />
              </div>
              <button
                type="submit"
                disabled={!importFile || importMutation.isPending}
                 className="rounded-md bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Importing...' : 'Upload & Import'}
              </button>
            </form>
           </div>
        )}

        {isEnrolling && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Enroll New Student</h3>
            <form onSubmit={handleEnroll} className="flex flex-col gap-4 sm:flex-row">
              <input
                placeholder="Student Name"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                value={enrollData.name}
                onChange={(e) => setEnrollData({ ...enrollData, name: e.target.value })}
                required
              />
              <input
                placeholder="Student Email"
                type="email"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                value={enrollData.email}
                onChange={(e) => setEnrollData({ ...enrollData, email: e.target.value })}
                required
              />
              <button
                type="submit"
                disabled={enrollMutation.isPending}
                className="rounded-md bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700"
              >
                Enroll
              </button>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 w-4">
                    <input 
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={leaderboard?.length > 0 && selectedStudents.size === leaderboard?.length}
                        onChange={toggleSelectAll}
                    />
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rank</th>
                <th 
                    className="cursor-pointer px-6 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                >
                    <div className="flex items-center gap-1">
                        Student
                        {sortConfig.key === 'name' ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4"/> : <ArrowDown className="h-4 w-4"/>
                        ) : <ArrowUpDown className="h-4 w-4 text-gray-400"/>}
                    </div>
                </th>
                <th 
                    className="cursor-pointer px-6 py-3 text-right text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    onClick={() => handleSort('total')}
                >
                     <div className="flex items-center justify-end gap-1">
                        Points
                        {sortConfig.key === 'total' ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4"/> : <ArrowDown className="h-4 w-4"/>
                        ) : <ArrowUpDown className="h-4 w-4 text-gray-400"/>}
                    </div>
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedLeaderboard.map((entry: any, index: number) => (
                <tr key={entry.studentId} className={selectedStudents.has(entry.studentId) ? 'bg-indigo-50' : ''}>
                  <td className="px-6 py-4">
                      <input 
                        type="checkbox"
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedStudents.has(entry.studentId)}
                        onChange={() => toggleSelect(entry.studentId)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {entry.total === 0 && !entry.hasNegativeHistory ? '-' : index + 1}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">{entry.student.name}</div>
                        {entry.badges?.includes('TOP_1') && <span title="Top #1" className="cursor-help text-lg">🥇</span>}
                        {entry.badges?.includes('MOST_IMPROVED') && <span title="Most Improved This Week" className="cursor-help text-lg">🔥</span>}
                        {entry.badges?.includes('BIGGEST_CLIMBER') && <span title="Biggest Rank Climber" className="cursor-help text-lg">📈</span>}
                    </div>
                    <div className="text-gray-500">{entry.student.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-indigo-600">
                    {entry.total}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openAdjustModal(entry.studentId, entry.student.name, 10)}
                        className="rounded-full bg-green-100 p-1 text-green-600 hover:bg-green-200"
                        title="Add points"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openAdjustModal(entry.studentId, entry.student.name, -10)}
                        className="rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                        title="Remove points"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.studentId, entry.student.name)}
                        className="ml-2 rounded-full p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100"
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
          {leaderboard?.length === 0 && (
              <div className="p-12 text-center text-gray-500">No students enrolled yet.</div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
             <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Class Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">X</button>
             </div>
             
             <form onSubmit={handleSettingsSave}>
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Public Access</span>
                        <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                name="isPublic" 
                                id="isPublic" 
                                checked={settingsForm.isPublic}
                                onChange={(e) => setSettingsForm({ ...settingsForm, isPublic: e.target.checked })}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                style={{ right: settingsForm.isPublic ? '0' : 'auto', left: settingsForm.isPublic ? 'auto' : '0', borderColor: settingsForm.isPublic ? '#4F46E5' : '#D1D5DB' }}
                            />
                            <label htmlFor="isPublic" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${settingsForm.isPublic ? 'bg-indigo-600' : 'bg-gray-300'}`}></label>
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">If disabled, the public link will show a 403 error.</p>
                </div>

                <div className="mb-6">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Custom Public Slug</label>
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 sm:max-w-md">
                        <span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm">/p/</span>
                        <input
                            type="text"
                            value={settingsForm.publicSlug}
                            onChange={(e) => setSettingsForm({ ...settingsForm, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            className="block flex-1 border-0 bg-transparent py-2 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 focus:outline-none"
                        />
                    </div>
                </div>

                <hr className="my-6 border-gray-200" />
                
                <div className="mb-6">
                    <h4 className="mb-3 text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-600" /> Student Assistants
                    </h4>
                    
                    <ul className="mb-4 space-y-2">
                        {classDetails?.assistants?.map((assistant: any) => (
                            <li key={assistant.id} className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm">
                                <div>
                                    <div className="font-medium text-gray-900">{assistant.name}</div>
                                    <div className="text-gray-500 text-xs">{assistant.email}</div>
                                </div>
                                {user?.role !== 'STUDENT_ASSISTANT' && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if(confirm('Remove assistant?')) removeAssistantMutation.mutate(assistant.id);
                                        }}
                                        className="text-red-600 hover:text-red-800"
                                        title="Remove Assistant"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                        {(!classDetails?.assistants || classDetails.assistants.length === 0) && (
                            <li className="text-sm text-gray-500 italic">No assistants assigned.</li>
                        )}
                    </ul>

                    {user?.role !== 'STUDENT_ASSISTANT' && (
                        <div className="rounded bg-indigo-50 p-3">
                            <p className="mb-2 text-xs font-semibold text-indigo-900">Add Assistant</p>
                            <div className="flex flex-col gap-2">
                                <input 
                                    placeholder="Name" 
                                    value={newAssistant.name}
                                    onChange={e => setNewAssistant({...newAssistant, name: e.target.value})}
                                    className="rounded border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <input 
                                    placeholder="Email" 
                                    value={newAssistant.email}
                                    onChange={e => setNewAssistant({...newAssistant, email: e.target.value})}
                                    className="rounded border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <input 
                                    placeholder="Password (only for new users)" 
                                    type="password"
                                    value={newAssistant.password}
                                    onChange={e => setNewAssistant({...newAssistant, password: e.target.value})}
                                    className="rounded border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddAssistant}
                                    disabled={!newAssistant.email || !newAssistant.name || addAssistantMutation.isPending}
                                    className="mt-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {addAssistantMutation.isPending ? 'Adding...' : 'Add Assistant'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(false)}
                        className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Embed Modal */}
      {isEmbedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
             <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Embed Leaderboard</h3>
                <button onClick={() => setIsEmbedOpen(false)} className="text-gray-400 hover:text-gray-600">X</button>
             </div>
             
             <div className="grid gap-6 md:grid-cols-2">
                 <div>
                     <p className="mb-4 text-sm text-gray-500">
                         Copy this code to embed the leaderboard in Moodle, Canvas, Notion, or any other website.
                     </p>
                     
                     <div className="mb-4 flex gap-4">
                         <div className="flex-1">
                             <label className="mb-1 block text-xs font-medium text-gray-700">Width</label>
                             <input 
                                type="text" 
                                value={embedConfig.width}
                                onChange={(e) => setEmbedConfig({...embedConfig, width: e.target.value})}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                             />
                         </div>
                         <div className="flex-1">
                             <label className="mb-1 block text-xs font-medium text-gray-700">Height</label>
                             <input 
                                type="text" 
                                value={embedConfig.height}
                                onChange={(e) => setEmbedConfig({...embedConfig, height: e.target.value})}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                             />
                         </div>
                     </div>

                     <div className="relative mb-4">
                        <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-800 border border-gray-200">
{`<iframe 
  src="${window.location.origin}/p/${classDetails?.publicSlug}" 
  width="${embedConfig.width}" 
  height="${embedConfig.height}" 
  style="border:none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
</iframe>`}
                        </pre>
                        <button 
                            onClick={copyEmbedCode}
                            className="absolute right-2 top-2 rounded bg-white p-1.5 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                            title="Copy Code"
                        >
                            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
                        </button>
                     </div>
                 </div>

                 <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                     <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-500">Preview</div>
                     <div className="flex h-[300px] items-center justify-center p-4">
                         <iframe 
                            src={`/p/${classDetails?.publicSlug}`} 
                            className="h-full w-full rounded shadow-sm bg-white"
                            style={{ border: 'none' }}
                            title="Leaderboard Preview"
                         />
                     </div>
                 </div>
             </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {adjustData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Adjust Points for {adjustData.studentName}
            </h3>
            <form onSubmit={handleConfirmAdjust} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Points Amount</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={adjustData.delta}
                  onChange={(e) => setAdjustData({ ...adjustData, delta: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Good participation"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustData({ ...adjustData, isOpen: false })}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustPointsMutation.isPending || !adjustData.reason}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adjustPointsMutation.isPending ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Adjust Modal */}
      {bulkAdjustData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Bulk {bulkAdjustData.mode === 'add' ? 'Add Points' : 'Penalty'}
            </h3>
            <p className="mb-4 text-sm text-gray-500">
                Evaluating {selectedStudents.size} selected students.
            </p>
            <form onSubmit={handleConfirmBulkAdjust} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Points Amount</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                <input
                  type="text"
                  placeholder={bulkAdjustData.mode === 'add' ? "e.g. Group Activity Winner" : "e.g. Late Submission"}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={bulkAdjustData.reason}
                  onChange={(e) => setBulkAdjustData({ ...bulkAdjustData, reason: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkAdjustData({ ...bulkAdjustData, isOpen: false })}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkAdjustMutation.isPending || !bulkAdjustData.reason}
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${bulkAdjustData.mode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {bulkAdjustMutation.isPending ? 'Processing...' : 'Confirm Bulk Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assistants Management */}
      <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Manage Assistants</h3>
        <div className="mb-4">
          <form onSubmit={handleAddAssistant} className="flex flex-col gap-4 sm:flex-row">
            <input
              placeholder="Assistant Name"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              value={newAssistant.name}
              onChange={(e) => setNewAssistant({ ...newAssistant, name: e.target.value })}
              required
            />
            <input
              placeholder="Assistant Email"
              type="email"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              value={newAssistant.email}
              onChange={(e) => setNewAssistant({ ...newAssistant, email: e.target.value })}
              required
            />
            <input
              placeholder="Password"
              type="password"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              value={newAssistant.password}
              onChange={(e) => setNewAssistant({ ...newAssistant, password: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={addAssistantMutation.isPending}
              className="rounded-md bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700"
            >
              Add Assistant
            </button>
          </form>
        </div>

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-800">Existing Assistants</h4>
          <ul className="space-y-2">
            {classDetails?.assistants?.map((assistant: any) => (
              <li key={assistant.userId} className="flex items-center justify-between rounded-md bg-gray-50 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-gray-400" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{assistant.name}</p>
                    <p className="text-gray-500">{assistant.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeAssistantMutation.mutate(assistant.userId)}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                  title="Remove Assistant"
                >
                  <UserX className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClassDetails;
