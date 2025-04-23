import type { Database } from './types';

// Extract useful types for use in the API
export type TableRow<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type TableInsert<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type TableUpdate<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

// Specific table types
export type Profile = TableRow<'profiles'>;
export type ProfileInsert = TableInsert<'profiles'>;
export type ProfileUpdate = TableUpdate<'profiles'>; 