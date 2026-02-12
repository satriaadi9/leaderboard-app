import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Trophy, Users, TrendingUp, History, X } from 'lucide-react';

const PublicLeaderboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  // Real-time Updates via SSE
  useEffect(() => {
     if (!slug) return;

     // Use relative path for proxy, or absolute if needed.
     // Assuming proxy handles /api
     const eventSource = new EventSource(`/api/classes/public/${slug}/stream`);

     eventSource.onmessage = (event) => {
         const data = JSON.parse(event.data);
         if (data.status === 'connected') return;
         
         // Invalidate query to trigger refetch
         queryClient.invalidateQueries({ queryKey: ['public-leaderboard', slug] });
     };

     return () => {
         eventSource.close();
     };
  }, [slug, queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-leaderboard', slug],
    queryFn: async () => {
      const res = await api.get(`/classes/public/${slug}`);
      return res.data.data;
    },
    retry: false
    // Removed refetchInterval in favor of SSE
  });

  const { data: history, isLoading: historyLoading } = useQuery({
      queryKey: ['student-history', slug, selectedStudent?.id],
      queryFn: async () => {
          if (!selectedStudent) return [];
          const res = await api.get(`/classes/public/${slug}/students/${selectedStudent.id}/history`);
          return res.data.data;
      },
      enabled: !!selectedStudent
  });

  if (isLoading) return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-xl font-semibold text-gray-600">Loading Leaderboard...</div>
      </div>
  );

  if (error) return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
             <div className="text-xl font-bold text-red-600 mb-2">Access Denied</div>
             <p className="text-gray-600">This leaderboard is private or does not exist.</p>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Hero Section */}
      <div className="bg-indigo-600 pb-24 pt-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight">{data.class.name}</h1>
          <p className="mt-2 text-lg text-indigo-100 max-w-3xl">{data.class.description || 'Welcome to the class leaderboard!'}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-indigo-200">
             <div className="flex items-center gap-1">
                 <span className="font-semibold text-white">Teacher:</span> {data.class.owner}
             </div>
             {data.class.assistants?.length > 0 && (
                 <div className="flex items-center gap-1">
                    <span className="font-semibold text-white">Assistants:</span> {data.class.assistants.join(', ')}
                 </div>
             )}
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white shadow-lg transition-transform hover:-translate-y-1">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-indigo-500 text-white">
                    <Trophy className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Total Points</dt>
                    <dd className="text-2xl font-bold text-gray-900">{data.stats.totalPoints.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow-lg transition-transform hover:-translate-y-1">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-pink-500 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Students</dt>
                    <dd className="text-2xl font-bold text-gray-900">{data.stats.studentCount}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow-lg transition-transform hover:-translate-y-1">
             <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-500 text-white">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">Average</dt>
                    <dd className="text-2xl font-bold text-gray-900">{data.stats.averagePoints}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-lg">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Leaderboard</h3>
          </div>
          <ul role="list" className="divide-y divide-gray-200">
            {data.leaderboard.map((entry: any, index: number) => (
              <li 
                key={entry.student.id} 
                className={`relative transition hover:bg-gray-50 cursor-pointer ${index < 3 ? 'bg-yellow-50/30' : ''}`}
                onClick={() => setSelectedStudent(entry.student)}
              >
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                            index < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {entry.total === 0 && !entry.hasNegativeHistory ? '-' : index + 1}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">{entry.student.name}</p>
                                {entry.badges?.includes('TOP_1') && <span title="Top #1" className="text-xl">🥇</span>}
                                {entry.badges?.includes('MOST_IMPROVED') && <span title="Most Improved This Week" className="text-xl">🔥</span>}
                                {entry.badges?.includes('BIGGEST_CLIMBER') && <span title="Biggest Rank Climber" className="text-xl">📈</span>}
                            </div>
                            <p className="text-sm text-gray-500">{entry.student.nim}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`text-xl font-bold ${entry.total < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                            {entry.total}
                        </span>
                        <span className="text-xs text-gray-400 block">pts</span>
                    </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

       {/* Student History Modal */}
       {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-indigo-600 p-6 text-white">
                <h3 className="text-xl font-bold">{selectedStudent.name}</h3>
                <button onClick={() => setSelectedStudent(null)} className="rounded-full bg-indigo-500 p-1 hover:bg-indigo-400">
                    <X className="h-5 w-5" />
                </button>
            </div>
            
            <div className="p-6">
                <h4 className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    <History className="h-4 w-4"/> Point History
                </h4>
                
                {historyLoading ? (
                    <div className="py-8 text-center text-gray-500">Loading history...</div>
                ) : history?.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No point history found.</div>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-2">
                             {history.map((item: any) => (
                                <div key={item.id} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${item.delta > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.reason}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{new Date(item.createdAt).toLocaleString()}</span>
                                                {item.createdBy && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-medium text-gray-700" title={item.createdBy.role}>
                                                            By {item.createdBy.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${item.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.delta > 0 ? '+' : ''}{item.delta}
                                        </span>
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </div>
             <div className="bg-gray-50 p-4 text-right">
                <button onClick={() => setSelectedStudent(null)} className="text-sm font-medium text-gray-600 hover:text-gray-900">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLeaderboard;
