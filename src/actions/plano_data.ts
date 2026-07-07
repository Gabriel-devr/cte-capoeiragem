"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";
import { createProduto, updateProduto, deleteProduto } from "./produto_data";

export interface PlanoPayload {
    nome_plano: string;
    tipo_plano: string;
    frequencia: number;
    preco_original: number;
    preco_desconto?: number;
    tipo_produto?: string;
    descricao_produto?: string;
}

export async function createPlano(data: PlanoPayload) {
    try {
        const supabase = await createClientServer();
        const guard = await assertAdmin(supabase);
        if (!guard.ok) return { result: "erro", details: guard.details };

        const { nome_plano, tipo_plano, frequencia, preco_original, preco_desconto, tipo_produto, descricao_produto } = data;

        const produtoRes = await createProduto({
            nome_produto: nome_plano,
            tipo_produto: tipo_produto || "",
            descricao_produto,
        });
        if (produtoRes.result !== "sucesso" || !produtoRes.id_produto) {
            return { result: "erro", details: produtoRes.details || "Falha ao criar o produto vinculado ao plano." };
        }

        const { error } = await supabase.from('plano').insert({
            nome_plano,
            tipo_plano,
            frequencia,
            preco_original,
            preco_desconto,
            produto_id: produtoRes.id_produto,
        });

        if (error) {
            await deleteProduto(produtoRes.id_produto);
            throw error;
        }

        revalidatePath('/dashboard/plans');
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
                periodos (nome_periodo),
                produtos (tipo_produto, descricao_produto)
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

        const { tipo_produto, descricao_produto, ...planoFields } = data;

        const { data: existing, error: fetchError } = await supabase
            .from('plano')
            .select('produto_id')
            .eq('id_plano', id)
            .single();
        if (fetchError) throw fetchError;

        if (existing?.produto_id) {
            const produtoUpdate: { nome_produto?: string; tipo_produto?: string; descricao_produto?: string } = {};
            if (planoFields.nome_plano !== undefined) produtoUpdate.nome_produto = planoFields.nome_plano;
            if (tipo_produto !== undefined) produtoUpdate.tipo_produto = tipo_produto;
            if (descricao_produto !== undefined) produtoUpdate.descricao_produto = descricao_produto;

            if (Object.keys(produtoUpdate).length > 0) {
                const produtoRes = await updateProduto(existing.produto_id, produtoUpdate);
                if (produtoRes.result !== "sucesso") throw new Error(produtoRes.details);
            }
        }

        const { error } = await supabase.from('plano').update(planoFields).eq('id_plano', id);
        if (error) throw error;

        revalidatePath('/dashboard/plans');
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

        const { data: existing, error: fetchError } = await supabase
            .from('plano')
            .select('produto_id')
            .eq('id_plano', id)
            .single();
        if (fetchError) throw fetchError;

        const { error } = await supabase.from('plano').delete().eq('id_plano', id);
        if (error) throw error;

        if (existing?.produto_id) {
            await deleteProduto(existing.produto_id);
        }

        revalidatePath('/dashboard/plans');
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
