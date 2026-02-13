import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { TrendingUp, TrendingDown, Minus, Trophy, Activity, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';


interface ClassProgress {
  classId: string;
  className: string;
  isArchived: boolean;
  rank: number;
  totalPoints: number;
  level: number;
  nextLevelThreshold: number;
  progressPercent: number;
  recentGain: number;
  trend: 'up' | 'down' | 'neutral';
}

interface StudentProgressData {
  student: {
    id: string;
    name: string;
    nim: string;
  };
  classes: ClassProgress[];
}

const RingProgress: React.FC<{ percent: number; color: string; size?: number; children?: React.ReactNode }> = ({ 
  percent, 
  color, 
  size = 120,
  children 
}) => {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="12" // Thicker ring
          className="text-gray-200 dark:text-white/10"
        />
        {/* Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-900 dark:text-white">
        {children}
      </div>
    </div>
  );
};

const StudentProgress: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { theme, setTheme } = useTheme();

  const { data, isLoading, error } = useQuery<StudentProgressData>({
    queryKey: ['student-progress', id],
    queryFn: async () => {
      const res = await api.get(`/students/${id}`);
      return res.data.data;
    },
    retry: false
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 dark:border-[#D4F238]"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-2">Student Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400">This link may be invalid or expired.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-blue-100 dark:selection:bg-[#D4F238] dark:selection:text-black pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 transition-colors">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.student.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">#{data.student.nim}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 rounded-full bg-gray-100 dark:bg-[#1c1c1e] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#2c2c2e] transition-colors"
            >
              {theme === 'dark' ? <Moon size={20} className="text-white" /> : <Sun size={20} className="text-gray-900" />}
            </button>
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-[#1c1c1e] flex items-center justify-center">
               <Activity className="h-6 w-6 text-blue-600 dark:text-[#D4F238]" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-8 space-y-6">
        
        {/* Summary Trend Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-200">Activity Summary</h2>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 flex flex-col justify-between h-32 shadow-sm dark:shadow-none ring-1 ring-gray-900/5 dark:ring-0 transition-colors">
                 <div className="flex justify-between items-start">
                    <span className="text-red-500 dark:text-[#fa114f] font-medium text-sm">Active Classes</span>
                    <Activity className="h-5 w-5 text-red-500 dark:text-[#fa114f]" />
                 </div>
                 <div className="text-3xl font-bold">
                    {data.classes.filter(c => !c.isArchived).length}
                 </div>
             </div>
             <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 flex flex-col justify-between h-32 shadow-sm dark:shadow-none ring-1 ring-gray-900/5 dark:ring-0 transition-colors">
                 <div className="flex justify-between items-start">
                    <span className="text-blue-600 dark:text-[#D4F238] font-medium text-sm">Total Points</span>
                    <Trophy className="h-5 w-5 text-blue-600 dark:text-[#D4F238]" />
                 </div>
                 <div className="text-3xl font-bold">
                    {data.classes.reduce((sum, c) => sum + c.totalPoints, 0).toLocaleString()}
                 </div>
             </div>
          </div>
        </section>

        {/* Classes List */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-200">Class Progress</h2>
          <div className="space-y-4">
            {data.classes.map((cls) => (
              <div 
                key={cls.classId} 
                className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 relative overflow-hidden group shadow-sm dark:shadow-none ring-1 ring-gray-900/5 dark:ring-0 transition-colors"
              >
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{cls.className}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {cls.isArchived ? 'Archived' : 'Active Term'}
                        </p>
                    </div>
                    {/* Rank Badge */}
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-300">RANK</span>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">#{cls.rank}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Ring */}
                    <div className="shrink-0">
                        <RingProgress 
                            percent={cls.progressPercent} 
                            color={cls.rank === 1 ? '#F59E0B' : cls.trend === 'up' ? '#3B82F6' : '#22c55e'} 
                        >
                             <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">LEVEL</span>
                                <span className="text-2xl font-black font-mono tracking-tighter text-gray-900 dark:text-white">{cls.level}</span>
                             </div>
                        </RingProgress>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 space-y-4">
                        
                        {/* Points Progress */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500 dark:text-gray-400">{cls.totalPoints} pts</span>
                                <span className="text-gray-500 dark:text-gray-500">{cls.nextLevelThreshold} pts</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                        width: `${cls.progressPercent}%`,
                                        backgroundColor: cls.rank === 1 ? '#F59E0B' : cls.trend === 'up' ? '#3B82F6' : '#22c55e'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Trend Indicator */}
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-black/20 rounded-xl p-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">7-Day Activity</span>
                            <div className={`flex items-center gap-1.5 text-sm font-bold ${
                                cls.trend === 'up' ? 'text-blue-600 dark:text-[#D4F238]' : 
                                cls.trend === 'down' ? 'text-red-500 dark:text-[#fa114f]' : 'text-gray-400'
                            }`}>
                                {cls.trend === 'up' ? <TrendingUp size={16} /> : 
                                 cls.trend === 'down' ? <TrendingDown size={16} /> : 
                                 <Minus size={16} />}
                                <span>{cls.recentGain > 0 ? `+${cls.recentGain}` : cls.recentGain} pts</span>
                            </div>
                        </div>
                    </div>
                </div>

              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default StudentProgress;
