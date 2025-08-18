import useSWR from 'swr';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

async function fetchAdmins(): Promise<AdminUser[]> {
  const res = await fetch('/api/admins');
  if (!res.ok) throw new Error('Failed to fetch admins');
  return (await res.json()) as AdminUser[];
}

export function useAdmins(initialData?: AdminUser[]) {
  return useSWR<AdminUser[]>(
    '/api/admins',
    fetchAdmins,
    initialData
      ? { fallbackData: initialData, revalidateOnFocus: true }
      : { revalidateOnFocus: true }
  );
}
