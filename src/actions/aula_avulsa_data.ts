"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";
import type { AulaAvulsaPayload } from "@/utils/aulaAvulsaSchema";

export async function createAulaAvulsa(payload: AulaAvulsaPayload) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase.from("aulas_avulsas").insert(payload);
    if (error) throw error;

    revalidatePath("/dashboard/students");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function listAulasAvulsas() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data, error } = await supabase
      .from("aulas_avulsas")
      .select("*")
      .order("data", { ascending: false });

    if (error) throw error;
    return { result: "sucesso", data };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function updateAulaAvulsa(id: string, payload: AulaAvulsaPayload) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase.from("aulas_avulsas").update(payload).eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/students");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function deleteAulaAvulsa(id: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase.from("aulas_avulsas").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/students");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}
