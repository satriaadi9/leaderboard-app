import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Trophy } from 'lucide-react';

const PublicLeaderboard: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();

  // Use direct axios for public route to avoid auth header issues if any (though my interceptor handles it)
  // But also to show I can use standard axios. Actually, I should use my api instance, it's fine.
  // But wait, the interceptor adds token if it exists. That's fine for public routes too.

  const { data: leaderboard, isLoading, error } = useQuery({
    queryKey: ['public-leaderboard', idOrSlug],
    queryFn: async () => {
      const res = await axios.get(`/api/classes/${idOrSlug}/leaderboard`);
      return res.data.data;
    },
    refetchInterval: 30000, // Live updates every 30s
  });

  if (isLoading) return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
          <div className="animate-pulse">Loading Leaderboard...</div>
      </div>
  );

  if (error) return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-red-400">
          Error loading leaderboard. Invalid Class ID.
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 font-sans text-slate-100">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20 ring-1 ring-yellow-500/50">
                <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Class Leaderboard
            </h1>
            <p className="mt-4 text-lg text-slate-400">Top performers this semester</p>
        </header>

        <div className="overflow-hidden rounded-2xl bg-slate-800/50 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="p-6 sm:p-8">
            <div className="space-y-4">
              {leaderboard?.map((entry: any, index: number) => {
                  let rankColor = "bg-slate-700/50 text-slate-400";
                  let ringColor = "ring-transparent";
                  
                  if (index === 0) { rankColor = "bg-yellow-500/20 text-yellow-400"; ringColor="ring-yellow-500/50"; }
                  else if (index === 1) { rankColor = "bg-slate-300/20 text-slate-300"; ringColor="ring-slate-300/50"; }
                  else if (index === 2) { rankColor = "bg-amber-700/20 text-amber-600"; ringColor="ring-amber-700/50"; }

                  return (
                    <div 
                        key={entry.studentId}
                        className={`group relative flex items-center justify-between rounded-xl p-4 transition-all hover:bg-slate-700/50 ${index < 3 ? 'mb-6' : 'mb-2'}`}
                    >
                        <div className="flex items-center gap-6">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ring-1 ${rankColor} ${ringColor}`}>
                                {index + 1}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-200 group-hover:text-white">
                                    {entry.student.name}
                                </h3>
                                {/* Obfuscate email for public view */}
                                <p className="text-xs text-slate-500">
                                    {entry.student.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black tracking-tighter text-white">
                                {entry.totalPoints}
                            </span>
                            <span className="ml-1 text-xs font-medium uppercase tracking-wider text-slate-500">pts</span>
                        </div>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
        
        <footer className="mt-12 text-center text-sm text-slate-600">
            Updated in real-time.
        </footer>
      </div>
    </div>
  );
};

export default PublicLeaderboard;
