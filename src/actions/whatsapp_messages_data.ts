"use server"

import { createClientServer, supabaseAdm } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authGuard";
import { buildWaId } from "@/utils/formatters";

const JANELA_24H_MS = 24 * 60 * 60 * 1000;

type SupabaseServerClient = Awaited<ReturnType<typeof createClientServer>>;

export interface ConversationListItem {
  id: string;
  student_id: string | null;
  wa_id: string;
  display_name: string | null;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  created_at: string;
  student_name: string | null;
  window_open: boolean;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  direction: "in" | "out";
  content: string;
  whatsapp_message_id: string | null;
  status: string;
  wa_timestamp: string;
  created_at: string;
  message_type: "text" | "image" | "audio" | "document";
  media_path: string | null;
  media_url: string | null;
  mime_type: string | null;
  media_filename: string | null;
}

const MESSAGE_COLUMNS =
  "id, conversation_id, direction, content, whatsapp_message_id, status, wa_timestamp, created_at, message_type, media_path, mime_type, media_filename";

// Signed URL de curta duração pro bucket privado whatsapp-media - o path
// sozinho não abre o arquivo (bucket não é público), só serve como referência
// pra gerar essa URL sob demanda quando a tela de Mensagens carrega.
const MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 60;

async function comMediaUrl(mensagens: MessageItem[]): Promise<MessageItem[]> {
  return Promise.all(
    mensagens.map(async (m) => {
      if (!m.media_path) return { ...m, media_url: null };
      const { data, error } = await supabaseAdm.storage
        .from("whatsapp-media")
        .createSignedUrl(m.media_path, MEDIA_SIGNED_URL_TTL_SECONDS);
      return { ...m, media_url: error ? null : data.signedUrl };
    })
  );
}

export async function listConversations() {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data: conversations, error } = await supabase
      .from("whatsapp_conversations")
      .select("id, student_id, wa_id, display_name, last_message_at, last_customer_message_at, created_at")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;

    // Busca os alunos vinculados numa segunda query (em vez de select embed
    // via FK) pra não depender de uma foreign key declarada entre
    // whatsapp_conversations.student_id e student.student_id.
    const studentIds = Array.from(
      new Set((conversations || []).map((c) => c.student_id).filter((id): id is string => !!id))
    );

    const studentsById = new Map<string, { full_name: string; nickname: string | null }>();
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from("student")
        .select("student_id, full_name, nickname")
        .in("student_id", studentIds);
      if (studentsError) throw studentsError;
      for (const s of students || []) {
        studentsById.set(s.student_id, { full_name: s.full_name, nickname: s.nickname });
      }
    }

    const now = Date.now();
    const result: ConversationListItem[] = (conversations || []).map((c) => {
      const student = c.student_id ? studentsById.get(c.student_id) : undefined;
      return {
        ...c,
        student_name: student ? student.nickname || student.full_name : null,
        window_open: !!c.last_customer_message_at && now - new Date(c.last_customer_message_at).getTime() < JANELA_24H_MS,
      };
    });

    return { result: "sucesso", conversations: result };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

export async function listMessages(conversation_id: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversation_id)
      .order("wa_timestamp", { ascending: true });

    if (error) throw error;
    const messages = await comMediaUrl((data || []) as MessageItem[]);
    return { result: "sucesso", messages };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

// Grava a resposta como "pending" e aciona o webhook do n8n responsável pelo
// envio de verdade via Graph API - mesmo padrão do enviarCobrancas em
// whatsapp_data.ts (o app nunca fala direto com a Graph API, só delega pro
// n8n). Enquanto esse workflow de envio não existir, a mensagem continua
// sendo salva normalmente; só o disparo automático fica pendente.
export async function sendReply(conversation_id: string, wa_id: string, content: string) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return { result: "erro", details: guard.details };

    const texto = content.trim();
    if (!texto) return { result: "erro", details: "Mensagem vazia." };

    const { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("last_customer_message_at")
      .eq("id", conversation_id)
      .single();

    if (convError) throw convError;

    const windowOpen =
      !!conversation.last_customer_message_at &&
      Date.now() - new Date(conversation.last_customer_message_at).getTime() < JANELA_24H_MS;

    if (!windowOpen) {
      return {
        result: "erro",
        details: "Janela de 24h fechada - não é possível responder com mensagem livre. É preciso usar um template aprovado.",
      };
    }

    const agora = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id,
        direction: "out",
        content: texto,
        status: "pending",
        wa_timestamp: agora,
      })
      .select(MESSAGE_COLUMNS)
      .single();

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("whatsapp_conversations")
      .update({ last_message_at: agora })
      .eq("id", conversation_id);

    if (updateError) throw updateError;

    revalidatePath("/dashboard/mensagens");

    const webhookUrl = process.env.WHATSAPP_N8N_REPLY_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("WHATSAPP_N8N_REPLY_WEBHOOK_URL não configurada no .env");
      return {
        result: "sucesso",
        message: inserted as MessageItem,
        aviso: "Mensagem salva, mas o envio automático ainda não está configurado. Contate o suporte técnico.",
      };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: inserted.id, wa_id, content: texto }),
      });
      if (!response.ok) {
        return {
          result: "sucesso",
          message: inserted as MessageItem,
          aviso: `Mensagem salva, mas o webhook do n8n retornou status ${response.status}.`,
        };
      }
    } catch (webhookErr: any) {
      return {
        result: "sucesso",
        message: inserted as MessageItem,
        aviso: `Mensagem salva, mas não foi possível acionar o envio automático: ${webhookErr.message}`,
      };
    }

    return { result: "sucesso", message: inserted as MessageItem };
  } catch (err: any) {
    return { result: "erro", details: err.message };
  }
}

async function findOrCreateConversationForStudent(
  supabase: SupabaseServerClient,
  params: { student_id: string; telephone: string | null; display_name: string }
): Promise<string | null> {
  const waId = buildWaId(params.telephone);
  if (!waId) return null;

  // .limit(1) em vez de .maybeSingle(): se ainda houver conversas duplicadas
  // pro mesmo wa_id (lixo de antes do fix do workflow n8n de recebimento),
  // .maybeSingle() lançaria erro por encontrar mais de uma linha - e como
  // essa função é best-effort, esse erro seria engolido silenciosamente,
  // fazendo a cobrança nunca aparecer no histórico sem explicação nenhuma.
  const { data: matches, error: findError } = await supabase
    .from("whatsapp_conversations")
    .select("id, student_id")
    .eq("wa_id", waId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (findError) throw findError;
  const existing = matches?.[0];

  if (existing) {
    // Conversa já existia (ex: aluno já tinha mandado mensagem antes de ser
    // cadastrado) mas ainda sem student_id - aproveita e vincula agora.
    if (!existing.student_id) {
      await supabase.from("whatsapp_conversations").update({ student_id: params.student_id }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from("whatsapp_conversations")
    .insert({
      student_id: params.student_id,
      wa_id: waId,
      display_name: params.display_name,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id;
}

// Espelha no histórico unificado (whatsapp_messages) uma cobrança disparada
// pela régua automática de whatsapp_data.ts, pra ela aparecer junto com o
// resto da conversa do aluno na tela de Mensagens. Best-effort: se falhar
// (ex: telefone inválido, RLS ainda não configurado), não deve travar o
// envio da cobrança em si - que já ficou registrado em
// whatsapp_cobrancas_agendadas independente disso. Fica como "pending" até
// que o workflow n8n que efetivamente envia a cobrança também atualize esse
// status (ainda não faz isso hoje).
export async function logOutboundCobranca(params: {
  student_id: string;
  telephone: string | null;
  display_name: string;
  content: string;
}) {
  try {
    const supabase = await createClientServer();
    const guard = await assertAdmin(supabase);
    if (!guard.ok) return;

    const conversationId = await findOrCreateConversationForStudent(supabase, params);
    if (!conversationId) return;

    const agora = new Date().toISOString();

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      direction: "out",
      content: params.content,
      status: "pending",
      wa_timestamp: agora,
    });

    await supabase.from("whatsapp_conversations").update({ last_message_at: agora }).eq("id", conversationId);
  } catch (err) {
    console.error("Falha ao espelhar cobrança em whatsapp_messages:", err);
  }
}
