import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente padrão para uso no Browser (Client Components)
// Usando createBrowserClient para sincronizar automaticamente com os Cookies
// Nome de cookie próprio pra não colidir com o app do Usuário quando ambos
// rodam em localhost (cookies não são isolados por porta, só por domínio).
export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: { name: "sb-admin-auth" },
})
