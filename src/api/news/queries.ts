import { News } from '../../../utils/supabase/types';
import { useQuery } from '@tanstack/react-query';

// Create Supabase client
const getSupabaseClient = () => createBrowserClient();

// Fetch all news articles
export const fetchAllNews = async (): Promise<News[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data as News[];
};

// Fetch a single news article by ID
export const fetchNewsById = async (id: string): Promise<News> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as News;
};

// Fetch featured news articles
export const fetchFeaturedNews = async (): Promise<News[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('is_featured', true)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data as News[];
};

// Fetch news articles by category
export const fetchNewsByCategory = async (category: string): Promise<News[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('category', category)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return data as News[];
};

// React Query hooks
export const useAllNews = () => {
  return useQuery({ 
    queryKey: ['news'], 
    queryFn: fetchAllNews 
  });
};

export const useNewsById = (id: string) => {
  return useQuery({ 
    queryKey: ['news', id], 
    queryFn: () => fetchNewsById(id),
    enabled: !!id 
  });
};

export const useFeaturedNews = () => {
  return useQuery({ 
    queryKey: ['news', 'featured'], 
    queryFn: fetchFeaturedNews 
  });
};

export const useNewsByCategory = (category: string) => {
  return useQuery({ 
    queryKey: ['news', 'category', category], 
    queryFn: () => fetchNewsByCategory(category),
    enabled: !!category 
  });
}; 