
"use server";
import { updateProfessionalMaxServices } from '@/lib/admin/updateProfessionalMaxServices';
import { fetchProfessionalDetails } from '@/lib/admin/fetchProfessionalDetails';

export async function updateProfessionalMaxServicesAction(userId: string, maxServices: number) {
  if (!userId) return { success: false, error: 'Missing userId' };
  if (typeof maxServices !== 'number' || maxServices < 1) {
    return { success: false, error: 'Invalid maxServices' };
  }
  const result = await updateProfessionalMaxServices(userId, maxServices);
  if (!result.success) {
    return { success: false, error: result.error || 'Update failed' };
  }
  return { success: true };
}

export async function getProfessionalDetailsAction(userId: string) {
  if (!userId) return { error: 'Missing userId' };
  try {
    const details = await fetchProfessionalDetails(userId);
    if (!details) return { error: 'Not found' };
    return { data: details };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
