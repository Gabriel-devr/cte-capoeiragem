"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";

export interface PlanoPayload {
    nome_plano: string;
    tipo_plano: string;
    frequencia: number;
    preco_original: number;
    preco_desconto?: number;
}

export async function createPlano(data: PlanoPayload) {
    try {
        const supabase = await createClientServer();
        const guard = await assertAdmin(supabase);
        if (!guard.ok) return { result: "erro", details: guard.details };
        const { error } = await supabase.from('plano').insert(data);
        if (error) throw error;

        revalidatePath('/dashboard/planos');
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function listPlanos() {
    try {
        const supabase = await createClientServer();
        const { data: planos, error } = await supabase
            .from('plano')
            .select(`
                *,
                periodos (nome_periodo)
            `);

        if (error) throw error;
        return { result: "sucesso", planos };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function updatePlano(id: string, data: Partial<PlanoPayload>) {
    try {
        const supabase = await createClientServer();
        const guard = await assertAdmin(supabase);
        if (!guard.ok) return { result: "erro", details: guard.details };
        const { error } = await supabase.from('plano').update(data).eq('id_plano', id);
        if (error) throw error;

        revalidatePath('/dashboard/planos');
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function deletePlano(id: string) {
    try {
        const supabase = await createClientServer();
        const guard = await assertAdmin(supabase);
        if (!guard.ok) return { result: "erro", details: guard.details };
        const { error } = await supabase.from('plano').delete().eq('id_plano', id);
        if (error) throw error;

        revalidatePath('/dashboard/planos');
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: "Não é possível deletar um plano com alunos matriculados." };
    }
}

export async function listPeriodos() {
    try {
        const supabase = await createClientServer();
        const { data: periodos, error } = await supabase.from('periodos').select('*').order('nome_periodo');
        if (error) throw error;
        return { result: "sucesso", periodos };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}