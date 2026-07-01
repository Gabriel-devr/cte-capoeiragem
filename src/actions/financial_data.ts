"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export async function listTransactions() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data, error } = await supabase
      .from("financial_transactions")
      .select("*, student(full_name, nickname)")
      .order("due_date", { ascending: false });

    if (error) throw error;
    return { result: "sucesso", data };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function createTransaction(student_id: string, due_date: string, status: "pending" | "paid") {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    // Busca matrícula ATIVA do aluno para obter valor do plano e enrollment_id
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, plano (preco_desconto, preco_original)")
      .eq("student_id", student_id)
      .eq("status", "active")
      .limit(1)
      .single();

    const plano = enrollment?.plano as { preco_desconto: number | null; preco_original: number } | null;
    const amount = plano ? (plano.preco_desconto ?? plano.preco_original) : 0;

    const d = new Date(due_date + "T12:00:00");
    const title = `Mensalidade ${MESES[d.getMonth()]}/${d.getFullYear()}`;

    const { error } = await supabase.from("financial_transactions").insert({
      student_id,
      enrollment_id: enrollment?.id ?? null,
      title,
      amount,
      type: "income",
      due_date,
      status,
      payment_date: status === "paid" ? due_date : null,
    });

    if (error) throw error;
    revalidatePath("/dashboard/financial");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function updateTransaction(id: string, amount: number, due_date: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };
    const { error } = await supabase
      .from("financial_transactions")
      .update({ amount, due_date })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/dashboard/financial");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function marcarComoPago(id: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("financial_transactions")
      .update({ status: "paid", payment_date: today })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/dashboard/financial");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };
    const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/dashboard/financial");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}
