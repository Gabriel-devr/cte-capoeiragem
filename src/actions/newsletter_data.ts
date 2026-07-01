"use server"

import { createClientServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";

export async function createNewsletter(data: any) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data: newsletter, error } = await supabase
      .from('newsletters')
      .insert({
        ...data,
        date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/newsletter');
    return { result: "sucesso", data: newsletter };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function listNewsletters() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    // Admin vê todas as newsletters, sem filtro
    const { data: newsletters, error } = await supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { result: "sucesso", data: newsletters };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function updateNewsletter(id: string | number, data: any) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data: newsletter, error } = await supabase
      .from('newsletters')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/newsletter');
    return { result: "sucesso", data: newsletter };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function deleteNewsletter(id: string | number) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { error } = await supabase
      .from('newsletters')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/dashboard/newsletter');
    return { result: "sucesso" };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}
