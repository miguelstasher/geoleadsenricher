import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Legacy client for backward compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Modern SSR client for authentication
export const createSupabaseClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey)