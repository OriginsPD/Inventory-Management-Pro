import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { Device, DeviceModel, Customer, DeviceRelationship } from '../types/domain';

export const useDevices = (params: Record<string, string> = {}) => {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => {
      const searchParams = new URLSearchParams(params);
      return apiClient.get<Device[]>(`/api/devices?${searchParams.toString()}`);
    },
  });
};

export const useModels = () => {
  return useQuery({
    queryKey: ['device-models'],
    queryFn: () => apiClient.get<DeviceModel[]>('/api/device-models'),
  });
};

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => apiClient.get<Customer[]>('/api/customers'),
  });
};

export const useRelationships = () => {
  return useQuery({
    queryKey: ['device-links'],
    queryFn: () => apiClient.get<DeviceRelationship[]>('/api/device-links'),
  });
};
