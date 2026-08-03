import { NextResponse } from "next/server";
import { supabaseAdm } from "@/lib/supabase/server";
import { verifyMetaSignature } from "@/lib/whatsapp/security";
import { findOrCreateConversation } from "@/lib/whatsapp/conversations";
import { downloadAndStoreMedia } from "@/lib/whatsapp/media";

// Substitui o "WhatsApp Trigger" do n8n - é a Meta quem chama essa rota diretamente,
// então é o único ponto da integração que precisa ser uma URL pública de verdade.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MEDIA_TYPES = ["image", "audio", "document"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

function isMediaType(type: string): type is MediaType {
  return (MEDIA_TYPES as readonly string[]).includes(type);
}

// Verificação do webhook (handshake inicial exigido pela Meta ao salvar a Callback URL).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Sem isso, essa rota seria um endpoint público que qualquer um poderia usar pra
  // injetar linhas em whatsapp_messages/whatsapp_conversations ou forjar falha de
  // cobrança. Precisa validar sobre o corpo cru, antes do JSON.parse.
  if (!appSecret || !verifyMetaSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload malformado" }, { status: 400 });
  }

  try {
    const value = payload?.entry?.[0]?.changes?.[0]?.value;

    if (value?.statuses?.length) {
      await handleStatusUpdate(value.statuses[0]);
    }

    if (value?.messages?.length) {
      await handleInboundMessage(value.messages[0], value.contacts?.[0]);
    }
  } catch (err) {
    // Erro interno não deve virar 5xx pra Meta - ela reentrega em retry/backoff e,
    // depois de falhas repetidas, pode acabar desativando a subscription. Só payload
    // malformado ou assinatura inválida retornam status != 200.
    console.error("Erro ao processar webhook do WhatsApp:", err);
  }

  return NextResponse.json({ received: true });
}

async function handleStatusUpdate(status: { id: string; status: string }) {
  if (status.status !== "failed") return;

  await supabaseAdm
    .from("whatsapp_cobrancas_agendadas")
    .update({ status: "failed" })
    .eq("whatsapp_message_id", status.id);
}

async function handleInboundMessage(
  message: any,
  contact: { profile?: { name?: string } } | undefined
) {
  // Dedup: a Meta reentrega o mesmo evento às vezes: sem essa checagem a mesma
  // mensagem viraria mais de uma linha.
  const { data: existing } = await supabaseAdm
    .from("whatsapp_messages")
    .select("id")
    .eq("whatsapp_message_id", message.id)
    .maybeSingle();

  if (existing) return;

  const waId: string = message.from;
  const waTimestamp = new Date(Number(message.timestamp) * 1000).toISOString();

  const { data: student } = await supabaseAdm
    .from("student")
    .select("student_id")
    .eq("whatsapp_id", waId)
    .maybeSingle();

  const studentId = student?.student_id ?? null;

  const conversationId = await findOrCreateConversation(supabaseAdm, {
    waId,
    studentId,
    displayName: contact?.profile?.name ?? null,
  });

  // last_customer_message_at é o que alimenta a checagem da janela de 24h em sendReply
  // (whatsapp_messages_data.ts) - crítico atualizar em toda mensagem recebida.
  const conversationUpdate: Record<string, unknown> = {
    last_message_at: waTimestamp,
    last_customer_message_at: waTimestamp,
  };
  if (studentId) conversationUpdate.student_id = studentId;

  await supabaseAdm.from("whatsapp_conversations").update(conversationUpdate).eq("id", conversationId);

  const baseRow = {
    conversation_id: conversationId,
    direction: "in",
    whatsapp_message_id: message.id,
    status: "received",
    wa_timestamp: waTimestamp,
  };

  if (isMediaType(message.type)) {
    const mediaPayload = message[message.type];
    try {
      const { mediaPath, mimeType } = await downloadAndStoreMedia(mediaPayload.id, message.id);
      await supabaseAdm.from("whatsapp_messages").insert({
        ...baseRow,
        content: mediaPayload.caption ?? "",
        message_type: message.type,
        media_path: mediaPath,
        mime_type: mimeType,
        media_filename: mediaPayload.filename ?? null,
      });
    } catch (err) {
      // Melhoria em relação ao n8n: falha ao baixar/subir a mídia não pode fazer a
      // mensagem do cliente sumir - grava sem mídia em vez de perder o registro inteiro.
      console.error("Falha ao baixar mídia do WhatsApp:", err);
      await supabaseAdm.from("whatsapp_messages").insert({
        ...baseRow,
        content: mediaPayload?.caption ?? "",
        message_type: message.type,
      });
    }
    return;
  }

  // Tipos não cobertos aqui (vídeo, figurinha, localização etc) caem neste branch de
  // texto sem tratamento específico - mesmo comportamento (fora de escopo) do fluxo
  // anterior no n8n.
  await supabaseAdm.from("whatsapp_messages").insert({
    ...baseRow,
    content: message.text?.body ?? "",
    message_type: "text",
  });
}
