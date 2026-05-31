import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { toursClient } from '../api/client';
import { TourExecution, KeyPoint, Tour } from '../types';
import { useAuth } from './AuthContext';

interface TourExecutionContextType {
  execution: TourExecution | null;
  tour: Tour | null;
  keyPoints: KeyPoint[];
  notification: string;
  setExecution: (e: TourExecution | null) => void;
  refreshExecution: () => Promise<void>;
}

const TourExecutionContext = createContext<TourExecutionContextType | null>(null);

export function TourExecutionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [execution, setExecutionState] = useState<TourExecution | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [notification, setNotification] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user?.role === 'tourist') {
      loadActiveExecution();
    } else {
      setExecutionState(null);
      setTour(null);
      setKeyPoints([]);
    }
  }, [user]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (execution?.status === 'ACTIVE') {
      intervalRef.current = setInterval(runProximityCheck, 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [execution?.id, execution?.status]);

  async function loadActiveExecution() {
    try {
      const res = await toursClient.get('/api/executions/active');
      if (res.status === 204 || !res.data) {
        setExecutionState(null);
        setTour(null);
        setKeyPoints([]);
        return;
      }
      const exec: TourExecution = res.data;
      setExecutionState(exec);
      await loadTourData(exec.tourId);
    } catch {
      setExecutionState(null);
    }
  }

  async function loadTourData(tourId: number) {
    try {
      const [tourRes, kpRes] = await Promise.all([
        toursClient.get(`/api/tours/${tourId}`),
        toursClient.get(`/api/tours/${tourId}/keypoints`),
      ]);
      setTour(tourRes.data);
      setKeyPoints(kpRes.data);
    } catch {}
  }

  async function refreshExecution() {
    if (!execution) return;
    try {
      const res = await toursClient.get(`/api/executions/${execution.id}`);
      setExecutionState(res.data);
    } catch {}
  }

  async function runProximityCheck() {
    if (!execution) return;
    try {
      await toursClient.get('/api/tourist-position').catch(() => null);
      const res = await toursClient.post(`/api/executions/${execution.id}/check-proximity`);
      const result = res.data;
      if (result.newKeyPointCompleted) {
        setNotification(`✓ Key point reached! (${result.totalCompleted}/${result.totalKeyPoints})`);
        setTimeout(() => setNotification(''), 4000);
        const execRes = await toursClient.get(`/api/executions/${execution.id}`);
        setExecutionState(execRes.data);
      }
    } catch {}
  }

  function setExecution(e: TourExecution | null) {
    setExecutionState(e);
    if (e) loadTourData(e.tourId);
    else { setTour(null); setKeyPoints([]); }
  }

  return (
    <TourExecutionContext.Provider value={{ execution, tour, keyPoints, notification, setExecution, refreshExecution }}>
      {children}
    </TourExecutionContext.Provider>
  );
}

export function useTourExecution() {
  const ctx = useContext(TourExecutionContext);
  if (!ctx) throw new Error('useTourExecution must be used within TourExecutionProvider');
  return ctx;
}
