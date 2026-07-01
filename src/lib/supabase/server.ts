import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente com permissões de Admin (Service Role) - USAR APENAS NO SERVIDOR
export const supabaseAdm = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function createClientServer() {
    const cookieStore = await cookies()

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch (error) {
                        // O método setAll pode ser chamado em Server Components onde cookies não podem ser definidos
                        // O Middleware cuida da persistência nesses casos
                    }
                },
            },
        }
    )
}
