import { useCallback } from 'react';
import api from '@/lib/axios';

export function useEventLogger() {
  const logEvent = useCallback(async (action: string, details: any = {}) => {
    try {
      await api.post('/events', { action, details });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }, []);

  return { logEvent };
}
