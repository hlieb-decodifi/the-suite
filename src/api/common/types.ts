import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import type { 
  Profile, 
  ProfileInsert, 
  ProfileUpdate, 
  TableRow, 
  TableInsert, 
  TableUpdate 
} from '@/lib/supabase/database.types'

export type TypedSupabaseClient = SupabaseClient<Database>

/**
 * Generic paginated response
 */
export type PaginatedResponse<T> = {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Re-export the useful types
export type { 
  Profile, 
  ProfileInsert, 
  ProfileUpdate, 
  TableRow, 
  TableInsert, 
  TableUpdate 
}