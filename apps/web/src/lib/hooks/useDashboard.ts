import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.get<{
      totalDevices: number;
      activeDispatched: number;
      inStock: number;
      inTesting: number;
      lowStockAlerts: number;
      warnStockAlerts: number;
      qcPassRate: number;
      qcTotal: number;
    }>('/api/dashboard/summary'),
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: () => apiClient.get<any[]>('/api/dashboard/recent-activity'),
  });
}

export function useQcStats() {
  return useQuery({
    queryKey: ['qc', 'stats'],
    queryFn: () => apiClient.get<{ total: number; passed: number; failed: number; passRate: number }>('/api/qc/stats'),
  });
}
