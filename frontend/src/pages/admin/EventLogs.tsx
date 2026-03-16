import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';

interface EventLog {
  id: string;
  action: string;
  details: any;
  userId: string | null;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  PAGE_VIEW: 'bg-blue-100 text-blue-800',
  LEADERBOARD_CHECK: 'bg-indigo-100 text-indigo-800',
  RANK_CHANGE_SEEN: 'bg-purple-100 text-purple-800',
  EXPORT_USAGE: 'bg-green-100 text-green-800',
};

export const EventLogs: React.FC = () => {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/events?limit=100');
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading audit logs...</div>;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">System Event Logs ({total})</h1>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  No event logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {log.userId || <span className="text-gray-400 italic">Anonymous</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-x-auto max-w-md border">
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
  );
};

export default EventLogs;
