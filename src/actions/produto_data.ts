"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";

export interface ProdutoPayload {
    nome_produto: string;
    tipo_produto: string;
    descricao_produto?: string;
}

export async function createProduto(data: ProdutoPayload) {
    try {
        const supabase = await createClientServer();
        const guard = await assertAdmin(supabase);
        if (!guard.ok) return { result: "erro", details: guard.details };
        const { data: produto, error } = await supabase.from('produtos').insert(data).select('id_produto').single();
        if (error) throw error;

        revalidatePath('/dashboard/plans');
        return { result: "sucesso", id_produto: produto.id_produto as string };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function listProdutos() {
    try {
        const supabase = await createClientServer();
        const { data: produtos, error } = await supabase.from('produtos').select('*');
        if (error) throw error;

        return { result: "sucesso", produtos };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function updateProduto(id: string, data: Partial<ProdutoPayload>) {
    try {
        const supabase = await createClientServer();
        const guard = await assertAdmin(supabase);
        if (!guard.ok) return { result: "erro", details: guard.details };
        const { error } = await supabase.from('produtos').update(data).eq('id_produto', id);
        if (error) throw error;

        revalidatePath('/dashboard/plans');
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function deleteProduto(id: string) {
    try {
        const supabase = await createClientServer();
        const guard = await assertAdmin(supabase);
        if (!guard.ok) return { result: "erro", details: guard.details };
        const { error } = await supabase.from('produtos').delete().eq('id_produto', id);
        if (error) throw error;

        revalidatePath('/dashboard/plans');
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}