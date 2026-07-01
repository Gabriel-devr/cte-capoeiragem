import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garante que o usuário autenticado no client Supabase passado é admin.
 * Usado no topo das server actions administrativas para não depender só
 * da UI/menu esconder a funcionalidade de quem não é admin.
 */
export async function assertAdmin(supabase: SupabaseClient): Promise<{ ok: true } | { ok: false; details: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, details: "Usuário não autenticado." };

    const { data: profile } = await supabase
        .from("profile")
        .select("role")
        .eq("profile_id", user.id)
        .maybeSingle();

    if (profile?.role !== "admin") {
        return { ok: false, details: "Acesso restrito a administradores." };
    }

    return { ok: true };
}
