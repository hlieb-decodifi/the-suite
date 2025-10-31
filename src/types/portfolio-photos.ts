import { Database } from '@/../supabase/types';

// Database row type from Supabase schema
export type PortfolioPhotoDB =
  Database['public']['Tables']['portfolio_photos']['Row'];

// UI representation type
export type PortfolioPhotoUI = {
  id: string;
  url: string;
  description: string | null;
  orderIndex: number;
};

// API parameter types
export type PortfolioPhotosParams = {
  userId: string;
};

// Upload parameters
export type UploadPortfolioPhotoParams = {
  userId: string;
  formData: FormData;
  description?: string;
  orderIndex?: number;
};

// Response types
export type PortfolioPhotosResponse = {
  success: boolean;
  photos?: PortfolioPhotoUI[];
  error?: string;
};

export type PortfolioPhotoResponse = {
  success: boolean;
  photo?: PortfolioPhotoUI;
  error?: string;
};
