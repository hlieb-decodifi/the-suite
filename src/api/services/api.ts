import type { ServiceUI } from './types';
import type { ServiceFormValues } from '@/components/forms/ServiceForm';

export async function getServices(userId: string): Promise<ServiceUI[]> {
  const response = await fetch(`/api/services/${userId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch services');
  }
  const data = await response.json();
  return data;
}

export async function upsertService(
  userId: string, 
  data: ServiceFormValues & { id?: string }
): Promise<ServiceUI> {
  const response = await fetch(`/api/services/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save service');
  }
  
  return response.json();
}

export async function deleteService(userId: string, serviceId: string): Promise<void> {
  const response = await fetch(`/api/services/${userId}/${serviceId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete service');
  }
} 