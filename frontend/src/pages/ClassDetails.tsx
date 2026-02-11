import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Minus, UserPlus, Share2, ArrowLeft, Trash2, Upload, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

const ClassDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState({ name: '', email: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'total', direction: 'desc' });
  
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
          // Assuming I add an endpoint for single class details or reuse list
          // For now, I'll just use the leaderboard data or fetch from list if I had state
          // But let's assume I can get details. Actually, I don't have a specific "get class details" protected endpoint
          // But I can use the public one or list. Let's just use the public leaderboard endpoint which returns class info sometimes?
          // No, the public leaderboard returns PointsTotal.
          // I should stick to what I have. I'll just show the ID for now.
          return { name: 'Class Leaderboard' }; 
      }
  })

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

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/dashboard" className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Classes
        </Link>
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Class Leaderboard</h1>
            <p className="text-sm text-gray-500">Manage students and points</p>
          </div>
          <div className="flex gap-2">
            <button
               // Copy public link logic
               onClick={() => {
                   // I need the slug. I don't have it here easily without fetching class details.
                   // I'll skip for now or fetch it properly.
                   alert("Feature to copy link coming soon");
               }}
               className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                <Share2 className="h-4 w-4"/> Public Link
            </button>
            {selectedStudents.size > 0 && (
                <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                    <Trash2 className="h-4 w-4" /> Delete ({selectedStudents.size})
                </button>
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
            <p className="mb-4 text-sm text-gray-500">
                Upload a CSV file with columns: ID, Name, Email. (Header row is skipped).
            </p>
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
                    #{index + 1}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="font-medium text-gray-900">{entry.student.name}</div>
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
    </div>
  );
};

export default ClassDetails;
