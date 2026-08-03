import type { SupabaseClient } from "@supabase/supabase-js";

interface FindOrCreateConversationParams {
  waId: string;
  studentId: string | null;
  displayName: string | null;
}

// Find-or-create de whatsapp_conversations por wa_id, compartilhado entre a rota de
// webhook inbound (recebe mensagem de aluno já cadastrado ou não) e o espelho de
// cobrança em whatsapp_messages_data.ts (logOutboundCobranca) - antes cada um tinha sua
// própria cópia dessa lógica, com risco de divergir com o tempo.
export async function findOrCreateConversation(
  supabase: SupabaseClient<any, any, any>,
  params: FindOrCreateConversationParams
): Promise<string> {
  const { waId, studentId, displayName } = params;

  // .limit(1) em vez de .maybeSingle(): se ainda houver conversas duplicadas pro mesmo
  // wa_id (lixo de antes do fix do fluxo de recebimento), .maybeSingle() lançaria erro
  // por encontrar mais de uma linha.
  const { data: matches, error: findError } = await supabase
    .from("whatsapp_conversations")
    .select("id, student_id")
    .eq("wa_id", waId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (findError) throw findError;
  const existing = matches?.[0];

  if (existing) {
    // Conversa já existia (ex: aluno já tinha mandado mensagem antes de ser cadastrado)
    // mas ainda sem student_id - aproveita e vincula agora. Não sobrescreve um
    // student_id já preenchido.
    if (studentId && !existing.student_id) {
      await supabase.from("whatsapp_conversations").update({ student_id: studentId }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from("whatsapp_conversations")
    .insert({
      student_id: studentId,
      wa_id: waId,
      display_name: displayName,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id;
}
