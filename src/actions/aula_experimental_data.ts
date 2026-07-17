"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";
import type { AulaAvulsaPayload } from "@/utils/aulaAvulsaSchema";

export async function createAulaExperimental(payload: AulaAvulsaPayload) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase.from("aulas_experimentais").insert(payload);
    if (error) throw error;

    revalidatePath("/dashboard/students");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function listAulasExperimentais() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data, error } = await supabase
      .from("aulas_experimentais")
      .select("*")
      .order("data", { ascending: false });

    if (error) throw error;
    return { result: "sucesso", data };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function updateAulaExperimental(id: string, payload: AulaAvulsaPayload) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase.from("aulas_experimentais").update(payload).eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/students");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function deleteAulaExperimental(id: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase.from("aulas_experimentais").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/students");
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}
