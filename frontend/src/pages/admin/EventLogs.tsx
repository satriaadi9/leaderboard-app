import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, ListIcon } from 'lucide-react';

interface EventLog {
  id: string;
  action: string;
  details: any;
  userId: string | null;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  PAGE_VIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  LEADERBOARD_CHECK: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  RANK_CHANGE_SEEN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  EXPORT_USAGE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

export const EventLogs: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Authorization Check
  if (currentUser?.role !== 'SUPERADMIN') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/events?limit=500'); // Increase limit to fetch more logs for exports
        setLogs(response.data.data.events);
        setTotal(response.data.data.total);
      } catch (error) {
        console.error('Failed to load event logs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = ['ID', 'Action', 'User ID', 'Details', 'Timestamp'];
    const csvContent = logs.map((log) => [
      log.id,
      log.action,
      log.userId || 'Anonymous',
      JSON.stringify(log.details).replace(/"/g, '""'), // Escape quotes for CSV
      new Date(log.createdAt).toISOString()
    ].map(value => `"${value}"`).join(','));

    const csvData = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `event_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#000000] p-8 text-center text-gray-500 flex items-center justify-center">Loading audit logs...</div>;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] text-gray-900 dark:text-white transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
            <Link 
                to="/" 
                className="inline-flex items-center gap-2 mb-4 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <ListIcon className="h-7 w-7 text-indigo-500" />
                        System Event Logs
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Showing recent logs. Total recorded: {total}
                    </p>
                </div>
                <button
                    onClick={exportToCSV}
                    disabled={logs.length === 0}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    <Download className="h-4 w-4" />
                    Export to CSV
                </button>
            </div>
        </div>

        {/* Table Section */}
        <div className="rounded-2xl border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1c1c1e] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-[#333333]">
              <thead className="bg-gray-50 dark:bg-[#2c2c2e]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#333333]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                      No event logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-[#2c2c2e]/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {log.userId || <span className="italic opacity-60">Anonymous</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <pre className="text-xs bg-gray-50 dark:bg-[#000000] p-3 rounded-lg overflow-x-auto max-w-md border border-gray-100 dark:border-[#333333]">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EventLogs;
