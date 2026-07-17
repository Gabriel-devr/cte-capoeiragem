"use server"

import { createClientServer, supabaseAdm } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";
import { randomUUID } from "crypto";

export async function uploadNewsletterImage(formData: FormData) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const file = formData.get("file") as File | null;
    if (!file) return { result: "erro", details: "Nenhum arquivo enviado" };

    const ext = file.name.split(".").pop();
    const path = `${randomUUID()}${ext ? `.${ext}` : ""}`;

    const { error: uploadError } = await supabaseAdm.storage
      .from("newsletter-images")
      .upload(path, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabaseAdm.storage.from("newsletter-images").getPublicUrl(path);

    return { result: "sucesso", url: data.publicUrl };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

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
      .select(`
        *,
        target_plano:plano!target_plano_id (nome_plano),
        target_student:student!target_student_id (full_name, nickname)
      `)
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
