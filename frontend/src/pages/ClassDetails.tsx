import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus, Minus, UserPlus, Share2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ClassDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState({ name: '', email: '' });
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
            <button
              onClick={() => setIsEnrolling(!isEnrolling)}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" /> Enroll Student
            </button>
          </div>
        </header>

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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Points</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {leaderboard?.map((entry: any, index: number) => (
                <tr key={entry.studentId}>
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
