"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";

export interface MatriculaPayload {
  student_id:   string;
  plano_id:     string;
  start_date:   string;
  end_date?:    string;
  status?:      "active" | "paused" | "cancelled";
  observacoes?: string;
  produto_ids?: string[];
  taxa_matricula?: boolean;
}

export async function createMatricula(data: MatriculaPayload) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const statusToSave = data.status ?? "active";

    if (statusToSave === "active") {
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", data.student_id)
        .or("status.eq.active,status.is.null")
        .maybeSingle();

      if (existing) {
        return { result: "erro", details: "Aluno já possui uma matrícula ativa." };
      }
    }

    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .insert({
        student_id:  data.student_id,
        plano_id:    data.plano_id,
        start_date:  data.start_date,
        end_date:    data.end_date || null,
        status:      data.status ?? "active",
        observacoes: data.observacoes || null,
        taxa_matricula: data.taxa_matricula ?? true,
      })
      .select("id")
      .single();

    if (error || !enrollment) throw error;

    if (data.produto_ids && data.produto_ids.length > 0) {
      const { error: prodError } = await supabase
        .from("enrollment_products")
        .insert(data.produto_ids.map((produto_id) => ({
          enrollment_id: enrollment.id,
          produto_id,
          quantity: 1,
        })));
      if (prodError) throw prodError;
    }

    revalidatePath("/dashboard/matriculas");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function listMatriculas() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };
    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        *,
        student (student_id, full_name, nickname),
        plano (id_plano, nome_plano, preco_original, preco_desconto, periodos (nome_periodo)),
        enrollment_products (id, produto_id, quantity, produtos (nome_produto))
      `)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return { result: "sucesso", matriculas: data };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function updateMatricula(id: string, data: Partial<MatriculaPayload>) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase
      .from("enrollments")
      .update({
        plano_id:    data.plano_id,
        start_date:  data.start_date,
        end_date:    data.end_date || null,
        status:      data.status,
        observacoes: data.observacoes || null,
        taxa_matricula: data.taxa_matricula,
      })
      .eq("id", id);

    if (error) throw error;

    // Só re-sincroniza produtos se a chamada informar produto_ids explicitamente
    // (a tela de Matrículas não gerencia mais produtos avulsos).
    if (data.produto_ids !== undefined) {
      await supabase.from("enrollment_products").delete().eq("enrollment_id", id);

      if (data.produto_ids.length > 0) {
        const { error: prodError } = await supabase
          .from("enrollment_products")
          .insert(data.produto_ids.map((produto_id) => ({
            enrollment_id: id,
            produto_id,
            quantity: 1,
          })));
        if (prodError) throw prodError;
      }
    }

    revalidatePath("/dashboard/matriculas");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function cancelarMatricula(id: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase.from("enrollments").update({ status: 'cancelled' }).eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/matriculas");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}
