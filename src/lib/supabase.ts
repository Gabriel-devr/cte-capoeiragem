import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente padrão para uso no Browser (Client Components)
// Usando createBrowserClient para sincronizar automaticamente com os Cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
