import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { Device, DeviceModel, AuditLog, DeviceRelationship } from '../../../lib/types/domain';

type BulkDevicePayload = Partial<Device>;

export const useInventory = (filters: { search?: string; status?: string; modelId?: string } = {}) => {
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({
    queryKey: ['devices', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.modelId) params.append('modelId', filters.modelId);
      return apiClient.get<Device[]>(`/api/devices?${params.toString()}`);
    },
  });

  const modelsQuery = useQuery({
    queryKey: ['device-models'],
    queryFn: () => apiClient.get<DeviceModel[]>('/api/device-models'),
  });

  const relationshipsQuery = useQuery({
    queryKey: ['device-links'],
    queryFn: () => apiClient.get<DeviceRelationship[]>('/api/device-links'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/devices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => apiClient.post('/api/devices/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (devices: BulkDevicePayload[]) => apiClient.post('/api/devices/bulk', { devices }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  return {
    devices: devicesQuery.data || [],
    isLoadingDevices: devicesQuery.isLoading,
    devicesError: devicesQuery.error,
    isDevicesError: devicesQuery.isError,
    models: modelsQuery.data || [],
    isLoadingModels: modelsQuery.isLoading,
    modelsError: modelsQuery.error,
    isModelsError: modelsQuery.isError,
    relationships: relationshipsQuery.data || [],
    relationshipsError: relationshipsQuery.error,
    isRelationshipsError: relationshipsQuery.isError,
    hasInventoryError: devicesQuery.isError || modelsQuery.isError || relationshipsQuery.isError,
    deleteDevice: deleteMutation.mutateAsync,
    bulkDeleteDevices: bulkDeleteMutation.mutateAsync,
    syncDevices: syncMutation.mutateAsync,
    refetchDevices: devicesQuery.refetch,
    refetchModels: modelsQuery.refetch,
    refetchRelationships: relationshipsQuery.refetch,
  };
};

export const useDeviceAuditLogs = (deviceId?: string) => {
  return useQuery({
    queryKey: ['device-audit-logs', deviceId],
    queryFn: () => apiClient.get<AuditLog[]>(`/api/devices/${deviceId}/audit-logs`),
    enabled: !!deviceId,
  });
};
