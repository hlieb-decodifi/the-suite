import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Address } from './types';

async function getProfessionalProfileWithAddress(userId: string): Promise<{ address: Address | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('address_id')
    .eq('user_id', userId)
    .single();
  if (error || !data?.address_id) return { address: null };
  const { data: address, error: addrError } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', data.address_id)
    .single();
  if (addrError) return { address: null };
  return { address };
}

export function useProfessionalProfileWithAddress(userId: string | undefined) {
  return useQuery({
    queryKey: ['professionalProfileWithAddress', userId],
    queryFn: () => getProfessionalProfileWithAddress(userId!),
    enabled: !!userId,
  });
}
