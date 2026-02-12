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
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
          <div className="flex flex-col items-center">
             <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin mb-4" />
             <p className="text-[#8E8E93] font-medium">Loading Leaderboard...</p>
          </div>
      </div>
  );

  if (error) return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F2F7]">
          <div className="rounded-2xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
             <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF3B30]/10 text-[#FF3B30]">
                 <X className="h-6 w-6" />
             </div>
             <h3 className="text-lg font-bold text-[#1C1C1E]">Access Denied</h3>
             <p className="mt-2 text-[15px] text-[#8E8E93]">This leaderboard is private or does not exist.</p>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-20">
      {/* Hero Section */}
      <div className="bg-[#1C1C1E] pb-32 pt-16 text-white relative overflow-hidden">
        {/* Abstract shapes / gradients could go here for "Apple" style wallpapers, keeping it cleaner for now */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-[40px] font-bold tracking-tight sm:text-5xl">{data.class.name}</h1>
            <p className="mt-4 text-[19px] text-[#8E8E93] max-w-2xl text-center leading-relaxed">{data.class.description || 'Welcome to the class leaderboard!'}</p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                 <div className="rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-medium backdrop-blur-md">
                     <span className="opacity-60">Teacher:</span> {data.class.owner}
                 </div>
                 {data.class.assistants?.length > 0 && (
                     <div className="rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-medium backdrop-blur-md">
                        <span className="opacity-60">Assistants:</span> {data.class.assistants.join(', ')}
                     </div>
                 )}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-24 max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[13px] font-bold uppercase tracking-wider text-[#8E8E93]">Total Points</p>
                  <p className="text-3xl font-bold tracking-tight text-[#1C1C1E]">{data.stats.totalPoints.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 backdrop-blur-xl">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-500">
                  <Users className="h-6 w-6" />
                </div>
                 <div>
                  <p className="text-[13px] font-bold uppercase tracking-wider text-[#8E8E93]">Students</p>
                  <p className="text-3xl font-bold tracking-tight text-[#1C1C1E]">{data.stats.studentCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 backdrop-blur-xl">
             <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-500">
                  <TrendingUp className="h-6 w-6" />
                </div>
                 <div>
                  <p className="text-[13px] font-bold uppercase tracking-wider text-[#8E8E93]">Average</p>
                  <p className="text-3xl font-bold tracking-tight text-[#1C1C1E]">{data.stats.averagePoints}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table / List */}
        <div className="mt-8 overflow-hidden rounded-[24px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
          <div className="border-b border-[#E5E5EA] bg-white/50 px-6 py-4 backdrop-blur-md sticky top-0 z-10">
            <h3 className="text-[17px] font-semibold text-[#1C1C1E]">Leaderboard</h3>
          </div>
          <ul role="list" className="divide-y divide-[#E5E5EA]">
            {data.leaderboard.map((entry: any, index: number) => (
              <li 
                key={entry.student.id} 
                className={`relative transition-all duration-200 hover:bg-[#F2F2F7] cursor-pointer group ${index < 3 ? 'bg-gradient-to-r from-[#F2F2F7]/50 to-transparent' : ''}`}
                onClick={() => setSelectedStudent(entry.student)}
              >
                <div className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[17px] font-bold shadow-sm ring-1 ring-inset ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700 ring-yellow-200' :
                            index === 1 ? 'bg-gray-100 text-gray-700 ring-gray-200' :
                            index === 2 ? 'bg-orange-100 text-orange-800 ring-orange-200' :
                            'bg-white text-[#8E8E93] ring-[#E5E5EA]'
                        }`}>
                            {entry.total === 0 && !entry.hasNegativeHistory ? '-' : index + 1}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-[17px] font-semibold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors">{entry.student.name}</p>
                                <div className="flex gap-1">
                                    {entry.badges?.includes('TOP_1') && <span title="Top #1" className="flex h-5 items-center justify-center rounded px-1.5 bg-yellow-100 text-[10px] font-bold uppercase tracking-wider text-yellow-800">#1</span>}
                                    {entry.badges?.includes('MOST_IMPROVED') && <span title="Most Improved This Week" className="flex h-5 items-center justify-center rounded px-1.5 bg-orange-100 text-[10px] font-bold uppercase tracking-wider text-orange-800">HOT</span>}
                                    {entry.badges?.includes('BIGGEST_CLIMBER') && <span title="Biggest Rank Climber" className="flex h-5 items-center justify-center rounded px-1.5 bg-green-100 text-[10px] font-bold uppercase tracking-wider text-green-800">UP</span>}
                                </div>
                            </div>
                            <p className="text-[13px] text-[#8E8E93]">{entry.student.nim}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`text-[22px] font-bold tabular-nums tracking-tight ${entry.total < 0 ? 'text-[#FF3B30]' : 'text-[#007AFF]'}`}>
                            {entry.total}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] block mt-[-2px]">pts</span>
                    </div>
                </div>
              </li>
            ))}
            {data.leaderboard.length === 0 && (
                <li className="px-6 py-12 text-center text-[#8E8E93]">
                    No students ranked yet.
                </li>
            )}
          </ul>
        </div>
      </main>

       {/* Student History Modal */}
       {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedStudent(null)}></div>
          <div className="relative w-full max-w-lg overflow-hidden rounded-[20px] bg-white shadow-2xl animate-in zoom-in-95 transition-all">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] bg-[#F2F2F7]/80 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                     <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#1C1C1E] shadow-sm">
                        {selectedStudent.name.charAt(0)}
                     </div>
                     <h3 className="text-[17px] font-semibold text-[#1C1C1E]">{selectedStudent.name}</h3>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="rounded-full bg-[#E5E5EA] p-1 text-[#8E8E93] hover:bg-[#D1D1D6] transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>
            
            <div className="p-0">
                <div className="bg-[#FAFAFA] px-6 py-3 border-b border-[#E5E5EA]">
                    <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                        <History className="h-3 w-3"/> Activity History
                    </h4>
                </div>
                
                {historyLoading ? (
                    <div className="py-12 flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent"></div>
                    </div>
                ) : history?.length === 0 ? (
                    <div className="py-12 text-center text-[15px] text-[#8E8E93]">No point history found.</div>
                ) : (
                    <div className="max-h-[50vh] overflow-y-auto">
                         <div className="divide-y divide-[#E5E5EA]">
                             {history.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#F2F2F7]/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 h-2 w-2 rounded-full ${item.delta > 0 ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}></div>
                                        <div>
                                            <p className="text-[15px] font-medium text-[#1C1C1E]">{item.reason}</p>
                                            <div className="flex items-center gap-1.5 text-[12px] text-[#8E8E93]">
                                                <span>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                {item.createdBy && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-medium text-[#1C1C1E]">
                                                            {item.createdBy.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-[15px] font-bold tabular-nums ${item.delta > 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                                        {item.delta > 0 ? '+' : ''}{item.delta}
                                    </span>
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLeaderboard;
